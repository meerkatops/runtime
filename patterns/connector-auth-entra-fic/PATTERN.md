---
id: connector-auth-entra-fic
title: One-click Microsoft 365 connection with no secrets (federated identity credential)
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector, platform-errors]
provides: [Connection]
requires: [WorkloadIdentity, ConsentStore, KeyStore]
environment:
  language: []
  runs: cloud
  cloud_services: [Microsoft Entra ID multi-tenant app with a federated identity credential, Microsoft Graph, a cloud workload with its own OIDC identity (Google Cloud proven; AWS and Kubernetes not proven)]
  local_needs: []
---

# Federated organization authorization

## Problem

Long-lived application secrets create an organization-wide exposure and rotation burden. Replacing them with federation helps, but an authorization callback can still bind the wrong organization to a platform tenant.

## Use when / Do not use when

Use when an organization grants a hosted connector application access and the workload has a trusted federated identity. Do not use when that identity cannot be verified; use an authorized personal connection instead.

## Environment

A federated workload, a registered application, exact registered return destinations, a consent store, and a platform identity service that verifies credentials, membership, revocation, and administrative authority.

## Solution

The application trusts the workload's identity rather than a stored application secret or certificate. An organization administrator grants only the required read access. Runtime exchanges use the verified organization's authority and cache short-lived tokens separately for each organization and principal.

Connection setup has two independent proofs: the person controls the selected platform tenant and holds the required administrative authority in the external organization; the application can exercise the intended grant. Bind both proofs to the same short-lived, single-use browser session. Store the relationship only when both succeed.

The consent record holds the platform tenant, external organization, authorizing person, approved scope, connection state, and authorization time. Personal refresh credentials are encrypted separately with tenant and principal binding.

## Ports

- **Connection:** Establishes, supplies, and revokes organization-bound authorization.
- **WorkloadIdentity:** Supplies a verifiable short-lived workload assertion.
- **ConsentStore:** Keeps the approved organization relationship and its revocation.
- **KeyStore:** Encrypts personal credentials within their tenant boundary.

## Rules

1. **Authenticate the person independently of the consent callback,** because the returned organization is not evidence of caller authority. Verify the person's organization and current administrative power, then match the session, external organization, and platform tenant. [Consent warning](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent).
2. **Require platform membership and connection-management authority,** because external administrators do not automatically administer a platform tenant. Establish the first platform administrator through a trusted bootstrap; ordinary members cannot promote themselves.
3. **Expire and consume setup sessions once, with atomic connection creation,** because replay or concurrent callbacks must not establish another relationship. Rebinding an organization requires explicit authorization.
4. **Test application access separately,** because consent and usable resource access are different conditions. An application organization read needs Organization.Read.All; it confirms application reachability, never the person's authority. [Organization access](https://learn.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0).
5. **Match issuer, workload subject, and audience exactly and case-sensitively,** because a mismatch rejects exchange. Request api://AzureADTokenExchange as the Entra audience. Each application or managed identity accepts at most 20 federated credentials. Google service-account ID tokens identify the subject by numeric unique identity, not email. Retry propagation failures within a bound. [Federation considerations](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-considerations).
6. **Use selected-resource grants by default and isolate broad access,** because an organization-wide permission defeats a selected-resource boundary. Sites.Selected needs consent plus a per-site grant; granting site access requires Sites.FullControl.All. Keep grant authority outside runtime. Mail attachments need Mail.Read, calendar attachments need Calendars.Read, and application user enumeration needs User.Read.All; enable only selected sources. [Attachment permissions](https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0), [user enumeration](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0). [Selected permissions](https://learn.microsoft.com/en-us/graph/permissions-selected-overview).
7. **Choose the personal client type deliberately and protect rotated refresh tokens,** because SPA refresh tokens default to 24 hours, while other ordinary scenarios default to 90 days. Using a token does not revoke the old one: securely replace it. Encrypt with tenant-bound context and keep credentials out of diagnostics. [Lifetimes](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens).
8. **Check revocation before token use and during sync,** because cached credentials can outlive the local connection decision. Retain indexed items on disconnect.
9. **Prepare publisher verification before relying on external user consent,** because risk-based step-up can block unverified multitenant apps. Verification needs a verified Microsoft AI Cloud Partner Program account and matching publisher-domain evidence; a badge proves neither caller authority nor security certification. [Requirements](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview).

## Conformance

1. Given valid application access but no verified administrator authority, setup stores nothing.
2. Given a different organization, platform tenant, expired session, or replay, setup refuses the binding.
3. Given concurrent successful callbacks, exactly one connection is established.
4. Given a default selected-resource connection, an ungranted resource remains inaccessible.
5. Given revocation during a listing, work stops and indexed items remain.
6. Given a token-bearing failure, diagnostics reveal no credential.

## Swap points

Replace the workload host, consent store, or encryption service without weakening exact trust matching, least privilege, or either authorization proof.

## Sources

- [Federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation).
- [Application token exchange](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).
- [Publisher verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview) supports deployment trust review; it does not establish caller authority.

- [Case-sensitive federation](https://learn.microsoft.com/en-us/entra/identity-platform/reference-breaking-changes).
- [Google ID tokens](https://docs.cloud.google.com/docs/authentication/token-types).
- [Redirect restrictions](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url): register exact return destinations because mismatches fail; avoid wildcard returns.

## Known gaps

Federation does not protect a compromised workload. Administrative proof and personal authorization require separate conformance evidence. Resource-specific grants depend on the provider's supported scope.
