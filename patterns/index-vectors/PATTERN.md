---
id: index-vectors
title: Vectors only for what a person sends, chunked by heading, cached, in generations that roll back
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-content, index-search, platform-data-model, platform-errors, big-red-button]
provides: [VectorIndex]
requires: [Embedder, SearchIndex, RecordStore]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Vectors

## Problem

Tags must not trigger embedding spend. Shared caches cross tenant boundaries, changed models make vectors incomparable, and stale generations resurrect removed items.

## Use when / Do not use when

Use when people explicitly choose items for meaning-based or hybrid search. Do not use when keyword search meets the need or content cannot leave the approved processing boundary.

## Environment

Safe current markdown, authoritative send records, a vector engine, an approved embedding endpoint, and tenant budgets.

## Solution

Sending freezes selection or tag membership. Tag changes do nothing. Repeat sends add missing work; changed sent items receive required updates.

Split markdown at headings; bound long sections with overlapping token windows. Embed chunk text and title; retain location, tags, dates, and access as search restrictions.

A generation records model, dimensions, chunking, processing versions, and catch-up progress. Build replacements beside the active generation; catch a consistent snapshot up through cutover before publishing. Rollback requires the same freshness.

## Ports

- VectorIndex estimates work, records explicit sends, reports progress, and controls generations.
- Embedder produces vectors through the tenant-approved model boundary.
- SearchIndex loads distinct chunks and searches only current published content.
- RecordStore owns send membership, budgets, tenant-scoped cache identity, and publication.

## Rules

1. Require an explicit authorized send, because tagging is organization rather than permission to spend or disclose content. Freeze the selection and make acceptance idempotent; repeat sends add only missing work.
2. Authorize the endpoint and query-text egress per tenant, because query embeddings disclose text just as document embeddings do. Never place content, vectors, secrets, or scoped queries in diagnostics.
3. Chunk by headings before bounded windows, because separated headings lose context. Version chunking, normalization, and title treatment for reproducibility.
4. Cache within the tenant using the exact embedded input and every relevant processing choice, including model, dimensions, and chunker version, because a global cache leaks cross-tenant content relationships. Scope derivative and storage identities to the tenant too.
5. Give each chunk its own stable identity within the item version and engine generation, because sibling chunks otherwise overwrite one another. Reuse vectors only when exact input and required processing versions match; moves without input changes need no model call.
6. Compare current source content, target versions, lease, and stop state before accepting results, because an old embedding job can finish after a newer item version.
7. Reserve tenant budget before calls and settle measured use idempotently, because concurrent sends exceed independent checks. For OpenAI embeddings, reject empty inputs and bound each to 8,192 tokens, each request to 2,048 inputs and 300,000 tokens total; count with the model's tokenizer before batching. See input limits.
8. Publish only a complete generation caught up through a cutover barrier, including content changes, new sends, access changes, removals, and quarantine, because a starting watermark omits concurrent work.
9. Keep rollback generations consuming changes or catch them up before switching, because retaining old vectors does not preserve current authority. Embed queries with the active generation's model and dimensions. OpenAI text-embedding-3-small defaults to 1,536 dimensions and text-embedding-3-large to 3,072; supported dimension shortening must match document and query vectors. See model guidance.
10. Apply positive current publication and access to every chunk query, total, and facet, because delayed or replayed engine writes can recreate removed data after cleanup. Remove and erase cover vector caches, retained generations, and pending work as well as active documents.
11. Honor stops during model work and resume from durable progress without accepting obsolete output, because cancellation can arrive after an external call has already consumed resources.

## Conformance

1. Given a tag edited without a send, no embedding occurs; given a repeated send, only missing work runs.
2. Given equal text in different tenants, no shared cache lookup or relationship is exposed.
3. Given multiple headings and chunks, all chunks survive with distinct identities and preserved context.
4. Given a move without changed input, no model call runs; changed processing versions regenerate affected output.
5. Given concurrent sends near budget, reservations prevent overspending.
6. Given changes, removal, quarantine, and new sends during build or rollback, cutover includes them and obsolete replay cannot restore visibility.
7. Given a stopped or superseded job, durable progress remains and its late output cannot replace current content.

## Swap points

Replace model, dimensions, chunking, endpoint, or engine through compatible generation transitions preserving explicit sends, tenant isolation, budgets, and current publication.

## Sources

- [Embedding models and dimensions](https://developers.openai.com/api/docs/guides/embeddings).
- [Embedding input and batch limits](https://developers.openai.com/api/reference/resources/embeddings/methods/create).

## Known gaps

Semantic ranking is approximate. Chunk size and overlap require corpus-specific evaluation. Send membership has no independent withdrawal action; item lifecycle controls removal.
