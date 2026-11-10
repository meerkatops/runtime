---
id: index-extract-tika
title: The Tika adapter behind the extractor port, as a sandboxed server sidecar
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-extract, index-extract-ocr, index-file-type, big-red-button]
provides: [Extractor]
requires: [TikaServer]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Isolated parsing adapter

## Problem

A general-purpose parser handles hostile, complex formats. Running it beside worker credentials turns a parsing defect into a service compromise. Retrying indiscriminately conceals permanent failures, while stopping a client request can leave a remote parser consuming resources.

## Use when / Do not use when

Use when many file formats need text and metadata through one extraction boundary. Do not use when trusted normalized content makes general-purpose parsing unnecessary.

## Environment

A pinned parser service runs separately from the trusted worker. Each job has supervised parsing processes, bounded resources, and a rendering adapter for page geometry and positions.

## Solution

Implement the common extractor contract and inherit its entire conformance kit. Translate the service's structured markup into ordered blocks, zones, and boundaries inside the adapter. Preserve metadata without exposing native parser output downstream.

Pages and positions come from the admitted renderer, with mappings between extracted text and the displayed text layer. An unmappable passage remains searchable but has no fabricated page highlight.

Give each request isolated, cancellable execution ownership. Forked parser recovery improves availability, but it does not establish tenant isolation, network containment, or cancellation. The supervisor enforces these guarantees around the parsing service.

## Ports

- Extractor supplies the common validated content and inherited safety behavior.
- Parser service supplies bounded parsing and metadata to the adapter.

## Rules

1. Pin the parser image and adapter processing versions, because dependency changes can alter extraction and require re-derivation even when bytes match. Track OCR and renderer changes independently rather than treating one image digest as every derivative version.
2. Stream immutable input under measured size limits, because loading an entire untrusted file into worker memory defeats process isolation.
3. Parse only admitted output structure and reject malformed results, because parser-produced markup is still untrusted. Do not assume a layout line is a paragraph; checked fixtures establish structural meaning. See service documentation.
4. Bound characters, embedded resources, memory, and time, because restarting does not bound request work. Tika 2.x applies its recursive-output write limit across the document and embedded files; inspect truncation evidence rather than treating bounded output as complete. See service documentation.
5. Remove credentials and cloud identity, and deny outbound network, internal services, and metadata access, because restricting inbound callers does not stop exfiltration. Test actual egress enforcement separately; see network isolation documentation.
6. Supervise the job's real parser process locally or remotely and terminate its descendants on stop or deadline, because disconnecting the worker leaves server work alive. Avoid a shared-process kill that disrupts other tenants.
7. Keep forked parsing enabled and retry transient recovery within a bound, because Tika 2.x and later restart the child after crashes, timeouts, or exhausted memory. New calls can see temporary unavailability; every concurrent parse sharing that child can lose its socket. Hold unresolved work and reject permanent bad input. See service recovery.
8. Run the current Tika release and keep it patched, because older releases let crafted PDF forms read files or contact internal hosts. See Apache security advisories.
9. Map positions through the renderer and retain unavailable mappings explicitly, because parsing alone does not establish visual coordinates. Quarantine secret-bearing originals before preview, because sanitized extracted text does not sanitize rendered pixels.
10. Run every common extractor case as well as adapter-specific cases, because a successful text parse proves neither isolation nor preview safety. Record evidence per capability without promoting the whole adapter to proven.
11. Ask the service for XHTML and metadata in one call (`PUT /rmeta` with its default XML handler, the XHTML in `X-TIKA:content`; `/rmeta/html` returns HTML instead), so each file is parsed once, and find zones in it with an HTML parser, such as [cheerio](https://github.com/cheeriojs/cheerio) over domhandler, never with patterns over the text, because headings, tables, footnotes and slides are nested elements that a line-based match splits or merges. Hand the zones on as markup for the markdown step in index-content.

## Conformance

1. Given the common extractor kit, every inherited case passes, including safety, cancellation, positions, and secret-bearing previews.
2. Given malformed markup, an excessive embedded resource, or a parser crash, the job reports an explicit outcome and other jobs continue.
3. Given exhausted transient retries, work is held; given permanent invalid input, it fails without repeated retries.
4. Given simultaneous tenants and one stopped request, only that request's real parser work ends.
5. Given attempted external, internal, or metadata access, no parser child can connect or obtain credentials.
6. Given a parser, OCR, or renderer upgrade with unchanged bytes, affected output is regenerated and unmapped positions remain explicit.

## Swap points

Replace the parser release, supervisor, converter, renderer, or service transport while preserving the extractor contract, request ownership, isolation, and bounded recovery.

## Sources

- [Parser project](https://tika.apache.org/).
- [HTML parser for zones](https://github.com/cheeriojs/cheerio), MIT.
- [Service output, limits, and child recovery](https://cwiki.apache.org/confluence/display/TIKA/TikaServer).
- [Parser security advisories](https://tika.apache.org/security.html).
- [Network isolation](https://kubernetes.io/docs/concepts/services-networking/network-policies/#the-two-sorts-of-pod-isolation).

## Known gaps

General text extraction has narrower evidence than the full isolation and position contract. Renderer mappings and hostile-file coverage depend on the selected implementation and fixture corpus.
