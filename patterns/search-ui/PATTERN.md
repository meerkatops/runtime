---
id: search-ui
title: The search screen's layout, actions, highlights and hit navigation, and what each must do
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [design-clear-ui, index-search, query-builder, query-builder-visual, index-query-syntax, index-vectors, index-access, index-content, index-read, index-markdown, platform-api, platform-data-model, index-tags, index-comments, index-archives, search-preview]
provides: [SearchScreen, HitHighlighter, HitNavigator]
requires: [OperationCatalog, SearchIndex, QueryBuilder, VectorIndex, ItemResolver, AnchorPlacer, HitPositions]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: [a browser]
---

# Search screen

## Problem

Local filtering hides matches and misstates totals. A preview that finds hits again in the browser marks words the engine never matched and misses the ones it did. Confusing tags with embedding triggers spending. Unsafe snippets execute content, and an exported results file can carry formulas that run when it is opened.

## Use when / Do not use when

Use for people searching, reviewing, organizing, commenting on, and exporting indexed items. Do not use for automated clients alone.

## Environment

A browser with the free MIT edition of MUI X Data Grid, calling authorized catalog operations. A design system supplies presentation. Sessions and mutations require identity verification, revocation, and request-forgery protection.

## Solution

**Layout.** One screen, top to bottom:

1. A utility bar, then a collapsible sidebar of the sources and libraries in scope.
2. A resizable split. It starts at half and half, keeps a minimum width on each side, and can expand the results to full width.
   - **Left, the results:** the search box (query-builder), the readout of what ran, a row of item kinds to narrow by (all, documents, email, calendar, spreadsheets), then the results grid.
   - **Right, the preview pane** of the selected item, with its tabs, as search-preview sets.
3. A slim status bar: sources in scope, items, and matches, from the server's counts.

Side panels open beside the results without replacing them: filters, the visual builder (query-builder-visual), saved searches, actions, tags, and the syntax guide (index-query-syntax).

**The grid.**

- **Columns:** Name first. When results are scored, a Relevance column comes next. Then source, tags, path, modified and created dates, kind, size, and status. Less-used columns (forensic type, link, structure) start hidden, and a column chooser shows them.
- **Rows:** fixed height, virtualized by the grid. Rows not yet searchable show in italics, with their status in words.
- **Flat or grouped view:** grouped puts attachments under their email, members under their archive, and messages under their email thread (the messages sharing one conversation), with a count of the matched children (index-archives). The free grid has no tree or row grouping, so the server returns grouped results as ordered rows, each with its depth, and the grid indents by depth.
- **Clicks:** clicking a row opens its preview; checkboxes select rows. A selection survives paging within the same search, clears when the query, scope, or filters change, and its count is always shown.
- **Paging, sorting, filtering:** all on the server. The default order is relevance, then name, then a unique id, so pages never overlap. Pages are 25, 50, or 100 rows, the free grid's limit. Filters are set in the filter panel and sent with the query. Continuation tokens are kept per page. Jumping ahead fetches the pages in between in order, at most 10 pages ahead; past that, the screen offers to narrow the search. A change of query, sort, filter, or scope discards the tokens and any response still in flight.

**Actions.**

- **Toolbar:** the flat or grouped switch on the left. On the right: actions that need a selection (send for semantic search, index-vectors), each disabled with a reason until rows are selected; then Actions, Export results, Columns, and Expand.
- **Right-click menu on a row:** add tags, remove tags, save as markdown, copy path, show metadata, and find similar (a semantic search seeded by this item, over content sent for embedding). It acts on the selection when the clicked row is selected, otherwise on that row alone, and names its target ("Tag 12 selected", "Tag this item").
- **Actions panel tabs:** Tags, Markdown export, and Exports (status, total tokens, download).
- **Export results:** writes the current results as CSV on the server, up to the service's export maximum, with the count shown first. A cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return, or a full-width form of those signs, is written with a leading single quote, so a spreadsheet shows it as text.

**Highlights.** Every search type highlights its hits, from positions the server returns for the search that ran:

- **Lexical:** each matched term and phrase, including ones that cross formatting or line breaks.
- **Regular expression:** each matched term.
- **Semantic:** each matched passage, shown as a passage band rather than as words.

Each type has its own style. Hits in a zone-restricted search mark only that zone. A regular-expression hit marks the whole term it matched, because expressions match complete terms (index-query-syntax). The find box is a separate layer. Marks are capped per document (default 2,000); past the cap the counter says so and the remaining hits stay reachable by paging the document.

**Hit navigation.** The preview opens on the first hit, scrolled into view. A counter shows "3 of 41". Next and previous step through hits in document order and wrap at the ends. A menu limits stepping to one search type. The find box (Enter for next, Shift+Enter for previous, Esc to close) matches literal text, case-insensitive, including text inside hit marks, and keeps its own counter. Changing the item resets both counters.

**Preview.** How the pane draws, delivers and secures each item is search-preview.

## Ports

