---
id: index-search-azure-ai
title: The Azure AI Search adapter for the search port
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-search]
provides: [SearchEngine]
requires: [SearchServiceEndpoint, Credential]
---

# Managed search adapter

## Problem

A managed engine limits deep paging and filter size, offers no general query snapshot, and can report approximate counts during active indexing. Native vector and hybrid results describe documents, while callers need authorized current items.

## Use when / Do not use when

Use when a managed external search service meets the shared search contract. Do not use when the engine must run locally or supply unsupported snapshot or ordering guarantees.

## Environment

A server-side adapter uses workload identity, separate provisioning authority, and capacity reserved for active, building, and retained generations. The shared search layer owns access, publication, grouping, and signed continuation.

## Solution

Load complete versioned items and distinct sent chunks from authoritative content. Translate search-syntax queries internally. Apply restrictions during vector retrieval; hybrid ranking fuses keyword and vector evidence.

The shared search layer owns positive publication and item grouping. Native write success, document totals, and ranking do not establish publication.

Choose supported ordering before page one; continuation retains every component and a unique tiebreaker.

## Ports

- SearchEngine implements the shared search contract and all inherited conformance cases.
- SearchServiceEndpoint identifies the authorized service and generation resources.
- Credential supplies workload authority appropriate to provisioning, writing, or querying.

## Rules

1. Select filtering during vector traversal explicitly, because postfiltering modes can lose eligible neighbors. Older indexes created before approximately October 15, 2023 default to postfiltering and require rebuilding for prefilter support. See vector filtering.
2. Respect the 1,000-result page limit and 100,000 maximum skipped results, because offset paging cannot walk an unlimited corpus. Preserve the complete requested order with range continuation or refuse; never switch relevance or date order to identity order. Live pages have no snapshot. See paging and search request documentation.
3. Split indexing at both 1,000 documents and 16 MB of serialized payload, because either ceiling rejects the batch. Inspect each document outcome; retry eligible conflicts and temporary unavailability, retaining malformed work visibly. See loading.
4. Bound vectors to 4,096 dimensions and queries to 10 vector fields, 3,000 search clauses, 100,000 search characters, and 1,000 wildcard or regex expansions, because these are service limits. Reject rather than truncate. See service limits.
5. Enforce bounded positive publication before matching, totals, and facets, because stale replay can recreate obsolete documents. Partition safely or refuse when filter capacity is exceeded; group chunks into items and mark count uncertainty during active indexing. See filter limits and paging.
6. Give chunks distinct identities and write whole replacements, because sibling collisions and partial updates retain stale content. Publish only complete, queryable sets.
7. Separate Search Service Contributor for index definitions, Search Index Data Contributor for loading, and Search Index Data Reader for querying, because document-writing authority cannot provision definitions. Use workload identity; reserve capacity for active, building, and rollback indexes. See roles and service limits.
8. Compile full Lucene syntax with all-term matching deliberately, because default conjunction changes hits. Reject exclusion-only full queries: adding a match-all wildcard is also unsupported. Wildcard and regex terms bypass analysis; normalize against indexed terms. Check sentence and paragraph boundaries above the engine. See full syntax.
9. Choose filtering and sorting attributes when adding a field and rebuild for incompatible changes, because existing field definitions are largely immutable. Reject unsupported options. Treat highlights as untrusted, incomplete text: they default to five per field and have limited wildcard and fuzzy coverage. See index updates and paging.
10. Catch replacement and rollback generations up through cutover, because a snapshot alone misses concurrent content, access, quarantine, and removal changes.

## Conformance

1. Given the shared search kit, every inherited case passes, including partial batches, stale replay after cleanup, and distinct-item facets.
2. Given deep date or relevance paging, preserve the full requested order or refuse before issuing an invalid continuation.
3. Given active indexing, mark uncertain totals honestly; given many chunks per item, count each qualifying item once.
4. Given restrictive vector filters, search within the eligible set rather than filtering returned neighbors.
5. Given a document-only identity, definition changes are refused; given insufficient capacity, tenant admission or generation creation stops safely.
6. Given equivalent supported search-syntax queries on a checked corpus, keyword hits match the other adapter's meaning.

## Swap points

Replace service tier, region, analyzers, and vector configuration while retaining publication safety, ordering, capability declarations, and inherited search semantics.

## Sources

- [Paging, counts, and highlights](https://learn.microsoft.com/en-us/azure/search/search-pagination-page-layout).
- [Full query syntax](https://learn.microsoft.com/en-us/azure/search/query-lucene-syntax).
- [Loading and batch outcomes](https://learn.microsoft.com/en-us/azure/search/search-how-to-load-search-index).
- [Service limits](https://learn.microsoft.com/en-us/azure/search/search-limits-quotas-capacity).
- [Hybrid search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview); [vector filtering](https://learn.microsoft.com/en-us/azure/search/vector-search-filters).
- [Roles](https://learn.microsoft.com/en-us/azure/search/search-security-rbac); [filter limits](https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter#filter-size-limitations).

- [Search request and offset ceiling](https://learn.microsoft.com/en-us/rest/api/searchservice/documents/search-post).
- [Index updates](https://learn.microsoft.com/en-us/azure/search/search-howto-reindex).

## Known gaps

Live paging provides no stable snapshot. Some deep ordering combinations are unsupported. Exact current publication can require refusing queries whose scope exceeds bounded filtering capacity.
