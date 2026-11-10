---
id: index-extract-ocr
title: OCR with Tesseract through Tika, only on pages with weak digital text, merged page by page
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-extract, index-extract-tika]
provides: [OcrPass]
requires: [TikaServer, PageRenderer]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Selective page recognition

## Problem

OCR can replace accurate digital text with noise. Document-wide decisions miss scanned pages. Byte-only reuse misses changes in recognition models and language data.

## Use when / Do not use when

Use when documents or images contain scanned text, including mixed digital and scanned pages. Do not use when reliable digital text exists on every page.

## Environment

An isolated extraction service, a page renderer, an OCR engine, and pinned language data. Every stage obeys the common extractor's resource, network, position, and safety boundaries.

## Solution

Run digital extraction with automatic OCR disabled. Evaluate each page's text layer independently. Pages below a configured usable-text threshold become OCR candidates; render only those pages into bounded images and recognize them with the selected language.

Merge page by page. Strong pages retain their digital text; weak pages receive recognized text and available word positions. Preserve page order and record which pages used recognition. Image items enter the same page-oriented flow.

Version recognition behavior separately from its host parser: engine, language data, rendering, threshold policy, and normalization can each change results. Store their contribution to derivative identity so affected content can be selected for reprocessing without depending on a source change.

## Ports

- OcrPass selects weak pages and produces recognized text with available positions.
- PageRenderer draws bounded page images inside the extraction sandbox.
- Parser service supplies digital extraction and isolated recognition execution.

## Rules

1. Disable OCR explicitly for the digital pass, because Tika can recognize embedded Office images as well as standalone images. Request-level OCR skipping is available in Tika 2.x; do not infer it from the PDF strategy alone. See recognition documentation.
2. Decide per page using usable text rather than a document-wide total, because one strong page says nothing about a scanned neighbor. Treat the threshold as a configurable heuristic rather than a universal accuracy guarantee.
3. Preserve strong digital text and merge in page order, because recognition noise must not degrade pages that already contain reliable words. An empty OCR result does not justify fabricating text.
4. Select language per request and pin its data, because quality depends on the language model as well as the executable. Tika defaults to English and a 120-second Tesseract timeout; override deliberately so larger admitted pages do not unexpectedly fail. Record language and recognized pages. See recognition documentation.
5. Keep the engine, renderer, language data, and selection policy independently versioned, because replacing any one can require re-derivation with unchanged bytes. Skip only when both bytes and the required derivative versions match.
6. Deny outbound network, internal services, metadata access, and credentials, because recognition and rendering process untrusted bytes just like parsing. Enforce per-page time, image, output, and memory limits. Avoid enabling both inline-image and rendered-page OCR, because Tika runs both independently and duplicates work. See recognition documentation.
7. Cancel the actual OCR and rendering tasks on stop or deadline, because closing a service request does not guarantee computation ends. Isolate cancellation from other jobs and tenants.
8. Map word positions into the displayed page geometry or mark positions unavailable, because guessed boxes misrepresent the recognized passage. Search, copy, and preview use one normalized safe text layer.
9. Scan OCR text and rendered output before visibility, because a secret readable only in pixels can evade digital-text inspection. Quarantine unsafe originals or use verified redacted output; never preview an unredacted secret.
10. Count empty recognition explicitly and determine emptiness across every supported zone, because failure to recognize words is different from an unprocessed page. Bound retries and hold exhausted transient work rather than silently completing it.

## Conformance

1. Given reliable digital pages, no page enters OCR and its text remains unchanged.
2. Given mixed digital and scanned pages, only weak pages enter OCR and merging preserves page order.
3. Given an image with words or no recognizable text, the outcome is searchable content or an explicit empty result.
4. Given unavailable word boxes, highlights report unavailable geometry without guessing.
5. Given changed language data or selection policy with unchanged bytes, affected derivatives are regenerated.
6. Given a secret on a scanned page, no preview, export, search text, or diagnostic exposes it.
7. Given attempted network access, excessive image expansion, or cancellation during another tenant's work, isolation holds and only the owned task ends.

## Swap points

Replace the OCR engine, language data, weak-page policy, or renderer while preserving selective recognition, digital-text retention, independent versioning, safe positions, and common extractor conformance.

## Sources

- [Recognition controls, languages, and timeouts](https://cwiki.apache.org/confluence/display/TIKA/TikaOCR).

## Known gaps

Recognition quality depends on language, resolution, orientation, handwriting, and page layout. A text-count threshold can misclassify pages. OCR does not guarantee complete secret detection or exact visual positions.
