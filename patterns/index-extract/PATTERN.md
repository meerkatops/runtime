---
id: index-extract
title: One sandboxed extractor port, from a file's bytes to structured content, preview pages and positions
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [platform-errors, index-file-type]
provides: [Extractor, ContentBuilder, Previewer]
requires: []
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Extract

## Problem

Extractor-specific output couples every downstream consumer to one parser. Hostile files can hang a worker, reach sensitive services, or produce unsafe previews. Guessed positions put highlights on words the search never matched.

## Use when / Do not use when

Use when content needs stable structure, replaceable extraction, searchable zones, or reliable preview positions. Do not use when trusted normalized text without previews fully meets the need.

## Environment

Parsers, converters, OCR, and renderers run in isolated, resource-limited tasks. A trusted parent validates their output and passes safe common content to storage.

## Solution

The extractor accepts immutable bytes and produces ordered content independent of its native output. Content describes text zones, blocks, sentence and paragraph boundaries, metadata, pages, and available positions. Include slide and sheet content as well as body text, headers, footers, footnotes, and comments.

Normalize text consistently while retaining mappings to the displayed source. A preview describes page geometry, rotation, text, and positions. Search, in-document search, copied passages, and highlights share the same safe text layer. Where a location or mapping is unavailable, say so instead of inventing coordinates.

**The sandbox.** The worker starts a child process for each file a parser, unpacker, renderer or OCR step reads. It hands the child the bytes as one read-only, seekable descriptor, because a zip's directory sits at the end of the file and a pipe cannot seek. The child opens nothing else and writes nothing but its answer, in length-prefixed frames under a byte cap; the worker, not the child, writes to storage. Before reading a byte, the child sets its own limits and acknowledges them: memory (default 512 MiB), CPU time, no new descriptors, no new processes; it refuses to run as root, because root can raise its own limits. The worker enforces a wall-clock deadline that scales with the admitted size (default for parsers 60 seconds plus 1 second per 50 MiB; an unpack uses index-archives' deadline instead; OCR is bounded per page) and kills the child's whole process group at the deadline, a cap or any early return. On Linux, also deny the child network, extra system calls and the file system with seccomp and namespaces. Every way a child can fail (a limit, a crash, the deadline, an endless stream, a bad frame) is that file's failure, with its reason; its bytes are kept and the scan goes on.

Every adapter passes one versioned, redistributable fixture kit with independently checked expected content, position examples, safety cases, and meaningful nonempty inputs.

## Ports

- Extractor produces validated common content from immutable bytes.
- ContentBuilder translates one parser's native output into common content.
- Previewer supplies authorized safe pages, text, and available positions.

## Rules

1. Keep native parser output inside its adapter, because exposing it couples storage, search, and previews to a particular implementation.
2. Preserve zones and ordered blocks, because text in a footnote, slide, or sheet is still searchable content. A document is empty only when every supported zone lacks usable text.
3. Use canonical Unicode composition and count text offsets consistently as scalar values, because equivalent text and supplementary characters otherwise shift matches. See normalization documentation.
4. Enforce memory, output, expansion, and time limits on every child, with the deadline scaled to the admitted size, because application deadlines alone do not stop resource consumption, and a fixed short deadline fails every large legitimate file. Validate returned structure before trusting it.
5. Deny outbound network, internal services, cloud metadata, credentials, and identity mounts for every extraction task, because ingress restrictions do not prevent parser exfiltration. Enforce and test egress separately; see network isolation documentation.
6. Cancel the actual parsing, conversion, rendering, and OCR processes owned by the job, because closing a worker's request can leave remote computation running. Cancellation must not terminate unrelated tenants' work.
7. Treat page geometry as an explicitly mapped coordinate space, including crop and rotation, because different viewers otherwise place identical highlights differently. Unavailable positions remain unavailable.
8. Verify secret safety across text and rendered pixels, because removing a secret from extracted text cannot remove it from original page bytes. Quarantine unredacted material or use verified redacted rendering; block unsafe previews and exports.
9. Resolve current item access and the requested action on every content delivery, because a search filter cannot authorize a byte read. Keep original export distinct from preview access and make already-issued links obey lockdown.
10. Leave how the browser shows rendered output to search-preview, because preview rules stated in several patterns drift apart. Scope render caches to tenant, rendered content, processing version, and page; include caches in removal and purge, because shared or retained renders can leak obsolete content. Report preview unavailable when required originals are absent.
11. Reuse output only when both bytes and derivative versions match, because parser, OCR, normalizer, and renderer changes can alter identical input. Exhausted transient work stays held for an explicit recovery decision; permanent invalid input fails without repeated retries.

## Conformance

1. Given the shared fixture kit, every adapter returns the checked content and preserves footnote, slide, and sheet distinctions.
2. Given equivalent Unicode text, emoji, rotation, and cropping, highlights and copied paragraphs map correctly or explicitly report unavailable positions.
3. Given hostile output, excessive expansion, a hanging child, or a stop, validation or limits end the job without disturbing another tenant.
4. Given an attempted external, internal, or metadata connection, the isolated task cannot connect.
5. Given a secret visible only in rendered pixels, no preview or export exposes it.
6. Given a revoked grant, lockdown, or erased item, content delivery and cached pages obey the current restriction.

## Swap points

Replace parsers, renderers, converters, OCR engines, and limits while retaining common content meaning, exact-or-unavailable positions, isolation, and the shared conformance kit.

## Sources

- [Unicode normalization](https://unicode.org/reports/tr15/).
- [Independent ingress and egress isolation](https://kubernetes.io/docs/concepts/services-networking/network-policies/#the-two-sorts-of-pod-isolation).

## Known gaps

Position availability and preview fidelity vary by format. This pattern supplies no redistributable fixture corpus or redacted renderer. A sandbox reduces exposure without proving parser correctness.