- SearchScreen provides the searchable workspace and authorized controls.
- OperationCatalog connects every control and live update to an authorized service action.
- SearchIndex supplies scoped hits, counts, capabilities, and continuation.
- HitPositions returns, for one item and the search that ran, each hit's type and its offsets in the shown text.
- HitHighlighter marks hits by type, zone, and layer within the cap.
- HitNavigator steps through hits and find matches with their counters.
- QueryBuilder translates plain words into inspectable search-syntax queries.
- VectorIndex estimates sends and supplies durable progress.
- ItemResolver authorizes each content, preview, and export action.
- AnchorPlacer resolves comment locations against current safe text (index-comments).

## Rules

1. Obtain pages, ordering, filters, counts, and facets from the server, because a fetched page cannot describe the remaining corpus. Use the same validated query and scope for every displayed number.
2. End every ordering with a unique id and discard continuation tokens when the query, sort, filter, or scope changes, because ties without a final key repeat or skip rows across pages, and an old token answers a different search.
3. Keep the free grid's limits in the screen: 100 rows a page, one sort, filters in a panel sent to the server. These are screen limits, not service capacity. See grid sources.
4. Re-resolve access when opening workspaces, paging, previewing, exporting, or receiving live updates, because saved state and subscriptions are not authority. Hide unauthorized controls and enforce permissions again on the server.
5. Connect every control to an actual service action with permission and outcome handling, because a button with no operation behind it fails silently. Disable an action that needs a selection until there is one, and say why.
6. Make the right-click menu name its target, because acting on twelve selected rows when the person meant the one under the pointer is a silent mistake.
7. Bound every export by the service maximum and show the count before it starts, because an unbounded export loops through the whole corpus.
8. Highlight from the server's positions for the search that ran, for lexical, regular expression, and semantic hits alike, because hits found again in the browser mark words the engine never matched. Map offsets through the shown text so a match across formatting marks every part of it. Never guess highlight geometry; show unavailable positions in words.
9. Keep search hits and find matches in separate layers, because one layer's counter or navigation must not move another's.
10. Cap marks per document (default 2,000) and say when the cap is reached, because marking every hit in a very long document freezes the page.
11. Let the find box match inside hit marks, because a word already highlighted is still a word the person is looking for.
12. Encode names, comments, snippets, and highlights as untrusted text with safe emphasis, because engine output and source content can carry executable markup. Never expose tenant-scoped engine queries or authorization details in browser diagnostics.
13. Leave preview rendering, delivery and their safety to search-preview, because preview rules stated in several patterns drift apart. Escape every exported CSV cell that a spreadsheet would read as a formula, because an exported result opened in a spreadsheet runs it.
14. Show stale-continuation recovery and requery from the beginning, because grants, folders, publication, or generations can change between pages. Mark partial coverage, stopped work, lockdown, loading, empty results, and failures distinctly in words.
15. Keep source items read-only and tagging (index-tags) separate from embedding, because local edits diverge from the source and organization must not trigger spend. Show estimate, explicit send, progress, and repeat-send scope.
16. Show an orphaned comment anchor (index-comments) as orphaned, and remove erased quotations and citations, because an orphaned comment must not become a retained copy of purged content.

## Conformance

1. Given matches beyond the fetched page, server filtering returns them with correct scoped totals, and paging forward then back shows no repeated or missing rows.
2. Given a sort change while a page is loading, the late response is discarded.
3. Given a lexical phrase split across two formatting runs, a regular-expression search, and a semantic search, each hit is marked in its own style at the server's positions, and the counter matches the server's hit count.
4. Given more hits than the cap, the counter says how many are marked and the rest are reachable.
5. Given a find for a word that is also a search hit, the find box counts and reaches it, and the search counter does not move.
6. Given twelve selected rows and a right-click on an unselected row, the menu names that one row and acts on it alone.
7. Given changed grants during paging, the next page leaves out what the person can no longer see.
8. Given hostile names, comments and snippets, no script executes.
9. Given a result whose name starts with `=`, the exported CSV cell starts with a single quote.
10. Given tagging, no embedding runs; given confirmed send, progress describes its frozen selection.
11. Given a jump 15 pages ahead, at most 10 pages are fetched and the screen offers to narrow the search.

## Swap points

Replace presentation components, the grid, and the panel layout while keeping server-owned results, server positions for highlights, separate layers, explicit sends, escaped exports, and current authorization.

## Sources

- [Grid pagination](https://mui.com/x/react-data-grid/pagination/); [sorting](https://mui.com/x/react-data-grid/sorting/).
- [Server filtering](https://mui.com/x/react-data-grid/filtering/server-side/); [filter limits](https://mui.com/x/react-data-grid/filtering/multi-filters/).
- [Row grouping and tree data are paid grid features](https://mui.com/x/react-data-grid/row-grouping/).
- [CSV injection](https://owasp.org/www-community/attacks/CSV_Injection).

## Known gaps

Designed, not run: semantic passage bands, server positions for regular-expression hits, and the server-shaped grouped view. Exact highlights depend on available positions.
