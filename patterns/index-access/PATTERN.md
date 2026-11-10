---
id: index-access
title: Who may see and do what, checked one way on every route and query
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [platform-tenancy, platform-data-model, platform-errors]
provides: [ScopedQueryBuilder, ItemResolver, Authorizer]
requires: [AccessResolver, GrantStore, StopGate]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Access

## Problem

A search filter can protect hits while counts, previews, background progress, or byte delivery still expose content. A credential can be genuine without granting membership or authority in the selected tenant.

## Use when / Do not use when

Use when people share content across tenants or nested scopes. Do not use when every participant intentionally has identical authority over all data.

## Environment

Verified identity, current tenant membership, a grant store, an authoritative publication record, and mediated byte delivery. Tenant scoping is proven; the remaining authorization guarantees are designed.

## Solution

Resolve access once per request, then enforce it through two boundaries. The scoped-query builder limits searches and aggregates. The item resolver checks visibility and the specific action for each item or content delivery.

A role groups explicit permissions. A grant assigns a role to a person or group within a tenant, library, volume, folder, or item. Grants add within their own scopes; read access somewhere cannot supply write authority elsewhere.

## Ports

- ScopedQueryBuilder constrains searches, counts, facets, progress, and other aggregates.
- ItemResolver authorizes a specific item, action, and byte representation.
- Authorizer supplies the shared action decision to service interfaces.
- AccessResolver verifies identity, membership, and current effective grants.
- GrantStore retains scoped grants and their revocation history.
- StopGate enforces read restrictions during lockdown.

## Rules

1. Validate credential authenticity, intended recipient, validity, and membership before selecting tenant context, because an authenticated outsider is still an outsider. A trusted single-use bootstrap establishes the first administrator; administrators delegate only inside their authority, while operators remain separate.
2. Authorize connection management and require external administrator proof bound to the connecting person, session, organization, and platform tenant, because application consent does not prove the person's authority. [Consent warning](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent).
3. Evaluate tenant, visibility, then requested action, because denial must not confirm hidden content exists. Use exact permissions rather than automatic wildcards, because adding a capability must not silently expand existing roles.
4. Keep each grant attached to its scope, because combining unrelated grants can create authority nobody granted. Re-resolve access for every request and subscription delivery.
5. Require both publication and access before matching or aggregating, because post-filtering visible hits still leaks totals and facets. Only the record of truth's current publication is eligible; late or replayed engine writes cannot restore removed content after cleanup.
6. Send every preview, original, snippet, extracted-text read, and source-opening request through the item resolver, because a query filter does not authorize a particular content action.
7. If source permissions are enforceable, intersect them with local grants, because local sharing must not widen source access. Otherwise require explicit administrator approval for republication into a private destination; preserve connection observations and actual sharing evidence without claiming enforcement.
8. Revoke delivery through a gateway that checks current grants and lockdown for each byte request and interrupts active streams, because expiration alone leaves issued links usable. Bind capabilities to tenant, item, content version, representation, and expiry.
9. Make quarantine hide every ordinary surface and require safe preview rendering, because scrubbed search text does not sanitize original page images. Block previews whose secret-free output cannot be verified. How the preview pane draws content safely is search-preview.
10. Exercise real isolation in conformance checks and fail when its backing store is unavailable, because a skipped security check provides no evidence.

## Conformance

1. Given another tenant's item or absent membership, then searches, progress, counts, facets, and direct reads reveal nothing.
2. Given read authority in one scope and write authority in another, then neither widens the other.
3. Given a revoked grant, quarantine, or lockdown, then existing continuations and byte capabilities cannot bypass the change.
4. Given an obsolete engine write recreated after cleanup, then it contributes no hits or aggregates.
5. Given a source observation losing access while another remains authorized, then access narrows without inventing authoritative removal.
6. Given secret-bearing original bytes, then ordinary preview and export cannot expose them through a sanitized-text claim.

## Swap points

Replace identity, policy evaluation, or engine filtering while preserving the two enforcement boundaries and current decisions.

## Sources

- [Explicit actions](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html), [roles and permissions](https://docs.cloud.google.com/iam/docs/roles-overview).
- [Credential validation](https://www.rfc-editor.org/rfc/rfc9068.html), [authorization decisions](https://openid.net/specs/authorization-api-1_0.html).

## Known gaps

Additive grants cannot exclude an individual item inside an otherwise granted scope. Authorization cannot recall content already received.
