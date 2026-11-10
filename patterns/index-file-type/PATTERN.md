---
id: index-file-type
title: A file's type, declared and forensic, side by side, and the extractor and renderer each admitted kind uses
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-extract]
provides: [FileTypeDetector, KindRegistry]
requires: [DetectorService]
environment:
  language: []
  runs: both
  cloud_services: []
  local_needs: []
---

# File type

## Problem

Names and bytes can disagree. A renamed file reaches the wrong parser when its extension is treated as truth. A short prefix can miss the structure identifying a container format. Admitting a kind without a safe renderer creates previews that bypass intake protections.

## Use when / Do not use when

Use when extraction, filtering, or preview depends on file kind, or disguised content matters. Do not use when independently trusted content arrives already normalized and no byte-level decisions remain.

## Environment

A filename-blind, container-aware detector runs with bounded access to the complete immutable file. A registry associates admitted kinds with extraction and preview behavior.

## Solution

Keep the declared kind and the detected kind side by side. The declaration comes from the unchanged name and may be absent. Detection comes from bytes and container structure. Record the detector version so a changed detector can trigger deliberate reclassification.

Normalize equivalent extensions for comparison. An absent declaration is not a mismatch. Prefer a detected kind when one is available; otherwise use a declaration only within the intake safety policy. Detection uncertainty remains explicit.

Every admitted kind has an extractor and a preview strategy; how each is drawn safely is search-preview. An unsupported kind remains a searchable metadata-only item with a clear preview-unavailable explanation.

## Ports

- FileTypeDetector distinguishes declared kind, detected kind, uncertainty, and mismatch.
- KindRegistry selects approved extraction and rendering behavior for admitted kinds.
- DetectorService inspects complete bytes without receiving naming hints.

## Rules

1. Withhold the name and declared media type from forensic detection, because Tika refines results from these hints. Constructing its input from a file or path can populate a name automatically; remove that hint too. See detection documentation.
2. Use Tika's container-aware detector with its parser dependencies and TikaInputStream, because Core alone or an ordinary stream falls back to magic/name detection. Permit bounded whole-file inspection: ZIP and OLE containers need their internal structure, not just a prefix. See detection documentation.
3. Preserve both observations and the detector version, because overwriting a declaration hides discrepancies and makes reclassification unauditable.
4. Compare declarations only after recognized aliases are normalized, because equivalent spellings do not indicate disguise. Absence means unknown rather than mismatch.
5. Filter listings by declared extension only until bytes exist, because an empty input cannot establish forensic type. Do not present this preliminary selection as verified detection.
6. Route risky discrepancies through intake inspection, because a benign extension does not make embedded executables or active content safe. Detection identifies a kind; it does not certify safety.
7. Admit preview behavior explicitly and preserve intake restrictions, because rendering original bytes can expose secrets absent from extracted text. Quarantine unsafe content or use verified redacted output; block previews when neither is safe.
8. Sanitize markup and deny scripts, remote loads, outbound network, internal services, metadata access, and credentials during conversion and rendering, because apparently passive content can trigger active dependencies.
9. Count unidentified and unsupported items with explicit outcomes, because silently skipping them makes coverage appear complete. Keep unavailable source facts unknown rather than inventing dates or types.

## Conformance

1. Given page-format bytes with an image extension, detection reports the true kind while retaining the declaration and discrepancy.
2. Given synonymous extensions or no extension, detection creates no false mismatch.
3. Given packaged documents needing container inspection, the detector identifies each admitted kind without a naming hint.
4. Given random or oversized bytes, the outcome is explicit and resource limits hold.
5. Given a listing without bytes, preliminary filtering uses names and performs no empty-file detection.
6. Given hostile markup or a secret-bearing document, preview neither executes content nor exposes unsafe original material.
7. Given a renderer or detector change, recorded versions identify the affected items without changing their source identity.

## Swap points

Replace the detector, converter, renderer, registry implementation, and admission policy while preserving independent observations, explicit uncertainty, bounded inspection, and safe preview behavior.

## Sources

- [Detection hints and container inspection](https://tika.apache.org/3.2.3/detection.html).
- [Detection service behavior](https://cwiki.apache.org/confluence/display/TIKA/TikaServer).

## Known gaps

Type detection cannot establish that a file is harmless. Some kinds have metadata-only support. Preview fidelity and detection coverage depend on the admitted formats and the chosen adapters.
