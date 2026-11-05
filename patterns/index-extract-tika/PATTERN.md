---
id: index-extract-tika
title: The Tika adapter behind the extractor port, as a server sidecar
version: 0.1.0
status: proven
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [index-extract, index-extract-ocr, index-file-type]
provides: [Extractor]           # an adapter of the port in index-extract
requires: [TikaServer]
---

# Extract with Tika

## Problem

Parsers crash, hang and run out of memory on real files, and a hostile file is written to make them. In-process
parsing takes the worker, and its credentials, down with it. Hand-written expectations of what a parser returns are
often wrong.

## Use when / Do not use when

- **Use when** you need text and metadata from many formats (PDF, Office old and new, HTML, text).
- **Do not use when** every file is already plain text or structured JSON.

## Solution

Tika runs as its own server process, a sidecar the worker calls over HTTP. The worker never parses. This adapter
implements the `index-extract` port and passes its kit; Tika's XHTML never leaves the adapter.

- **Text** comes back as XHTML (`/tika` with `Accept: text/html`), so structure survives: paragraphs, headings,
  lists, tables, headers, footers, footnotes. The adapter's ContentBuilder turns it into the port's sections,
  blocks and boundaries.
- **Metadata** comes from `/meta`: title, author, created and modified, content type, page count.
- **Limits** on each request: a per-file timeout, a write limit on extracted characters, a cap on embedded resources.
- **Failures:** Tika's server forks a child for parsing; on a crash, timeout or out-of-memory the child restarts and
  answers 503 meanwhile. The worker retries with backoff, then records the file failed with its reason.
- **Isolation:** the Tika container holds no credentials and has no cloud identity, and only the workers can reach it.

**Proven** on stock Tika: 10 PDFs, 67.2 MB, all extracted, 21.1–23.3 s across 4 runs on one
laptop, with Tika 3.2.3 pinned by digest.

## Ports

| Port | Operation | In → Out | Errors |
|---|---|---|---|
| Extractor (provided) | `extract(bytes, declaredName, limits)` | → the port's structured content | `too_large`, `timeout`, `extraction_failed`, `upstream_unavailable` |
| TikaServer (required) | `/tika`, `/meta`, `/detect/stream` | | 503 while the child restarts |

## Rules

1. **Tika never shares a process with credentials.** It runs in its own container, unreachable from outside
   (bound to localhost locally, an internal service in a cluster).
2. **Pin the image by digest;** the digest is the detector and extractor version on every record.
3. **Stream bytes in;** never hold more than one file whole unless a pass needs it again (a PDF goes up to three
   times: text, page count, OCR).
4. **Every request has a timeout and limits.** A hang is a failure with a reason, not a stuck worker.
5. **Retry 503 with backoff, then fail the file with its reason.** One bad file never stops the run.
6. **Do not invent Tika's output shape.** A PDF page's lines come back as one paragraph; a hand-written expectation
   of one block per line was wrong.
7. **Errors carry a code from the port's list, never a library message.**
8. **Tika 3.2.2 or later, and no network out of its container.** Tika 1.13–3.2.1 let a crafted XFA form inside a PDF
   read files or call internal hosts through XML external entities (CVE-2025-54988).

## Conformance

1. **Given** the `index-extract` kit, **then** every case passes.
2. **Given** the 10-PDF reference set, **then** 10 are extracted, each with a page count equal to the file's.
3. **Given** Tika is down, **then** the file fails `upstream_unavailable` and nothing is marked done.
4. **Given** a file that crashes or times out the parser, **then** it is retried, then recorded failed with its
   reason, and the other files finish.
5. **Given** the Tika container, **then** it has no credentials and no cloud identity.

## Swap points

- The Tika version and image; a different extraction server with the same port.
- Must not change: the sidecar boundary, the isolation, limits on every request, failure with a reason.

## Sources

- Tika (formats, current release): https://tika.apache.org/
- CVE-2025-54988, XXE through XFA in Tika's PDF parser, fixed in 3.2.2: https://nvd.nist.gov/vuln/detail/CVE-2025-54988
- Tika server (endpoints, HTML output, `/meta`, forked child, 503 on restart, write and embedded limits): https://cwiki.apache.org/confluence/display/TIKA/TikaServer

## Known gaps

- Proven on Tika 3.2.3; the 4.x line is not run.
- Measured only on 10 PDFs; Office, HTML and very large (800–1,000 page) files are not timed.
- No hostile-file corpus has been run yet.
