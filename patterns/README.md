<!-- SPDX-License-Identifier: Apache-2.0 -->
# Patterns

A **pattern** is a named, proven way to build one piece of a system. It covers the problem, where it applies, the rules
that keep it right, the operations every implementation provides, and the cases every implementation must pass. It
names no product and no client. Any team can build from a `PATTERN.md`; its front
matter lets a plan cite it and its conformance cases serve as done checks.

Patterns are small and they compose. A large capability is a pattern that names its parts in `uses`, never one
monolithic document.

## The patterns

| Pattern | What it is | Status |
|---|---|---|
| [connector](connector/PATTERN.md) | A connector that pulls items from a SaaS source into the index | Mixed |
| [connector-auth-entra-fic](connector-auth-entra-fic/PATTERN.md) | One-click Microsoft 365 connection with no secrets (federated identity credential) | Mixed |
| [connector-auth-google-keyless](connector-auth-google-keyless/PATTERN.md) | Google Workspace connection with no keys (keyless service account, domain-wide delegation) | Designed |
| [connector-delta-sync](connector-delta-sync/PATTERN.md) | Delta sync that never loses an item | Mixed |
| [connector-throttle](connector-throttle/PATTERN.md) | Staying inside a provider's limits | Mixed |
| [connector-m365-graph](connector-m365-graph/PATTERN.md) | Microsoft 365: Outlook mail, Calendar, Teams files, OneDrive and SharePoint | Mixed |
| [connector-google-workspace](connector-google-workspace/PATTERN.md) | Google Workspace source adapter | Designed |
| [platform-tenancy](platform-tenancy/PATTERN.md) | Every tenant walled off in the database, object storage and index, from the first row | Designed |
| [platform-data-model](platform-data-model/PATTERN.md) | One Postgres record for the index, keyed by tenant, with versions, states and anchors that survive change | Designed |
| [platform-api](platform-api/PATTERN.md) | One operation catalog generating GraphQL, REST and OpenAPI | Designed |
| [platform-errors](platform-errors/PATTERN.md) | One error registry, one retry rule, structured logs and an audit of who did what | Designed |
| [big-red-button](big-red-button/PATTERN.md) | Big red button: an instant, durable all-stop, built in from the start | Designed |
| [index](index/PATTERN.md) | Index items end to end, inside tenant walls | Mixed |
| [index-upload](index-upload/PATTERN.md) | A web page that uploads files, resumes them by byte offset, and stages them for intake | Mixed |
| [index-intake](index-intake/PATTERN.md) | Take items in safely, from an upload or a connector, only what changed | Designed |
| [index-file-type](index-file-type/PATTERN.md) | A file's type, declared and forensic, side by side, and the extractor and renderer each admitted kind uses | Mixed |
| [index-extract](index-extract/PATTERN.md) | One sandboxed extractor port, from a file's bytes to structured content, preview pages and positions | Mixed |
| [index-extract-tika](index-extract-tika/PATTERN.md) | The Tika adapter behind the extractor port, as a sandboxed server sidecar | Mixed |
| [index-extract-ocr](index-extract-ocr/PATTERN.md) | OCR with Tesseract through Tika, only on pages with weak digital text, merged page by page | Mixed |
| [index-archives](index-archives/PATTERN.md) | Archives, email attachments and embedded files as children that keep their parent, unpack safely, change only what changed, and are shown together | Mixed |
| [index-email](index-email/PATTERN.md) | Email as an item a reviewer can search, read and follow | Mixed |
| [index-content](index-content/PATTERN.md) | Content, one per item version and current only, and the ordered feed every engine follows | Mixed |
| [index-dedupe](index-dedupe/PATTERN.md) | Optional, off by default, caches keyed by content hashes so identical files are extracted and translated once, while every item keeps its own record | Designed |
| [index-markdown](index-markdown/PATTERN.md) | Markdown made from extracted content, shown in the preview pane, counted in tokens, and exported in parts that fit a model's context window | Mixed |
| [index-translation](index-translation/PATTERN.md) | Detect each document's languages and keep a machine English translation beside the original, searched, previewed and exported side by side, with the original never overwritten | Mixed |
| [index-access](index-access/PATTERN.md) | Who may see and do what, checked one way on every route and query | Mixed |
| [index-run-control](index-run-control/PATTERN.md) | Run the index's work so it stops on demand, survives a crash and finishes what it started | Designed |
| [index-workers](index-workers/PATTERN.md) | Indexing workers: queue, scaling and lifecycle | Mixed |
| [index-progress](index-progress/PATTERN.md) | Indexing progress: every file a person added, its stage, the workers on it, and when the run is done | Mixed |
| [index-query-syntax](index-query-syntax/PATTERN.md) | One search syntax for any engine | Mixed |
| [index-search-literal](index-search-literal/PATTERN.md) | Exact search that keeps punctuation | Mixed |
| [query-builder](query-builder/PATTERN.md) | Query builder: plain words in, a search-syntax query out, shown before it runs | Designed |
| [query-builder-visual](query-builder-visual/PATTERN.md) | Visual query builder: conditions and groups in, search syntax out, written only by the server | Mixed |
| [index-search](index-search/PATTERN.md) | One search port for keyword, vector and hybrid search on a Lucene-style engine | Designed |
| [index-search-azure-ai](index-search-azure-ai/PATTERN.md) | The Azure AI Search adapter for the search port | Designed |
| [index-search-opensearch](index-search-opensearch/PATTERN.md) | The OpenSearch adapter for the search port | Designed |
| [index-vectors](index-vectors/PATTERN.md) | Vectors only for what a person sends, chunked by heading, cached, in generations that roll back | Designed |
| [index-service](index-service/PATTERN.md) | The index's operations in the platform catalog, behind one service layer | Designed |
| [index-read](index-read/PATTERN.md) | Show a person an indexed document whole and exactly as written | Mixed |
| [search-ui](search-ui/PATTERN.md) | The search screen's layout, actions, highlights and hit navigation, and what each must do | Mixed |
| [search-preview](search-preview/PATTERN.md) | The preview pane of search results, drawn safely from the server, with highlights at the server's positions and the original beside its translation | Mixed |
| [index-tags](index-tags/PATTERN.md) | Tags people put on items and libraries, searched, listed and exported, inside each person's access | Mixed |
| [index-comments](index-comments/PATTERN.md) | Comment threads on an item, with mentions, optional text anchors and notifications, inside each person's access | Mixed |
| [design-clear-ui](design-clear-ui/PATTERN.md) | A screen anyone can use on sight, with no manual, that still shows everything it needs to | Designed |
| [index-deploy-kubernetes](index-deploy-kubernetes/PATTERN.md) | Run the index pipeline on Kubernetes | Designed |


