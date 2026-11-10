---
id: index-intake
title: Take items in safely, from an upload or a connector, only what changed
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-data-model, platform-errors, index-file-type, index-content, index-extract, big-red-button, connector-delta-sync]
provides: [Intake]
requires: [ItemSource, BlobStore, Database, WorkQueue, SecretScanner]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Intake

## Problem

Weak change detection misses content; hostile containers exhaust resources; incomplete scans hide surviving items; previews expose secrets removed from search text.

## Use when / Do not use when

Use when uploads or connectors supply files or structured items. Do not use when the source already supplies independently verified safe content with equivalent lifecycle guarantees.

## Environment

Transactional storage, tenant-scoped staging and originals, a durable queue, a pinned scanner, and isolated parsers. Sources supply scoped identity and explicit scan completeness.

## Solution

An accepted observation includes authorized destination, source organization and resource, stable identity, and retry identity. Commit observation, item change, job, and outbox together; a durable relay delivers until acknowledged.

Measure and hash immutable bytes: the byte digest of the stored original, taken as SHA-256 and BLAKE3 (index-content). Detect type, inspect containers, extract without execution, and inspect outputs before publication. Protected content gets metadata-only treatment. Quarantine unsafe content; block secret-bearing previews and exports.

Messages and containers become parents with stably identified children, as index-archives sets. Each stage records its progress for the person who added the files, as index-progress sets. Preserve connection-specific observations separately from canonical source identity, so losing one connection's view does not remove another's surviving item.

## Ports

- Intake accepts observations, evaluates safety, and controls quarantine release.
- ItemSource supplies scoped observations, immutable content, and scan completeness.
- BlobStore retains tenant-scoped staging and verified originals.
- Database commits acceptance and its durable work handoff atomically.
- WorkQueue delivers committed jobs with renewable ownership.
- SecretScanner identifies unsafe output without returning secret values to operators.

## Rules

1. Skip fetching only after comparing an unchanged provider-guaranteed content token; otherwise hash the bytes, because size, time, and token existence cannot prove equality. Archive checksums, sizes and CRC-32 values are hints, never proof: inside a changed archive, an entry is unchanged only when its bytes, inflated in the sandbox and hashed, equal its stored child's digest (index-archives). Skip extraction only when bytes and derivative versions match; enumerate stored items for backfills independently of source deltas.
2. Hash the immutable stored object in trusted code, because storage properties and client metadata do not prove the application's digest. Enforce hard upload limits while streaming; direct staging needs separate budgets and expiration cleanup. See storage properties.
3. Limit expanded bytes, entries, rows, nesting, time, and memory before expensive work; refuse overlapping entries, a central directory that disagrees with its local headers, and duplicate archive entries, because small containers can exhaust a worker. Never execute embedded content or follow remote references.
4. Quarantine secret-bearing or unsafe items before output, because scrubbing text cannot sanitize page images. Restore preserves quarantine and requires fresh passing inspection before publication; removal cannot bypass release checks.
5. Compare source version, processing target, lease, and stop state at commit, because older valid jobs can finish last. Retry idempotently, because delivery can repeat.
6. Retire only authoritative disappearances from completed scans, because access loss or an interrupted listing proves no source removal. Require explicit administrator approval for grants-only republication and default to a private destination.
7. Capture a mailbox baseline before its full scan and replay changes from it before advancing, because choosing the largest cursor encountered can miss edits during scanning. See mailbox synchronization.
8. Consume message edits and removals and reconcile event gaps, because a creation-time cursor misses changes to older messages. See message listing and events.
9. Treat an inaccessible observation as lost access, because a provider removal notification can also mean lost visibility. See change semantics.
10. Keep the last occurrence in a completed delta traversal, because an item can recur across pages. Scope message and attachment fetches to their mailbox owner, because application access has no implied mailbox. See delta and mailbox sources.
11. Give children stable identities, inherited access, removal behavior, and shared limits, because inserting an attachment must not reassign another child's anchors. Never remove content at the source.
12. Hold a file over a size threshold for an explicit approval instead of skipping it, and keep approvals across restarts, because a silent skip hides content from search and a fixed cap drops legitimate large documents. Stream an approved file into bounded on-disk parts, reserving each worker's memory before it reads; join parts at their boundaries so a word split across two still matches, and report the file as one item.

## Conformance

1. Given repeated acceptance or a crash before queue delivery, one logical job eventually runs.
2. Given equal size and time with changed bytes, extraction runs; changed derivative versions also force extraction.
3. Given hostile containers or a secret on a scanned page, limits hold and no unsafe preview, export, or indexed secret appears.
4. Given a quarantined item, restore cannot bypass fresh inspection.
5. Given a scan interruption, access loss, mailbox edit during scanning, old-message removal, or repeated delta observation, intake preserves the correct authoritative state.
6. Given an inserted attachment and an obsolete worker, existing child identity remains stable and obsolete output is refused.
7. Given a file over the size threshold, it is listed as waiting for approval, not skipped; once approved, it is searchable as one item, a word across a part boundary is found, and memory stays within budget.

## Swap points

Replace sources, scanners, caps, and storage while preserving atomic acceptance, change proof, quarantine, and provenance.

## Sources

- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3); [SHA-256, FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final); [archive hazards](https://www.usenix.org/conference/woot19/presentation/fifield); [archive format](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT); [entity prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html).
- [Storage properties](https://learn.microsoft.com/en-us/rest/api/storageservices/get-blob-properties).
- [Mailbox synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).
- [Message listing](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list); [events](https://developers.google.com/workspace/events/guides/events-chat).
- [Change semantics](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes); [delta ordering](https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0).
- [Mailbox content](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0); [attachments](https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0).

## Known gaps

Secret detection has false negatives. This pattern supplies neither antivirus classification nor redacted rendering.
