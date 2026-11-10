---
id: index-service
title: The index's operations in the platform catalog, behind one service layer
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-api, platform-errors, index-search, index-access, index-query-syntax, index-content, index-intake, index-vectors, big-red-button]
provides: [IndexOperations, ServiceLayer, ItemSink]
requires: [SearchIndex, ScopedQueryBuilder, ItemResolver, ContentStore, Intake, BlobStore, WorkQueue, OfficeConverter, StopControl]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Index service

## Problem

Separate service paths produce inconsistent access and results. They mistake accepted work for searchable content and tie applications to engines.

## Use when / Do not use when

Use when several callers search, read, or manage one index. Do not use when callers deliberately own independent indexing and authorization systems.

## Environment

Generated interfaces, domain ports, current access resolution, durable intake, and isolated extraction and rendering.

## Solution

Own index behavior in one service layer and register it with the platform catalog. Keep search, translation, progress, metadata, lifecycle changes, tags, comments, explicit embedding sends, and stop controls behind that boundary.

Search mode differs from translation mode. Progress tracks queryable publication. Comments keep their anchors. Tags organize content; embedding requires an explicit send of a frozen selection.

## Ports

- IndexOperations exposes authorized index behavior consistently to every interface.
- ServiceLayer validates requests and coordinates domain ports.
- ItemSink bridges resolved connector observations into durable intake.
- Intake accepts an observation and its work atomically.
- SearchIndex retrieves eligible publications through shared search semantics.
- ScopedQueryBuilder scopes searches and aggregates.
- ItemResolver authorizes individual content actions.
- ContentStore supplies authoritative content and lifecycle.
- BlobStore supplies verified retained bytes.
- WorkQueue delivers durable work.
- OfficeConverter renders supported documents on demand.
- StopControl manages presses, lift requests, and approvals.

## Rules

1. Register domain capabilities once and delegate platform interface mechanics, because duplicate catalogs drift. Apply the same access, limits, failure meaning, and page-size policy everywhere.
2. Use scoped queries for search, progress, counts, and facets, and the item resolver for every content, preview, export, and source-opening action, because filtering search does not authorize reading bytes. Recheck subscription deliveries.
3. Show readiness only after the record of truth publishes the complete current content and chunks, because queued or extracted content is not searchable. Late or replayed engine writes must contribute no hits or aggregates.
4. Bridge observations with verified tenant, resolved destination, source identity, content proof, and repeat intent into intake, because ambiguous handoffs lose destinations or duplicate work. Commit item changes, jobs, and outbox obligations together.
5. Normalize structured messages, bodies, and attachments through bounded intake. Give children stable identities, inherited access, and removal reconciliation, because positional identity reassigns annotations when ordering changes.
6. Scope mail and attachment retrieval to the mailbox owner in the provider request, because an item reference alone does not identify the owning mailbox. [Mail retrieval](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0), [attachment retrieval](https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0).
7. Hash exact immutable uploaded bytes in trusted code before completion, because object properties and client metadata cannot attest to an application-selected digest. Enforce hard limits while receiving bytes; direct staging needs bounded storage and expiration rather than a false no-overage guarantee. [Object properties](https://learn.microsoft.com/en-us/rest/api/storageservices/get-blob-properties).
8. Keep secret-bearing originals quarantined and block unverified previews and ordinary exports, because text scrubbing cannot sanitize rendered pages. Render only from verified redacted content with correct positions, or refuse delivery.
9. Run extraction and conversion without credentials, outbound network, or metadata access, because ingress restrictions and headless execution do not contain malicious content. Supervise each job with resource limits and cancellation. [Independent network isolation](https://kubernetes.io/docs/concepts/services-networking/network-policies/#the-two-sorts-of-pod-isolation).
10. Restore only eligible removed items; release quarantine through a fresh passing guard, because restore must not bypass inspection. Mediate existing byte links through current grants and lockdown checks.
11. Require retained safe originals for original-based rendering and remove cached renders with their content, because rendering cannot recover unavailable bytes. Require independent approval for irreversible removal to limit destructive mistakes.
12. Require tenant approval for embedding endpoints, query-text egress, and retention terms, because an explicit send authorizes selected content, not arbitrary external disclosure.

## Conformance

1. Given equivalent interface calls or an engine swap, then access decisions and ordered results agree.
2. Given duplicate connector delivery or upload completion, then one intended item change and durable work obligation result.
3. Given secret-bearing original bytes, then preview, copied text, and ordinary export expose no secret.
4. Given quarantine restore, an issued link during lockdown, or metadata access from an extractor, then each bypass is refused.
5. Given reordered attachments, then existing annotations retain the correct child identity.

## Swap points

Replace engines, converters, and viewers while preserving service ownership and authorization boundaries.

## Sources

- [Headless conversion](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).
- [Advisory tool annotations](https://modelcontextprotocol.io/specification/2026-07-28/schema).
- Provider traps are cited beside their rules.

## Known gaps

Unretained originals cannot support original-based previews. Unsupported renderers provide no page preview.
