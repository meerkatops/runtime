---
id: index-read
title: Show a person an indexed document whole and exactly as written
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-content, index-access, index-search, index-service, index-intake]
provides: [DocumentReader]
requires: [ContentStore, ItemResolver]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Read

## Problem

A person reviewing documents through an index needs to see what the document says, exactly. An index built for search often shows it badly. Normalization meant for matching leaks into what the reviewer sees, so dashes, quotes and markup change, and a quoted passage no longer matches its source. Long documents are cut short without saying so. Nested sections show the same text twice and make a document look longer than it is.

## Use when / Do not use when

Use when people review documents through the index, not only search them. Do not use when the index only returns hits and reviewers always open the original elsewhere.

## Environment

A content store that retains each item's source text with offsets back to it, and the shared access check for every read.

## Solution

Search and read are separate paths. Search matches on normalized text; a read returns the retained source characters, with an exact source form beside the plain text. A long document is read whole, page by page. An outline gives each section's own size beside its total, so a reviewer sees a document's real length and can move through it without overlap. A list of every readable item lets a reviewer see what exists without searching for it. A translated item reads as its original; its machine translation is returned only when asked for, labeled as such (index-translation). How the preview pane draws a document is search-preview.

## Ports

- **DocumentReader:** lists items, outlines a document, and reads a document or a section, in plain text or exact source form, page by page, after the access check.

## Rules

1. **Normalize only for matching; show the retained source text on read,** because normalization that leaks into reads swaps dashes, curly quotes and ellipses for plain ones and changes what a reviewer quotes.
2. **Offer an exact source view beside plain text,** because a plain view drops markup (emphasis, code marks, table pipes), and an escaped table pipe can come back broken.
3. **Give each outline section its own size, the text not in a child, beside its total,** because a section holds its children, and showing parent and children together repeats text and overstates length.
4. **Show a whole document page by page, and never cut it short without saying so,** because a reviewer who cannot tell a document was truncated draws conclusions from part of it.
5. **List every readable item with its title, location, size and when it changed,** because without a list reviewers search just to find what exists.
6. **Check access on every read and list,** because a list or an outline must not reveal what a single read could not. See index-access.
7. **Hold a very large file for approval instead of refusing to show it, and read it in bounded parts,** because a size block hides content people need. See index-intake.

## Conformance

1. Given text with em and en dashes, curly quotes, non-breaking spaces, emoji, CJK and HTML entities, a read shows each character as the source has it.
2. Given markdown with emphasis, code marks and a table holding an escaped pipe, the source view shows it exactly.
3. Given nested sections, the sum of every section's own size equals the document's size.
4. Given a document longer than one page, paging shows all of it, and nothing is shortened without saying so.
5. Given the item list, every listed item opens.
6. Given an item the reviewer may not see, a read, a list and an outline each leave it out.

## Swap points

Replace the store, the viewer and the page size, while keeping exact source characters, whole documents and own section sizes.

## Sources

- [Unicode normalization forms](https://unicode.org/reports/tr15/), for why matching forms must not replace source text.
- [CommonMark: backslash escapes](https://spec.commonmark.org/0.31.2/#backslash-escapes); [table extension](https://github.github.com/gfm/#tables-extension-).

## Known gaps

Proven: exact source characters on read and each section's own size. Designed, not run: the exact source view for markdown.
