---
id: connector
title: A connector that pulls items from a SaaS source into the index
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector-auth-entra-fic, connector-auth-google-keyless, connector-delta-sync, connector-throttle, connector-m365-graph, connector-google-workspace, platform-errors, platform-tenancy]
provides: [Connection, SyncJob, DestinationResolver]
requires: [ItemSink, StateStore, KeyStore, FailureLog]
environment:
  language: []
  runs: both
  cloud_services: []
  local_needs: [one test tenant seeded with mail and events with attachments and recurring meetings and a Teams channel and non-ASCII subjects and large files, a sink and a state store and a per-tenant key store]
---

# Connector

## Problem

A connector can fetch the right bytes and still lose an item, attach another organization's data, or widen access. Reliability depends on the handoffs between authorization, listing, transfer, and intake.

## Use when / Do not use when

Use when copying files, mail, events, or messages from an organization's hosted service into an index. Do not use when a live source query is sufficient or the source forbids copying.

## Environment

A leased worker, transactional state, tenant-isolated storage, and supplied identity and intake services. Outbound fetches use approved hosts, recheck redirects, and block private and metadata destinations.

## Solution

Separate authorization from source access. A connection binds a platform tenant, verified external organization, principal, allowed resources, and destination policy. Service access and personal access are distinct grants.

Each source observation records its organization, resource, stable identity, observing connection, change evidence, and sharing evidence. Several connections can observe one canonical item; losing one observation does not establish source removal.

Resolve the destination before intake. The handoff carries that destination, provenance, item kind, content identity, staged bytes or structured content, relationships, access policy, and a stable retry identity. Intake accepts this handoff durably and returns its receipt before the listing checkpoint advances. Structured messages and attachments follow the same guard, size limits, and access rules as files.

## Ports

- **Connection:** Manages authorized connection setup and revocation.
- **SyncJob:** Runs a resumable resource sync.
- **DestinationResolver:** Selects an authorized destination for a source resource.
- **ItemSink:** Bridges resolved source items to durable intake.
- **StateStore:** Keeps isolated checkpoints and connection observations.
- **KeyStore:** Protects credentials with tenant-bound encryption.
- **FailureLog:** Records actionable failures without sensitive values.

## Rules

1. **Verify the connecting person's authority in both organizations,** because workload access proves neither platform membership nor external administrative authority. Bind that proof to a single-use session and the selected platform tenant.
2. **Require a supplied identity service with controlled first-admin bootstrap,** because accepting an arbitrary tenant selection or self-granted role defeats every downstream access check.
3. **Default destinations to private access,** because organization-wide reads do not authorize republication. An administrator must approve platform-only access; source-permission mode can only narrow source grants. Keep sharing evidence when claiming to audit it.
4. **Define one intake transaction boundary,** because a successful transfer alone is not acceptance. Commit item changes, jobs, and an outbox entry together; replay returns the same receipt.
5. **Keep every artifact under the shared tenant storage boundary,** because custom staging locations escape tenant removal and quota enforcement. Queues carry references, never file bytes.
6. **Use stable attachment identities,** because inserting a child must not move existing notes onto another attachment. Preserve inherited access, parent relationships, and confirmed child removals.
7. **Compare strong content evidence before skipping or resuming,** because equal size and time can hide changed bytes. Skip extraction only when both bytes and required derivative versions match; enumerate backfills independently of source deltas.
8. **Advance checkpoints after durable acceptance,** because passing a failed child loses it. A completed listing can retire authoritative observations; an incomplete listing or lost access cannot prove removal.
9. **Scan retained metadata and block unsafe previews,** because unrestricted metadata copying and rendering original bytes can expose secrets absent from search text.
10. **Revocation stops sync and retains indexed items,** because disconnecting is not a request to remove data. Jobs obey current leases and stop checks; restore never bypasses quarantine.

## Conformance

1. Given a valid workload grant and an unrelated connecting person, setup refuses the binding.
2. Given a crash after intake commits, replay returns one receipt and the outbox still delivers the job.
3. Given a failed child or incomplete listing, the checkpoint stays put and unseen items remain.
4. Given two observations and one access loss, the remaining authorized observation survives.
5. Given an inserted attachment or changed derivative target, relationships remain stable and required work runs.
6. Given detected secrets, previews expose none; a quarantine restore requires a fresh passing check.

## Swap points

Replace source, authorization, storage, or worker adapters while preserving tenant scope, provenance, durable acceptance, and checkpoint ordering.

## Sources

Provider-specific behavior and citations belong to the linked authorization and source adapter patterns. Intake, tenancy, and run-control patterns own the shared safety boundaries.

## Known gaps

Source permission replication requires identity mapping and current sharing evidence. Version history and retention labels are outside this pattern's current-content scope.
