---
id: index-run-control
title: Run the index's work so it stops on demand, survives a crash and finishes what it started
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [big-red-button, index-access, index-content, platform-errors]
provides: [RunControl, WorkQueue]
requires: [Database, BlobStore, StopGate, CrossTenantOps]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: [Database]
---

# Run control

## Problem

Crashes strand work, retries duplicate effects, and old workers can overwrite newer content. A job committed to the database can remain invisible to an external queue while every worker is idle.

## Use when / Do not use when

Use when processing must survive crashes, stops, retries, and processing-version changes. Do not use for disposable computation with no durable effects.

## Environment

A transactional database, tenant-scoped storage, a durable queue, a continuously available relay, and the stop gate.

## Solution

Persist jobs before execution. Workers claim renewable leases and checkpoint durable batches. Writes require current lease authority, current stop authority, and the expected item and derivative target.

Requested rescans and rebuilds are stored actions that expand into bounded jobs. A target describes required processing versions; reconciliation finds every item that differs, independently of source change feeds. What a person sees of a run (each file's stage, the workers on it, and when it is done) is index-progress.

## Ports

- RunControl coordinates leases, checkpoints, recovery, actions, and processing targets.
- WorkQueue durably admits work and supports repeat-safe delivery.
- Database commits work, checkpoints, and dispatch obligations.
- BlobStore retains resumable bytes and required originals.
- StopGate checks covering stops and stop generations.
- CrossTenantOps performs restricted cross-tenant claims and global stop checks.

## Rules

1. Commit admission and an outbox obligation together, because a crash between database commit and queue send strands work. A durable relay retries dispatch until acknowledged; duplicate delivery joins the existing job. Reconcile due scans, expired leases, and missed wakeups even when workers are idle.
2. Claim across tenants only through a narrow audited path that works under forced row-level security, because an ordinary worker cannot safely enumerate tenants or see deployment stops.
3. Recheck stop state on claim, renewal, costly steps, and commit, because notification delivery is advisory. Refuse progress if authority cannot be verified.
4. Compare lease, stop generation, expected item version, byte identity, and derivative target at commit, because a valid older job can still finish after newer work.
5. Give every chunk its own identity within an immutable publication attempt, because shared identities overwrite chunks. Admit hits, totals, and facets only from the record of truth's current complete publication; cleanup cannot authorize obsolete writes.
6. Commit content changes and feed events atomically in commit order, because number allocation can precede commit. Advance checkpoints only through fully handled events; recover an expired feed position through reconciliation.
7. Resume transfers only against a source identity guaranteed to track bytes and verified retained content, because size and timestamps can join different versions. Restart when no such guarantee exists.
8. Skip extraction only when bytes and derivative versions both match, because processing upgrades require unchanged items too. Enumerate backfills from stored state independently of provider deltas.
9. Capture a mail-history baseline before an initial scan and replay intervening history before advancing it, because the highest position encountered during a changing scan can skip edits to items already fetched. [Mail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).
10. Consume chat edits and removals through change events and reconcile expired history, because creation-time listing discovers new messages but misses changes to old ones. [Listing limits](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list), [change events](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.spaceEvents/list).
11. Deduplicate equal actions and require independent approval for destructive work, because retries and broad selectors amplify mistakes. Record per-item outcomes and retain interrupted obligations.
12. Build generations beside active content and catch up through an agreed cutover boundary before atomic publication, because changes continue during rebuilds. Catch up retained generations before rollback, including removals and quarantines.

## Conformance

1. Given a crash after admission and before dispatch, then the relay reaches the queue and work completes once.
2. Given an expired lease or obsolete source version, then late writes remain invisible after a stop and lift.
3. Given a partially failed batch or reversed transaction completion, then recovery skips no committed event.
4. Given multiple chunks and a replay after cleanup, then all current chunks remain distinct and obsolete content contributes nothing.
5. Given edits during an initial mail scan, old chat removals, or an unchanged item's processing upgrade, then reconciliation processes each.
6. Given concurrent changes during cutover or rollback, then the published generation contains all eligible changes.

## Swap points

Replace queue, storage, host, and batching while preserving durable admission, fenced commits, and publication truth.

## Sources

- [Concurrent claims](https://www.postgresql.org/docs/current/sql-select.html), [commit notifications](https://www.postgresql.org/docs/current/sql-notify.html), [listener recovery](https://www.postgresql.org/docs/current/sql-listen.html).
- [Sequence limitations](https://www.postgresql.org/docs/current/functions-sequence.html).
- [Lease coordination](https://kubernetes.io/docs/concepts/architecture/leases/).

## Known gaps

Lease timing and work bounds depend on deployment capacity. Recovery requires surviving authoritative records, originals, and keys.
