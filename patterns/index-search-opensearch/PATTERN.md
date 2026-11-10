---
id: index-search-opensearch
title: The OpenSearch adapter for the search port
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-search]
provides: [SearchEngine]
requires: [OpenSearchEndpoint, Credential]
---

# Cluster search adapter

## Problem

Automatic type inference, offset paging, and vector post-filtering can violate shared search meaning. Collapsing chunks into rows does not make document totals into item totals. A search snapshot can also preserve content whose authorization has since changed.

## Use when / Do not use when

Use when a cluster-based engine provides the capabilities required by the shared search port. Do not use when a deployment lacks the necessary filtering, continuation, or hybrid support.

## Environment

A server-side adapter uses workload credentials against an authorized cluster. Declare deployed capabilities, including hybrid paging and snapshots.

## Solution

Load explicit representations for item text, every searchable zone, filters, ordering, and separately identified vector chunks. Translate search-syntax queries through the shared parser. Keep engine-specific representation inside the adapter and reject unsupported attribute comparisons.

Bind short-lived snapshot continuation to current tenant access, publication, scope, mode, and generation. Snapshot consistency cannot authorize content independently of current authority.

Vector restrictions operate during neighbor search. Hybrid search combines keyword and vector evidence through an explicit ranking pipeline. Distinct-item aggregation, refill, buffered continuation, totals, and facets belong to the shared search layer.

## Ports

- SearchEngine implements the shared search contract and inherits its complete conformance kit.
- Cluster endpoint identifies the authorized cluster or collection resources.
- Credential supplies workload authority without embedding long-lived keys.

## Rules

1. Define supported content and attribute interpretation explicitly, because automatic inference can assign incompatible types. Flat objects do not support numeric comparisons or sorting, text analysis, subfield filtering, or subfield aggregations; do not claim arbitrary attribute equivalence. Changing an indexed field's type requires a new index. [Type changes](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/). See flat-object documentation.
2. Give every chunk a distinct identity within item version and generation, because siblings sharing an identity overwrite one another. Load whole replacements and publish only complete queryable sets.
3. Enforce the shared positive publication decision before matching, totals, and facets, because a delayed write can recreate old content after cleanup. Recheck current authorization even inside a snapshot; refuse if bounded enforcement is impossible.
4. Apply restrictions during vector retrieval, because post-filtering can discard eligible neighbors. Efficient filtering depends on the vector engine and its release; verify it on the deployed engine. See vector filtering documentation.
5. Use a point-in-time view and complete sort values with a unique tiebreaker, because live paging repeats or skips hits. Offset paging defaults to a 10,000-result window. Expire and close snapshot resources; refuse lost snapshots rather than switching pagination strategy. See paging and point-in-time documentation.
6. Do not treat result collapsing as distinct-item counting, because collapse leaves native document totals and aggregations unchanged and constrains continuation sorts. Use shared grouping, refill, and buffered state; report bounded totals honestly. See collapsing documentation.
7. Require a hybrid ranking pipeline and at most five subqueries, because scores need fusion. Use a current release for hybrid paging, and keep depth fixed across pages because it changes ranking. See hybrid and hybrid paging sources.
8. Use newline-delimited bulk input ending in a newline; inspect every action and retain failed work, because a successful batch exchange can contain failed documents. Advance feed progress only through handled events. See bulk documentation.
9. Wait for observed query visibility before publication, because accepted writes are not necessarily searchable. Amazon OpenSearch Serverless does not support forced refresh; wait for searchable visibility. See [Serverless client restrictions](https://docs.opensearch.org/latest/clients/javascript/index/) and hosting operations.
10. Preserve word-nearness meaning with checked positional queries, but evaluate exact sentence and paragraph boundaries above the engine, because word distance does not establish structural boundaries. Treat returned highlight fragments as untrusted text. See positional and highlighting sources.
11. Catch generations up through cutover and preserve removals during rollback, because snapshots omit intervening changes.

## Conformance

1. Given the shared search kit, every inherited case passes, including stale replay after cleanup and partial batches.
2. Given tied sorts, a lost snapshot, or revoked access during paging, continue without repeats or refuse safely without disclosure.
3. Given several chunks per item, totals and facets count qualifying items rather than documents.
4. Given unsupported attribute comparisons or hybrid paging, refuse explicitly instead of approximating.
5. Given restrictive vector filters and a delayed visibility refresh, retrieve eligible neighbors and publish only after complete visibility.

## Swap points

Replace hosting, analyzers, vector algorithms, and client libraries while retaining the shared semantics, current publication, authority checks, and capability declarations.

## Sources

- [Paging](https://docs.opensearch.org/latest/search-plugins/searching-data/paginate/); [point in time](https://docs.opensearch.org/latest/search-plugins/searching-data/point-in-time/); [highlighting](https://docs.opensearch.org/latest/search-plugins/searching-data/highlight/).
- [Mappings](https://docs.opensearch.org/latest/mappings/); [flat objects](https://docs.opensearch.org/latest/mappings/supported-field-types/flat-object/); [vector representation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-vector/).
- [Vector filtering](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/); [collapsing](https://docs.opensearch.org/latest/search-plugins/searching-data/collapse-search/).
- [Hybrid queries](https://docs.opensearch.org/latest/query-dsl/compound/hybrid/); [ranking pipelines](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/); [hybrid paging](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/pagination/); [hybrid continuation](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/search-after/).
- [Bulk outcomes](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/); [positional queries](https://docs.opensearch.org/latest/query-dsl/span/span-near/); [hosting operations](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html).

## Known gaps

Supported behavior varies with hosting and release. Snapshot lifetimes are bounded. Vector ranking is approximate, and exact distinct-item aggregation can exceed configured work limits.
