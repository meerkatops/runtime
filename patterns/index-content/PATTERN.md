---
id: index-content
title: Content, one per item version and current only, and the ordered feed every engine follows
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [platform-data-model, platform-tenancy, index-extract, big-red-button]
provides: [ContentStore, ContentFeed]
requires: [BlobStore, Database]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: [Database]
---

# Content

## Problem

An engine cannot rebuild without authoritative content. Byte equality cannot justify skipping changed processing. Advancing past unfinished feed work loses changes; valid leases cannot stop older jobs from replacing newer content.

## Use when / Do not use when

Use when content survives engine outages, supports multiple engines, or has a controlled lifecycle. Do not use for disposable, single-pass indexing without recovery requirements.

## Environment

A transactional record store holds authoritative content and ordered changes. Tenant-scoped storage holds retained originals and derivatives. Each consumer has durable progress.

## Solution

Keep one current content bundle for each item. Its record describes source identity and version, byte digest, processing versions, ordered text blocks, searchable zones, page positions, and visibility. Retain observed item history separately from retained content.

**Two hashes, each taken as SHA-256 and BLAKE3.** Every hash in the index is taken twice, in one pass over the same bytes, and both are kept: BLAKE3 because it is fast to compare at scale, SHA-256 because other review tools exchange it. The byte digest is taken over the stored original at intake (index-intake), and says whether the file changed. The content hash is taken over the item's markdown once it is made (index-markdown), and says whether the text is the same. Before hashing, normalize the markdown in this order: line endings to LF, NFC, trailing whitespace removed; store the normalized bytes and hash exactly what is stored. When the normalized markdown is empty, the content hash is the byte digest. Neither hash includes a name, a path or a time. A machine translation is a derivative with hashes of its own (index-translation); it never changes the content hash.

**No deduplication by default.** Every item keeps its own content and derivatives, even when two items hold identical text. Optional caches keyed by these hashes are index-dedupe; this pattern works the same with or without them.

Build markdown and derivatives from the extractor's common representation. Bundle identity includes the tenant, the item, the byte digest, and the versions of every process that affects the output. Preserve all zones, including footnotes, slides, and sheets.

How the markdown is made, counted and exported, and in what order, is index-markdown.

Commit content or lifecycle changes and their feed events together. Serialize feed publication per tenant through commit, so a consumer cannot mistake allocation order for commit order. Consumers advance only through fully handled events and publish only complete, queryable item versions in each engine generation.

## Ports

- ContentStore owns current bundles, lifecycle decisions, and conditional content commits.
- ContentFeed delivers commit-ordered changes and records consumer progress.
- BlobStore retains tenant-scoped originals, derivatives, and lifecycle-managed caches.
- Database atomically commits authoritative changes, events, and progress.

## Rules

1. Skip re-extraction only when both verified bytes and required derivative versions match, because an unchanged file can need different OCR or normalization. Enumerate stored items for version backfills; unchanged sources need not appear in deltas.
2. Compare the expected source version, byte identity, derivative target, lease, and stop state before accepting output, because two valid jobs can complete out of source order.
3. Commit every authoritative change with its event, and establish order through commit, because allocating a sequence alone does not establish publication order. See the sequence source.
4. Advance a checkpoint only through completed work; retry partial batches idempotently and acknowledge intentionally ignored events, because one skipped event can otherwise disappear permanently.
5. Retain feed history for the recovery window and rebuild from an authoritative snapshot when a cursor expires, because replay cannot recover an event no longer retained.
6. Track publication per item and engine generation, with a distinct identity for every chunk; queries admit only currently published versions, because delayed or replayed writes can recreate obsolete engine documents after cleanup.
7. Restore reruns safety inspection before publication, preserving quarantine across removal, because removing then restoring must not bypass release checks. Remove hides immediately; erase overrides retention grace. Interrupted purges remain durable work.
8. Apply lifecycle decisions to originals, derivatives (translations among them), vectors, render caches, finished exports, retained generations, quoted comments, and citations, because retained copies can leak erased text. Keep only minimal non-content audit evidence after purge.
9. Require retained originals for file previews or report previews unavailable, because a connector is not guaranteed to recover bytes and an upload has no external source. Quarantine secret-bearing originals; scrubbed text alone cannot protect previews.
10. Build replacement and rollback generations from a snapshot plus changes through a cutover barrier, including removals and quarantine, because a starting watermark misses concurrent work. Preserve removal decisions during backup recovery so old content cannot return.
11. **Hash normalized markdown for the content hash and the stored original for the byte digest, and keep both on the record,** because a byte change that leaves the text the same (a re-save, new metadata) must not count as new content, and a text change must never hide behind an unchanged file.
12. **Take every hash as both SHA-256 and BLAKE3, in one pass, and keep both,** because one algorithm alone either compares slowly at scale or cannot be checked by the other tools a document travels to.

## Conformance

1. Given unchanged bytes and changed processing versions, rebuild the affected bundle; a fully matching repeat does no extraction.
2. Given a slow older job, its output cannot replace the current version.
3. Given overlapping transactions and a partially failed engine batch, no feed event is skipped and replay changes no completed result.
4. Given multiple chunks and an obsolete write replayed after cleanup, only the complete currently published set contributes to results, totals, and facets.
5. Given quarantine, ordinary restore fails; given erase, all retained artifacts and quoted content become inaccessible, including after recovery.
6. Given missing originals or expired feed history, report unavailable previews or perform an explicit snapshot rebuild.
7. Given the same text saved twice with different line endings and a trailing space, both give one content hash, in SHA-256 and in BLAKE3; given a one-word change, both differ.
8. Given two items in one tenant with identical text and no index-dedupe, each keeps its own content and derivatives; erasing one leaves the other whole.
9. Given an erased item with a finished export that held its text, the export can no longer be downloaded.

## Swap points

Replace stores, feed transport and engines while retaining conditional commits, tenant isolation, commit order, lifecycle coverage, and positive publication.

## Sources

- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3); [SHA-256, FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).
- [Sequence allocation and transaction behavior](https://www.postgresql.org/docs/current/functions-sequence.html).

## Known gaps

Content retention does not establish legal hold. Preview availability depends on retained safe originals. Historical item observations do not imply historical searchable content.
