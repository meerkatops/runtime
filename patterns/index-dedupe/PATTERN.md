---
id: index-dedupe
title: Optional, off by default, caches keyed by content hashes so identical files are extracted and translated once, while every item keeps its own record
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-content, platform-tenancy, index-extract, index-run-control]
provides: [ExtractionCache, TextCache, CacheSweeper]
requires: [BlobStore, Database]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Deduplication caches

## Problem

Review collections hold many copies of one file: the same attachment on a hundred emails, the same contract in ten folders. Extracting, running OCR on and translating every copy costs hours of compute. Sharing one stored content between the copies is worse: a key that misses one processing version serves stale text, an erase of one copy removes or keeps the others' text by accident, and a match across tenants tells one tenant what another holds. This is hard to get right and hard to test, which is why it is off by default.

## Use when / Do not use when

- **Use when** duplicates are common and extraction, OCR or translation dominates the cost, and the team can test erase, quarantine and sweep across copies.
- **Do not use when** duplicates are rare, the collection is small, each item's processing must be evidenced on its own, or the team cannot run the conformance below. Without this pattern every item keeps its own content (index-content), which is always correct.

## Environment

Designed only, so no language. Runs beside the extraction and translation workers; needs the tenant's blob store and the transactional database.

## Solution

Two caches, both optional, both inside one tenant. Neither is content: they are build-time shortcuts that a worker reads before doing work it would otherwise repeat.

- **Extraction cache,** keyed by tenant, byte digest (SHA-256 and BLAKE3, index-content) and the versions of the extractor, OCR and normalizer. It holds what extraction produced: structured content, zones, pages and positions. Identical bytes give identical positions, so this cache may serve them.
- **Text cache,** keyed by tenant, content hash and the versions of each process that read the text (the sentence splitter and each translation model's revision, the tokenizer). It holds work made from text alone: a translation and its token count. It never serves pages or positions, because identical text can come from different bytes.

**Each item keeps its own record.** An item's path, name, dates, source metadata, access, tags, comments and lifecycle stay on its own record. A worker that hits a cache still commits the item's own content version and feed event (index-content), and the engines index each item as its own document. Nothing at query time knows that two items once shared a cache entry.

**References and the sweep.** A committed item version records which cache entries it was built from. A sweep deletes an entry that no current item version references and has not been referenced for a grace period (default 7 days), so a file removed and added back in one scan reuses its work. Erasing an item removes its reference at once and deletes any entry it alone referenced at once, without waiting for the grace period. Quarantining an item marks every entry it was built from, and every other item built from a marked entry is checked again before it is shown.

## Ports

- **ExtractionCache.get(tenant, byte digest, versions)** → cached extraction or miss; **put** stores one after a successful extraction.
- **TextCache.get(tenant, content hash, versions)** → cached translation and count, or miss; **put** stores one.
- **CacheSweeper.sweep(tenant)** → entries deleted; runs as stoppable, resumable work (index-run-control).
- **BlobStore**, **Database** (required): tenant-scoped storage and the references, committed with the item version.

## Rules

1. **Keep both caches off by default,** because a wrong key serves stale or foreign text silently, and every item keeping its own content is always correct.
2. **Key every entry by tenant and by every processing version that affects it,** because a cache shared across tenants leaks what another tenant holds, and a key that misses one version serves output from an older extractor or model.
3. **Serve pages and positions only from the extraction cache, keyed by bytes,** because identical text from different bytes has different pages, and a highlight placed from another file's geometry marks the wrong words.
4. **Commit each item's own content version, record and index documents even on a cache hit,** because path, metadata and access belong to the item, and a hit must change nothing a person sees except how fast it arrives.
5. **Record each reference in the same commit as the item version,** because a reference written separately can be lost and the sweep then deletes an entry still in use.
6. **Sweep by reference after a grace period, never by a counter,** because a counter drifts under retries and crashes, and an immediate delete loses work a returning file would reuse.
7. **Let erase and quarantine reach every entry an item was built from,** because a cached translation or extraction is a copy of the erased or unsafe text.

## Conformance

1. **Given** the caches off, **when** two identical files are added, **then** each is extracted on its own and keeps its own content.
2. **Given** the caches on and a file copied to two paths in one tenant, **when** both are added, **then** extraction runs once, each item has its own record, path, access and index document, and both show identical positions.
3. **Given** the same file in two tenants, **then** neither tenant's worker reads the other's entry.
4. **Given** a new OCR version, **when** a cached file is processed again, **then** the cache misses and extraction runs.
5. **Given** two files with equal text but different bytes, **then** the text cache serves the translation and the extraction cache misses.
6. **Given** both copies removed, **then** the entry survives the grace period and a re-added copy reuses it; after the period it is swept.
7. **Given** one of two copies erased, **then** the other keeps its content; **given** the only copy erased, **then** its entries are deleted at once.
8. **Given** one copy quarantined, **then** the other copy is checked again before it is shown.

## Swap points

The cache store, the grace period and the sweep schedule may be replaced. Tenant-scoped keys with every processing version, per-item records and commits, reference-based sweeps, and erase and quarantine reaching every entry must stay.

## Sources

- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3); [SHA-256, FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).

## Known gaps

Designed, not run. The savings depend on how often a collection repeats itself; measure before turning it on. A cache cannot shorten the first extraction of any file.
