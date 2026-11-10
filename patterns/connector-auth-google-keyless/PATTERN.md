---
id: connector-auth-google-keyless
title: Google Workspace connection with no keys (keyless service account, domain-wide delegation)
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector, platform-errors]
provides: [Connection]
requires: [WorkloadIdentity, ConsentStore, KeyStore]
environment:
  language: []
  runs: cloud
  cloud_services: [a Google Cloud service account with no keys, signJwt, Organization Policy blocking key creation, Workload Identity Federation when the worker runs off Google Cloud, Admin SDK Directory API, Google Workspace Marketplace for other organizations]
  local_needs: []
---

# Keyless delegated organization access

## Problem

Reading organization-wide data by acting as individual users often leads to a powerful downloadable key. Removing that key still leaves a second risk: shared service access can be mistaken for proof that the connecting person administers the organization.

## Use when / Do not use when

Use when an administrator authorizes delegated reads across an organization and the workload supports federation or an attached service identity. Do not use when one person's consent supplies all required access.

## Environment

A keyless service identity, a managed assertion-signing service, a consent store, tenant-bound encryption, and a platform identity service with verified membership and controlled first-admin bootstrap.

## Solution

An administrator authorizes a limited set of read capabilities for the service identity. The workload asks the managed signing service for a short-lived assertion representing one approved user, then exchanges it for access. No downloadable private key is stored.

Treat installation, delegation, and connection binding as separate steps. Authenticate the connecting person, verify that person's administrative authority in the external organization, and check platform connection-management authority. Bind this evidence and a successful delegated test to the same single-use session, external organization, and platform tenant.

The connection record holds that relationship, the authorizing person, approved access, and revocation state. Every represented user must belong to the verified organization. Personal connections keep their own encrypted refresh credentials.

## Ports

- **Connection:** Establishes authorization and supplies organization-bound delegated access.
- **WorkloadIdentity:** Authenticates the workload to the managed signing service.
- **ConsentStore:** Keeps authorization evidence, approved scope, and revocation.
- **KeyStore:** Protects personal credentials with tenant and principal binding.

## Rules

1. **Block downloadable key creation and use managed signing through signJwt,** because a copied key survives workload shutdown and reaches every delegated account. [Delegation practices](https://knowledge.workspace.google.com/admin/apps/domain-wide-delegation-best-practices).
2. **Prove the connecting person's authority,** because a successful shared-service test only proves existing delegation. Delegation setup requires a super administrator. Match authenticated identity to current directory authority in the same organization; a typed address or matching domain is insufficient. [Delegation authority](https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation), [directory verification](https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/get).
3. **Bind administrative evidence to the setup session and platform tenant,** because otherwise an already-authorized organization can be attached elsewhere. Consume the session atomically; reject substitutions, replay, and unauthorized rebinding.
4. **Verify platform membership and connection-management authority separately,** because external authority does not grant platform authority. Bootstrap the first administrator through a trusted enrollment process rather than self-assignment.
5. **Restrict represented users to the verified organization,** because a caller-chosen identity can cross customer boundaries. Cache credentials separately for each organization, principal, and approved access. [Delegated user access](https://developers.google.com/identity/protocols/oauth2/service-account).
6. **Request only source-specific read scopes and restrict signing authority,** because delegation bypasses individual consent. Gmail and Drive full read-only access use gmail.readonly and drive.readonly, both restricted scopes; calendar.readonly covers calendar reads and admin.directory.user.readonly covers user enumeration. [Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Calendar](https://developers.google.com/workspace/calendar/api/auth). For personal OAuth, unverified sensitive or restricted access has a lifetime cap of 100 new users per project, which cannot be reset. [User cap](https://support.google.com/cloud/answer/13463817).
7. **Verify delegation rather than inferring it from installation,** because installation and authorization are distinct administrative controls. Changes can take up to 24 hours; retry within a bounded setup window. Multi-party approval can require a second super administrator. [Delegation setup](https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation).
8. **Protect short-lived credentials and enforce local revocation before use,** because keyless access still produces bearer tokens. Keep credentials out of logs and previews; disconnect retains indexed items.
9. **Check verification requirements for the installation route,** because internal-only use requires an organization-owned project and an Internal audience. Domain-wide installation exempts brand verification, but sensitive or restricted scopes still need app verification. Where restricted-scope verification applies, assessment and reverification recur at least every 12 months; installation alone proves neither exemption nor delegation. [Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

## Conformance

1. Given the service identity, no downloadable private key exists and attempts to create one are refused.
2. Given valid service access but an unrelated person, setup refuses the connection.
3. Given a substituted organization, platform tenant, replay, or represented user outside the organization, authorization fails.
4. Given two users, each receives separately scoped delegated access.
5. Given revocation, cached tokens are not used and running sync stops.
6. Given an installation without usable delegation, setup remains incomplete with an actionable explanation.

## Swap points

Replace workload hosting, installation method, consent storage, or encryption while preserving managed signing, verified authority, and organization-bound representation.

## Sources

- [Workload federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds).
- [Read-only directory access](https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list).
- [Application access controls](https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data).
- [Restricted-access verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

## Known gaps

Delegation does not reproduce each user's sharing policy. Installation approval, verification, and security assessment depend on deployment scope; keyless signing alone satisfies none of them.
