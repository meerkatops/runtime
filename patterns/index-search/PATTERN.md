---
id: index-search
title: One search port for keyword, vector and hybrid search on a Lucene-style engine
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-query-syntax, index-access, index-content, index-vectors, platform-errors]
provides: [SearchIndex]
requires: [SearchEngine, ContentStore]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Search port

## Problem

Engines differ in paging, proximity, filtering, and counting. Chunk totals can masquerade as item totals. Delayed writes recreate obsolete content unless authoritative publication decides search visibility.

## Use when / Do not use when

Use when search needs stable meaning across replaceable engines and tenant-safe results. Do not use when engine-specific behavior is acceptable without a shared contract.

## Environment

A transactional record store, common search-syntax parser, access resolution, and engine adapter. Engines are rebuildable projections.

## Solution

Maintain item documents for keyword search and distinct chunk documents for sent items. A chunk lies in exactly one zone, so a chunk document carries one set of the zone fields plus a filterable zone; an item document carries the fields for every zone. Preserve all zones, including slides and sheets, scope, attributes, and ordering. Declare capabilities before accepting queries.

Resolve a bounded positive set of currently published identities under current access before engine matching, ranking, totals, and facets. Partition and merge within work bounds or refuse; never substitute temporary exclusions. Revalidate publication and access before release; retry changed decisions or fail closed.

Keyword search uses search-syntax meaning. Vector and hybrid search cover sent items only. Group chunks into items before paging; an item ranks by its best qualifying chunk. Buffered continuation retains unreturned candidates and seen items.

## Ports

- SearchIndex owns capabilities, loading, publication-aware querying, and continuation.
- SearchEngine performs the supported engine-specific search and document work.
- ContentStore supplies authoritative content, publication decisions, and positional boundaries.

## Rules

1. Give every item version a publication identity and every chunk its own identity within that version and generation, because chunks otherwise overwrite siblings. Publish only a complete queryable set; reject obsolete source or processing targets.
2. Positively admit only current publications for hits, totals, and facets, because a late or replayed write can resurrect a key after cleanup. Refuse if positive filtering exceeds engine or work limits; see filter limits.
3. Apply tenant, access, lockdown, lifecycle, publication, and user filters before matching or aggregation, because filtering a fetched page leaks counts and misses matches. Resolve access through the shared authorization boundary.
4. Apply vector restrictions during candidate search, because filtering afterward can discard eligible neighbors. See vector filtering sources.
5. Group distinct items, refill bounded candidates, and retain continuation state, because native chunk counts and collapsed rows do not establish item totals. Mark bounded vector totals as lower bounds; never present chunk facets as item facets.
6. For exact sentence or paragraph matching, generate a genuine candidate superset and check stored boundaries, because a finite word-distance approximation can miss valid matches. Exceeding the precision-preserving work bound refuses the query rather than returning partial exact results.
7. Preserve the requested full ordering with a unique tiebreaker from page one, because changing sort midstream skips results. Bind continuation to tenant, access, scope, query, mode, generation, ordering, buffered state, and expiry; sign it and recheck authority on every page. Azure live paging has no snapshot; OpenSearch live continuation also shifts under writes unless paired with a point-in-time view. [Azure paging](https://learn.microsoft.com/en-us/azure/search/search-pagination-page-layout), [OpenSearch paging](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/).
8. Validate positive integral page sizes against one service-wide maximum, because grid choices do not define the service contract.
9. Inspect every batch result and advance feed progress only through completed events, because request success does not prove every document landed. Test this in the common port kit.
10. Build generations from a snapshot plus feed catch-up through an atomic cutover barrier, because a starting watermark misses concurrent changes. Catch rollback candidates up too; keep removed content unpublished throughout.
11. Refuse unsupported operators, attribute filtering, paging, or sorts explicitly, because approximations silently change search-syntax meaning. Scope model endpoints and query-text egress to tenant approval; keep content and scoped queries out of logs.

## Conformance

1. Given a filter matching only distant results, return the correct first page and scoped item totals and facets.
2. Given many chunks, partial batch failure, and stale replay after cleanup, preserve current chunks without obsolete hits or counts.
3. Given sentence matches beyond a word-distance approximation, return them or refuse at the declared work bound.
4. Given grant changes, an unsupported sort, or a publication race, invalidate or retry without disclosure.
5. Given concurrent changes during generation build and rollback, neither transition restores removed content.
6. Given a shared expected-hit corpus, adapters preserve the supported search-syntax meaning and identify approximate vector coverage.

## Swap points

Replace engines, batching, and work limits while preserving positive publication, item-level results, authorization, and query meaning.

## Sources

- [Filter limits](https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter#filter-size-limitations).
- [Paging](https://learn.microsoft.com/en-us/azure/search/search-pagination-page-layout); [hybrid search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview); [vector filtering](https://learn.microsoft.com/en-us/azure/search/vector-search-filters).
- [Paging](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/); [hybrid queries](https://docs.opensearch.org/latest/query-dsl/compound/hybrid/); [vector filtering](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/).

## Known gaps

Positive publication filtering bounds searchable scope. Vector retrieval is approximate. Live paging is not necessarily a snapshot; exactness depends on engine capabilities and stable inputs.
