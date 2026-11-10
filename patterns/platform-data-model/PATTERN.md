---
id: platform-data-model
title: One Postgres record for the index, keyed by tenant, with versions, states and anchors that survive change
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-tenancy]
provides: [RecordStore, AnchorPlacer]
requires: [Database, BlobStore]
environment:
  language: []
  runs: unknown
  cloud_services: []
  local_needs: [Database]
---

# Data model

## Problem

A search engine is a replaceable projection. Treating it as the record of truth loses history, permits stale content to return, and leaves comments attached to the wrong passage after a change.

## Use when / Do not use when

Use when items change, acquire annotations, or feed multiple projections. Do not use when a disposable import has no lifecycle, access boundary, or retained references.

## Environment

A transactional record store, tenant-scoped object storage, and engines rebuilt from authoritative content.

## Solution

An item records its tenant, destination, source identity, observed connections, byte digest, source version, preservation policy, processing progress, visibility, and publication. Content changes create versions; metadata changes create revisions. Each derivative records the bytes and processing versions that produced it. Each chunk has an identity within its content version.

Keep visibility separate from processing. An item may be retained while hidden, quarantined, removed during a recovery period, or permanently purged. A job's success never grants visibility.

An annotation records the quoted passage, surrounding text, content identity, and location. Reattach using the quotation and context, then proximity to its location. When the passage disappears, keep the annotation as orphaned, with its quote, and try again on each new content version.

## Ports

- RecordStore maintains item identity, observations, versions, lifecycle, and publication.
- AnchorPlacer places annotations against the current content.
- Database supplies atomic changes and tenant-safe relationships.
- BlobStore preserves the originals and derivatives required by policy.

## Rules

1. Enforce tenant ownership on relationships, because knowing another tenant's reference must not permit a cross-tenant link.
2. Separate canonical source identity from each connection's observation, because one observer losing access does not prove the item disappeared. Include the external organization and owning resource in identity; identical bytes never merge unrelated items.
3. Treat a source's loss-of-access notice as observation loss, because it can also describe removal from that observer's view. Hide access through that observation and reconcile authoritative observations before retiring the item. [Change semantics](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes).
4. When a change feed can repeat an item, use its last occurrence across the completed traversal, because an intermediate occurrence can be obsolete. [Repeated delta items](https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0).
5. Skip extraction only when verified bytes and all required derivative versions match, because unchanged bytes can require different extraction or normalization. Size, time, and a source revision without a content guarantee are hints.
6. Commit each state change with its feed event and required work atomically, because separate writes strand jobs or leave projections unaware. Order events by committed changes and advance consumers only through fully handled work; allocated numbers alone do not establish commit order.
7. Accept content only for the expected item version, byte identity, derivative target, valid lease, and stop generation, because an older extraction can finish after newer work.
8. Publish an engine generation only after its complete chunk set is queryable. Positively admit only the publication selected by the record of truth for hits, totals, and facets, because cleanup cannot prevent a delayed write from recreating obsolete documents.
9. Restore removed content only while retained and eligible. Release quarantine through a fresh passing safety check, because ordinary restore must not bypass inspection.
10. Define removal and purge behavior for originals, derivatives, quotations, citations, caches, retained generations, and backups, because embedded copies also preserve content. Keep minimal audit evidence without retained quotations after purge.
11. Version, rotate, and recover encryption and signing keys; back them up with authoritative records, required originals, checkpoints, and removal evidence. Rehearse coordinated recovery and reconciliation of queues and engines, because rebuilding an engine cannot recover lost truth.

## Conformance

1. Given unchanged bytes and a changed processing target, then derivatives are rebuilt without inventing a content change.
2. Given an old worker finishing last or recreating cleaned-up engine documents, then obsolete content contributes no hits, totals, or facets.
3. Given quarantined content, when ordinary restore is requested, then it remains hidden pending a fresh safety check.
4. Given a moved or absent quotation, then its annotation moves correctly or is kept as orphaned with its quote.
5. Given recovery from a backup containing purged content, then removal evidence prevents republication.

## Swap points

Replace storage and anchor matching while preserving ownership, lifecycle, publication, and visible uncertainty.

## Sources

- [Quotation and position anchoring](https://www.w3.org/TR/annotation-model/).
- [Sequence allocation limits](https://www.postgresql.org/docs/current/functions-sequence.html).
- Provider lifecycle traps are linked beside their rules.

## Known gaps

Unavailable originals prevent historical page reconstruction. Legal holds and cross-jurisdiction retention decisions require policy beyond this lifecycle.
