---
id: connector-delta-sync
title: Delta sync that never loses an item
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector-throttle, platform-errors]
provides: [Lister]
requires: [StateStore, FailureLog]
environment:
  language: []
  runs: unknown
  cloud_services: [the provider's change feed (Microsoft Graph delta proven; Google Drive changes and Gmail history and Calendar sync tokens designed)]
  local_needs: []
---

# Delta sync

## Problem

A change cursor can move past failed work, miss changes during an initial scan, or treat lost visibility as source removal. Each failure leaves an index looking current while holding incomplete or stale content.

## Use when / Do not use when

Use when a source supplies resumable change tracking. Do not use when it supplies only a listing; complete listings and reconciliation are required instead.

## Environment

A leased worker, durable checkpoints, source-specific change semantics, and an intake sink that acknowledges durable acceptance.

## Solution

Keep separate progress for each tenant, connection, principal, and resource. A bounded calendar view also needs its own time window. Record whether work is taking an initial inventory, replaying changes, or following an established feed; a saved starting cursor does not mean the inventory completed.

Establish a change baseline before inventory, finish that inventory, then replay changes from the baseline. Follow complete provider continuation links unchanged, even through empty pages, and apply the provider's repeated-item rule. Save progress only after the corresponding items and children are durably accepted.

Classify changes by evidence: new bytes, changed bytes, metadata only, confirmed source removal, lost observation, or unchanged. Keep observation loss distinct from removal of the canonical item.

## Ports

- **Lister:** Enumerates changes, acknowledges landed pages, and requests complete rescans.
- **StateStore:** Keeps isolated progress and advances durable checkpoints.
- **FailureLog:** Records held work, expired history, and reconciliation outcomes.

## Rules

1. **Advance only through fully accepted work,** because a cursor that passes a failed child loses it. Other items may proceed, but held work blocks that checkpoint.
2. **Bind progress to the authorized scope,** because reusing a cursor across tenants, users, resources, or calendar windows can omit or expose data.
3. **Persist the inventory phase and baseline,** because saving the largest change marker encountered during a moving scan can skip changes to items already read. Replay from the starting baseline before declaring synchronization complete. [Mail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).
4. **Honor the source's repeated-item ordering,** because a change feed is not necessarily an ordered event log. Where the provider specifies the last occurrence, retain that occurrence across the complete round. [Drive delta semantics](https://learn.microsoft.com/en-us/graph/api/driveitem-delta).
5. **Distinguish history loss by provider,** because retry cannot recover unavailable history. Gmail history can last less than a week; Calendar expiry requires full synchronization. Drive change-page tokens do not expire, and its new starting token appears only at the end of a round. A forced rescan invalidates incremental progress. [Mail history](https://developers.google.com/workspace/gmail/api/guides/sync), [calendar synchronization](https://developers.google.com/workspace/calendar/api/guides/sync).
6. **Retire only on authoritative evidence,** because incomplete listings and lost access do not prove source removal. Carry forward unseen observations after failed scans.
7. **Use content proof rather than size or time,** because metadata equality hides changed bytes. Graph distinguishes content changes from general item changes and its business-drive deltas omit content tokens; enrich or hash before skipping. Fetch and hash whenever strong provider evidence is unavailable. [Content evidence](https://learn.microsoft.com/en-us/graph/api/resources/driveitem?view=graph-rest-1.0).
8. **Skip extraction only when bytes and derivative targets match,** because unchanged source data can require new extraction. Enumerate derivative backfills from stored records independently of change feeds.
9. **Use notifications as wake signals,** because delivery gaps do not establish that nothing changed. Renew subscriptions with reconciliation and recover from durable progress.
10. **Complete empty rounds,** because absence of changes must still release the lease and record successful progress.
11. **Treat a provider's reset answer as a dead cursor: drop it, run a complete inventory, then replay,** because a cursor the provider has reset or expired cannot be resumed, and retrying it loops. Graph answers a reset with `410 Gone` and a fresh start link, and an expired Outlook token with a sync-state error. [Delta reset and expiry](https://learn.microsoft.com/en-us/graph/delta-query-overview), [drive resync](https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0).

## Conformance

1. Given a failed child and a crash, replay starts before that child and duplicates create no additional items.
2. Given a change to an already-read item during inventory, baseline replay captures it.
3. Given repeated observations across pages, the provider-defined final occurrence wins.
4. Given expired history or a requested rescan, a complete inventory runs before incremental progress resumes.
5. Given an interrupted listing or lost visibility, unrelated observations remain intact.
6. Given unchanged bytes and a changed extractor target, stored items are reprocessed.
7. Given an empty round or separate calendar windows, completion and progress remain independent.
8. Given a provider reset answer on a stored cursor, the cursor is dropped and a complete inventory runs before incremental progress resumes.

## Swap points

Replace feed, notification transport, checkpoint store, or batch size while preserving scope isolation, authoritative change meaning, and acceptance before advancement.

## Sources

- [Drive changes](https://developers.google.com/workspace/drive/api/guides/manage-changes).
- [Windowed calendar delta](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0).
- Provider adapters define supported content evidence and observation-loss semantics.

- [Drive token lifetime and final-page meaning](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list).

## Known gaps

A change feed cannot recover source history beyond its retention. Complete reconciliation needs permission to enumerate the relevant scope; incomplete visibility cannot establish global absence.
