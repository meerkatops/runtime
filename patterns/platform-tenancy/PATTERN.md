---
id: platform-tenancy
title: Every tenant walled off in the database, object storage and index, from the first row
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-data-model, platform-errors]
provides: [TenantContext, CrossTenantOps, TenantLimits, UsageMeter]
requires: [Database, BlobStore, IdentityProvider]
environment:
  language: []
  runs: unknown
  cloud_services: []
  local_needs: [Database]
---

# Tenancy

## Problem

A forgotten scope check can expose another tenant's records, files, search results, counts, or cached content. Isolation must survive pooled connections, background workers, administrative work, and interrupted removal.

## Use when / Do not use when

Use when storing data for independent organizations, including an installation with one tenant. Do not use when every participant intentionally shares one security boundary.

## Environment

A transactional database with forced row-level security, object storage, a search engine, and a supplied identity service.

## Solution

Establish tenant context from verified identity and current membership before opening access. Bind that context to one transaction. Every record and relationship belongs to a tenant; every stored object, staging area, derivative, cache entry, and engine document belongs to the same boundary.

Keep ordinary access separate from exceptional cross-tenant work. A narrow privileged service handles job claims, deployment stop checks, usage roll-ups, and tenant removal. It exposes approved actions rather than unrestricted database access.

## Ports

- TenantContext establishes verified tenant scope and constructs storage locations.
- CrossTenantOps performs restricted cross-tenant work with an audit trail.
- TenantLimits admits work within the tenant's configured budget.
- UsageMeter records consumption independently of admission decisions.
- Database supplies transactions and enforced row isolation.
- BlobStore holds objects within tenant boundaries.
- IdentityProvider verifies people, membership, and administrator bootstrap.

## Rules

1. Verify credential authenticity, intended recipient, validity, and current membership before selecting a tenant, because possession of a tenant reference proves no authority. A person choosing among memberships must have the chosen membership verified.
2. Provision the first administrator through a trusted, single-use bootstrap bound to the verified organization and person, because open self-promotion defeats every later grant. Keep operator authority separate; administrators may delegate only within their authorized tenant and scope.
3. Set scope for each transaction and deny absent or malformed context, because pooled connections outlive requests. Transaction-local settings end with their transaction. [Transaction settings](https://www.postgresql.org/docs/current/sql-set.html).
4. Force row isolation on every tenant-owned record and relationship, because owner access otherwise escapes ordinary policies. Ordinary application roles must lack bypass privileges and any route to assume privileged ownership. [Row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [forced isolation](https://www.postgresql.org/docs/current/sql-altertable.html).
5. Give exceptional routines only the bypass authority needed under forced isolation, because running with an owner's privileges alone does not establish cross-tenant visibility. Use a non-login owner, fixed trusted name resolution, restricted invocation, bounded actions, and audits; callers cannot assume its identity or submit arbitrary database work. [Privileged routines](https://www.postgresql.org/docs/current/sql-createfunction.html), [bypass behavior](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
6. Build all storage locations through tenant context, including uploads, render caches, and vector caches, because an untracked staging area escapes isolation and removal.
7. Apply the same scope to search, counts, facets, progress, and diagnostics, because aggregates disclose data too.
8. Reserve limits atomically before costly work and measure actual usage, because concurrent requests and false size declarations bypass advisory checks. Metering failures must not change authorization.
9. Record tenant removal durably and cover every artifact and retained generation, because a crash or restored backup must not revive removed data. Preserve removal evidence through recovery.

## Conformance

1. Given absent context, a forged credential, or an unauthorized tenant selection, when access is attempted, then reads and writes are refused.
2. Given a pooled connection reused across tenants, when a transaction omits context, then it sees neither tenant.
3. Given forced isolation, when an ordinary worker attempts a global claim, then it is refused; the authorized narrow path claims eligible work and sees deployment stops without exposing other records.
4. Given interrupted tenant removal, when recovery completes, then staged bytes, caches, derivatives, and every engine generation remain inaccessible and are removed.
5. Given two concurrent first-administrator attempts, then only the authorized bootstrap succeeds once.

## Swap points

Replace identity verification, storage, engine, or limit values while preserving transaction scope, restricted privilege, and complete artifact ownership.

## Sources

The database pages linked in Rules describe transaction lifetime, forced isolation, and privileged execution.

## Known gaps

Dedicated databases per tenant and jurisdiction-specific retention policies are outside this shared-storage pattern.
