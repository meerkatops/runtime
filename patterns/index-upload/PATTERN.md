---
id: index-upload
title: A web page that uploads files, resumes them by byte offset, and stages them for intake
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [platform-api, platform-errors, platform-tenancy, index-intake, index-content, index-access, big-red-button]
provides: [Upload, UploadPage]
requires: [StagingStore, Database]
environment:
  language: []
  runs: both
  cloud_services: []
  local_needs: []
---

# Resumable upload

## Problem

An upload can join different files, trust a false digest, exceed its declared size, or complete without delivering its processing job. Browser success proves none of these guarantees.

## Use when / Do not use when

Use when people select or drop files for guarded intake. Do not use when a connector already provides the source content.

## Environment

A browser, authenticated streaming service, isolated staging, transactional database, intake, and durable queue relay.

## Solution

The page supports folder selection, relative paths, progress, cancel, retry, and resume with bounded concurrency. Completion means verified bytes and durable intake; searchable readiness is separate, and is shown per file as index-progress sets. Overall upload progress is weighted by bytes, not averaged over files.

A server-created session binds the authorized tenant and destination. It records file identity, declared size, verified progress, immutable storage version, expiry, and acceptance outcome. Storage locations use the shared tenant boundary.

Mediated streaming measures arriving bytes. Direct staging checks admission after storage accepts bytes, offering a softer size guarantee. Neither mode exposes unguarded read links.

## Ports

- **Upload:** Starts sessions, verifies completion, reports progress, and closes batches.
- **UploadPage:** Guides selection, transfer, cancellation, retry, and resume.
- **StagingStore:** Holds isolated upload bytes and exposes immutable versions for verification.
- **Database:** Keeps sessions, replay protection, intake acceptance, and durable delivery intent.

## Rules

1. **Authorize membership and destination on every operation,** because a location's shape or a caller-supplied tenant is not proof of ownership. Protect browser mutations and render filenames as text.
2. **Use the shared tenant storage boundary for partial and completed objects,** because custom upload prefixes escape tenant removal and accounting. Refuse unsafe names and traversal.
3. **Count arriving bytes when a hard cap is required,** because direct grants cannot enforce declared sizes. Direct staging needs budgets, actual-size verification, and continuous expiry cleanup; refused data never enters intake.
4. **Compute the byte digest, SHA-256 and BLAKE3 (index-content), in trusted code over an immutable stored version,** because blob properties and client metadata do not supply a storage-verified application digest. Recheck size and bind acceptance to that exact version. [Stored properties](https://learn.microsoft.com/en-us/rest/api/storageservices/get-blob-properties).
5. **Resume only with matching whole-file identity and verified prefix content,** because equal names, sizes, and times can join different versions. Without that proof, restart.
6. **Commit completion, intake changes, job, and outbox together under stable replay protection,** because a crash after completion must not lose the queue handoff. Retried completion returns the same receipt; the relay retries delivery safely.
7. **Keep transfer grants short-lived, scoped, and unable to read or list,** because leaked grants must not expose files. Azure create-only block upload and commit require storage API version 2026-04-06 or later; older versions require write permission, which also allows overwrite. [Grant scope](https://learn.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas), [block authorization](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block), [block commit](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list).
8. **Configure Blob-service CORS for the actual origin, upload method, and request headers,** because an unmatched preflight prevents browser transfer despite valid authorization. Send the signed target's exact required headers. [Cross-origin behavior](https://learn.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services).
9. **Check stops before admission and serve every byte read through a live lockdown gate,** because issued storage links remain capabilities until expiry. Bind read grants to the permitted representation and terminate active streams on lockdown.
10. **Quarantine detected secrets and block unredacted previews,** because scrubbing extracted text does not scrub original pages. Ordinary restore cannot release quarantine; require a fresh passing guard check.
11. **Retain originals needed for preview and recovery,** because uploaded bytes have no external source to refetch. Expire abandoned partials without removing accepted originals.
12. **Stream Next.js uploads through route handlers,** because Server Actions default to a 1 MB body limit. Use XMLHttpRequest upload events for byte progress. Filter storage creation events to complete blob writes or block-list commits, because a creation event alone need not mean complete bytes. Neither proves intake acceptance or search readiness; deliver processing subscriptions separately. [Framework limit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

## Conformance

1. Given another tenant's session or destination, all upload operations refuse access.
2. Given an oversized streamed body, transfer stops; direct staging refuses admission and cleans excess bytes.
3. Given forged digest metadata or changed stored bytes, completion refuses the object.
4. Given interrupted transfer and a different file, resume restarts; the same verified file transfers only its remainder.
5. Given duplicate completion and a relay crash, exactly one item and job exist and queue delivery recovers.
6. Given an issued read link and lockdown, it yields no bytes; changing its representation is refused.
7. Given secrets in original pages or a quarantine restore, unsafe previews remain blocked.

## Swap points

Replace page framework, staging store, or transfer mode while preserving verified identity, tenant isolation, guarded reads, and durable acceptance.

## Sources

- [Upload progress](https://xhr.spec.whatwg.org/#the-upload-attribute).
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3); [SHA-256, FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).
- [Storage commit events](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-event-overview) describe storage completion, not intake acceptance.

## Known gaps

Direct staging cannot promise an immediate hard byte cap. Browser hashing consumes time and memory. Unredacted originals require restricted access independent of safe preview availability.
