---
id: platform-api
title: One operation catalog generating GraphQL, REST and OpenAPI
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-errors, platform-tenancy, index-access]
provides: [OperationCatalog, PageToken]
requires: [ServiceLayer, Authorizer]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Platform API

## Problem

Independent interfaces drift in authorization, behavior, and failure handling. A page and an application can receive different answers to the same request, while a continuation token can outlive the access that justified it.

## Use when / Do not use when

Use when several interfaces expose one service. Do not use for private calls within a component that already shares one implementation.

## Environment

A service layer, an authorization service, generated application interfaces, byte delivery, and protected browser sessions.

## Solution

Maintain one operation catalog describing intent, permission, validation, limits, failure meaning, and repeat behavior. Generate the interfaces from it. Interface adapters decode and encode; the service performs the work.

Keep the platform mechanism independent of domain operations. The index service owns search, uploads, comments, embedding, and other index behavior. Every user control must reach an authorized service capability, including status, progress, cancellation, and approval when the behavior requires them.

## Ports

- OperationCatalog defines authorized capabilities and generates their interfaces.
- PageToken protects continuation state against substitution and changed access.
- ServiceLayer applies validation, authorization, stops, and domain behavior.
- Authorizer verifies identity, membership, and permitted actions.

## Rules

1. Verify identity and current tenant membership before dispatch, because a valid credential alone does not authorize tenant selection. Require a trusted first-administrator bootstrap and constrain delegation to the administrator's scope; operators remain separate.
2. Bind connection setup to the authenticated person, a single-use session, the platform tenant, and verified external-organization administrator authority, because a successful service-access probe proves only the application's access. Reject substituted callbacks and require explicit authority for rebinding. [Consent callback warning](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent).
3. Require an explicit permission decision for every capability, because an omitted check must prevent exposure. Health checks return no tenant information.
4. Use the same service and failure classification on every interface, because transport choice must not change access or retry decisions. Resolve hidden items without confirming their existence.
5. Bind continuation to tenant, current access, query, filters, complete sort order, position, generation, and expiry, because a valid token can still belong to another search or permission state. Refuse unsupported continuation rather than silently changing order.
6. Use one service-owned page-size policy and demand limits across interfaces, because a screen component's capacity is not a server contract. Reject excess depth, batching, expansion, and cost before expensive work. [Demand controls](https://graphql.org/learn/security/).
7. Scope idempotency to the tenant, caller, action, and intended effect, because retries must repeat an answer without duplicating work or replaying another person's authority.
8. Separate stop-lift requests from approvals and return a durable pending decision, because a second approver needs an exact authorized request to approve. Keep stop control, audit, and revocation available under stops.
9. Deliver bytes through current authorization and lockdown checks, including links already issued, because an unrevocable storage capability defeats immediate lockdown. Bind each capability to its intended representation as well as its item.
10. Reauthorize subscriptions at every delivery and use safe browser rendering and mutation protections, because long-lived connections and untrusted text cross request boundaries.

## Conformance

1. Given equivalent calls through each interface, then authorization, ordered results, page limits, and failure meanings agree.
2. Given an unverified membership or a connection callback naming another organization, then no tenant access or connection is created.
3. Given a changed grant, scope, query, or sort, then an existing continuation is refused.
4. Given a repeated mutation, then it has one effect; changed intent under the same repeat key is refused.
5. Given lockdown after a byte link was issued, then that link cannot deliver bytes.
6. Given a protected lift request, then its requester cannot provide the required independent approval.

## Swap points

Replace interface libraries and signing keys while preserving one catalog, shared service decisions, and bound continuation.

## Sources

- [Operation and error semantics](https://spec.graphql.org/September2025/), [subscriptions](https://graphql.org/learn/subscriptions/), [pagination](https://graphql.org/learn/pagination/).
- [Interface descriptions](https://spec.openapis.org/oas/v3.1.0).
- [Problem Details](https://www.rfc-editor.org/rfc/rfc9457).

## Known gaps

Ordinary pagination does not provide snapshot isolation. Protocol generation cannot establish the trustworthiness of the supplied identity service.