**Status words:** **Proven** means it ran live against a real tenant. **Designed** means it is written from the
provider's own documentation but has not been run yet. A pattern states its status per part and never rounds up.

## The lens

A pattern is a way to build, not a specification. It gives:

- **the ideas:** what the piece is for and how it works, in plain words;
- **the rules, each with its reason:** "because a cursor that moves past a failed item loses it";
- **the traps:** the places a careful team still gets burned, stated as rules, with the provider's page cited when the trap is a provider's behavior.

**The test for every line:** could a competent builder choose differently and still be right? If yes, it is an implementation choice and stays out. If no, because the system breaks without it or a provider forces it, it stays in.

- Say **where a technique helps**: "use a Fibonacci backoff when a provider says slow down".
- Name **the landmines**: the places a team that has built this before got burned, each with its reason.
- Keep a provider's fact only when the fact itself is the landmine (a batch cap that silently splits a write, an endpoint that exists only in beta), with the provider's page cited.
- Leave out version numbers ("use Tika"; take the current release), status code numbers, error code strings, field and column names, request paths, schemas and tables of operations.

It leaves the builder to choose names. It never lists field or column names, error code strings, status code numbers, request paths or schemas. When a record matters, it says in plain words what the record must hold ("an item records where it came from, a digest of its bytes, its version, when it was first and last seen, and whether it is visible"). It is short: 400 to 800 words. It takes effort and thought to build from, and it holds every trap a builder would otherwise rediscover.

## The format

A pattern is a folder holding a `PATTERN.md`. Its front matter is the manifest:

```yaml
---
id: connector-delta-sync          # the folder name; lowercase, hyphens
title: Delta sync that never loses an item
version: 0.1.0                    # semver; a breaking change to ports or conformance is a major version
status: proven                    # proven | designed | mixed (the body says which part is which)
license: Apache-2.0
visibility: public                # public | private: marked for public use, not where it is published; a private one never lands in a public repo
uses: [connector-throttle]        # patterns this one builds on
provides: [Lister]                # ports (operations) an implementation exposes
requires: [StateStore]            # ports it needs from whoever uses it
environment:                      # what we build it in and what it needs to run
  language: [TypeScript]          # what the proven implementation is written in; [] when not stated (designed only, or not said yet)
  runs: both                      # local | cloud | both | unknown (the pattern does not say yet)
  cloud_services: []              # each managed service it needs in the cloud, by its provider's name
  local_needs: [a writable folder for state]   # what running it on one machine needs; [] when not stated
---
```

[TEMPLATE.md](TEMPLATE.md) explains each section in one plain line, says who it is for, and is a filled-in example to copy.

The body has these sections, in this order:

1. **Problem:** what goes wrong without it.
2. **Use when / Do not use when:** where it applies.
3. **Environment:** the front matter's `environment`, in a few plain lines: the language it is built in, where it runs, the cloud services it needs, and what running it locally needs (a test tenant, an emulator, a container).
4. **Solution:** the shape, in prose and a diagram where one helps.
5. **Ports:** each operation with its inputs, outputs and errors, written language-neutral.
6. **Rules:** the numbered rules an implementation must keep. Each rule that came from a failure says what the failure was.
7. **Conformance:** numbered cases (given, when, then) that every implementation must pass. These are what make it a pattern rather than an article.
8. **Swap points:** what can be replaced, and what must not change when it is.
9. **Sources:** first-party documentation for every provider claim.
10. **Known gaps:** what is not proven or not built.

## How to use a pattern

- **Planning:** name the patterns a system builds on, and take its decisions from them, so the plan and the patterns cannot disagree.
- **Done checks:** work that builds a pattern's piece lists that pattern's conformance cases as its checks.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Every source file starts with `SPDX-License-Identifier: Apache-2.0`; a `PATTERN.md` carries it as `license:` in its front matter, which must be the first thing in the file.
