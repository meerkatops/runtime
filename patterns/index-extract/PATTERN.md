---
id: index-extract
title: One extractor port, from a file's bytes to structured content
version: 0.1.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: []
provides: [Extractor, ContentBuilder]
requires: []
---

# Extract

## Problem

Every extractor returns its own shape: XHTML from one, JSON from another, page text from a third. When the content
store and the engines read that shape, the extractor can never be replaced without rewriting them. Expectations
written by hand about what an extractor returns are often wrong, so a replacement passes its own tests and still
indexes different text.

## Use when / Do not use when

- **Use when** more than one extractor may run behind the pipeline, now or later, or you will compare two.
- **Do not use when** one extractor is fixed for good and nothing downstream will outlive it.

## Solution

One port, one operation: a file's bytes and its declared name go in, one **structured content** comes out. Whatever
the extractor speaks inside (Tika's XHTML, its own parser's tree) stays inside its adapter; nothing past the port
reads it.

| Part of the content | What it holds |
|---|---|
| File type | declared extension, detected type, and (optional) the forensic type and mismatch (`index-file-type`) |
| Sections | body, header, footer, footnote, comment, slide, sheet, each kept apart and searchable as its own field |
| Blocks | heading, paragraph, list item, table cell, OCR block, in reading order, each in one section |
| Boundaries | where each sentence and each paragraph starts and ends in the text, so `/s` and `/p` can be checked |
| Metadata | title, author, created, modified, content type, page count |
| OCR | whether OCR ran (`index-extract-ocr`), and on which pages |

Text is normalized to Unicode NFC before it leaves the port. The **ContentBuilder** turns an adapter's raw output
into this shape; each adapter ships its own builder behind the port.

**The conformance kit** below is the port's, not an adapter's. Every implementation passes the same cases on the
same fixture set, with the same expected content: the Tika adapter (`index-extract-tika`) today, any other extractor
later. The kit's cases and expected content never change for an adapter.

**Proven:** the shape and cases 1–6 ran on stock Tika. The kit as one shared set is designed.

## Ports

| Port | Operation | In → Out | Errors |
|---|---|---|---|
| Extractor (provided) | `extract(bytes, declaredName, limits)` | → structured content | `too_large`, `timeout`, `extraction_failed`, `unsupported_type`, `upstream_unavailable` |
| ContentBuilder (provided, per adapter) | `build(raw)` | the adapter's own output → structured content | `extraction_failed` (empty body) |

## Rules

1. **Nothing past the port reads an extractor's own format.** The content store, the feed and every engine take
   only the structured content.
2. **Every section is content.** Counting only the body refused every presentation and spreadsheet.
3. **Empty body means no text in any section's blocks;** a page title is not body. A title-only HTML file once
   passed the empty check.
4. **Normalize to NFC inside the port,** so two extractors give equal text for equal files.
5. **Every call has limits and a timeout;** a hang is `timeout`, never a stuck worker.
6. **Errors carry a code from the list,** never a library message.
7. **The fixture set and its expected content are versioned with the kit.** Expected content comes from a run,
   checked by a person, never written by hand: a hand-written "one block per line" was wrong.

## Conformance

The kit every Extractor implementation must pass:

1. **Given** the reference fixture set, **then** each file's content equals its expected content (sections, blocks,
   boundaries, metadata).
2. **Given** a docx with a footnote, **then** the footnote's text is in the footnote section, not the body.
3. **Given** a pptx with one slide of text, **then** it is extracted, not refused as empty.
4. **Given** a text PDF page with several lines, **then** those lines form one paragraph.
5. **Given** `é` composed in one file and decomposed in another, **then** the two contents hold equal text.
6. (with `index-file-type`) **Given** a PDF named `report.jpg`, **then** the content's detected type is `pdf`.
7. (with `index-extract-ocr`) **Given** a scanned PDF, **then** OCR is recorded true and each page is one OCR block.
8. **Given** a file over the size limit, a file that hangs the parser, and random bytes, **then** `too_large`,
   `timeout` and `unsupported_type`, and nothing else in the run is stopped.

## Swap points

- The extractor behind the port, its builder, its limits' values.
- Must not change: the content's shape, NFC, the error codes, the kit and its expected content.

## Sources

- Unicode normalization forms (NFC): https://unicode.org/reports/tr15/

## Known gaps

- The kit's fixture set is not yet published with the pack; until it is, case 1 cannot be run by others.
- Cases 7–8 come from the OCR and intake patterns; they have not run together as one kit.
