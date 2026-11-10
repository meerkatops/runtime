---
id: index
title: Index items end to end, inside tenant walls
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [platform-data-model, platform-tenancy, platform-api, platform-errors, index-intake, index-upload, index-file-type, index-extract, index-extract-tika, index-extract-ocr, index-content, index-markdown, index-access, index-search, index-search-opensearch, index-search-azure-ai, index-query-syntax, index-vectors, index-service, index-read, index-run-control, big-red-button, search-ui, query-builder, index-deploy-kubernetes, index-archives, index-translation, index-tags, index-comments, query-builder-visual, index-dedupe, search-preview, index-progress, index-workers]
provides: [Indexer, Searcher]
requires: [ItemSource, BlobStore, Database, WorkQueue]
---

# Index

## Problem

An index fails where its parts meet: accepted work strands, stale output replaces current content, or the engine becomes the only copy. Isolation and publication must hold throughout.

## Use when / Do not use when

Use when uploads or connected sources feed searchable files, messages, events, and attachments for isolated tenants. Do not use when a disposable search cache without content recovery meets the need.

## Environment

A transactional record store, tenant-scoped storage, durable work delivery, isolated extraction, and a replaceable engine. Identity services supply membership, revocation, and controlled administrator bootstrap.

## Solution

Intake records an item's origin, resolved destination, observed source version, byte identity, visibility, and required processing versions. It commits accepted work and a durable queue handoff together. Workers extract safe content into the record of truth; engines consume its ordered changes. The search syntax supplies engine-independent search meaning.

Each item has one current content version. Children retain stable identities and inherited access. Every chunk has its own identity within an item version and engine generation. Publication happens only after all required documents are queryable. Searches use only what the record of truth currently publishes.

Keep recovery material outside the engine. Disaster recovery restores records, originals, keys, and checkpoints together.

## Ports

- Indexer accepts sources and reports durable processing outcomes.
- Searcher answers authorized queries with scoped hits and honest counts.
- ItemSource supplies observations and content without changing the source.
- BlobStore retains tenant-scoped bytes and recovery material.
- Database owns identity, lifecycle, publication, and work state.
- WorkQueue reliably delivers committed work and supports leased execution.

## Rules

1. Verify credentials and tenant membership before selecting a tenant; bootstrap its first administrator through a controlled, auditable process, because a claimed tenant is not authority. Limit subsequent grants to the administrator's scope.
2. Bind a connection to the platform tenant, single-use session, external organization, and a person proven to administer that organization, because application access alone proves no human authority. See the consent source.
3. Keep ordinary work tenant-scoped. Cross-tenant claims and deployment stop checks use narrow audited routines whose non-login owner has required row-security bypass authority; callers cannot assume that role, because forced row security also binds table owners. See row-security and privileged-function sources.
4. Commit jobs with an outbox and keep its relay available independently of workers, because a committed job can otherwise strand when workers scale to zero. Notifications only wake the relay; reconnects and deadlines recover durable work. See the notification source.
5. Accept output only for current source and derivative versions, lease, and stop authority, because older jobs finish last. Lifting a stop never revalidates interrupted work. Skip extraction only when bytes and derivative versions match.
6. Positively enforce current publication for hits, totals, and facets, because cleanup cannot prevent a delayed or replayed engine write from recreating obsolete data.
7. Deny extraction outbound network, internal services, metadata access, and credentials; cancel the actual parsing task, because untrusted content can escape through dependencies.
8. Quarantine secrets before any preview or export; restore never bypasses fresh quarantine checks, because safe searchable text does not make original bytes safe.
9. A delivery gateway checks current access and lockdown, including issued links, because capabilities outlive grants. Require independent approval for destructive actions and deployment-wide reopening.
10. Recover coordinated backups and versioned encryption and signing keys, preserving removals, because rebuilding cannot recover lost authority. Rotate keys; alert on stranded jobs, feed lag, held work, and stop delays.

## Conformance

1. Given a foreign organization or unverified tenant choice, connection and access fail without disclosure.
2. Given a crash after acceptance with no workers running, the outbox still delivers the job.
3. Given forced row security, workers claim authorized work and observe deployment stops without ordinary cross-tenant reads.
4. Given multiple chunks and an obsolete write replayed after cleanup, every current chunk survives and no obsolete hit, count, or facet returns.
5. Given quarantine, lockdown, or coordinated restore, previews and issued byte links respect current restrictions and removed content stays hidden.
6. Given changed processing versions, unchanged bytes are re-extracted; a fully unchanged repeat skips extraction.

## Swap points

Replace components while retaining tenant authority, durable acceptance, positive publication, recovery, and each part's conformance checks.

## Sources

- [Consent authority](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent).
- [Forced row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- [Privileged functions](https://www.postgresql.org/docs/current/sql-createfunction.html).
- [Notification delivery](https://www.postgresql.org/docs/current/sql-listen.html).

## Known gaps

This composition does not provide legal hold or a redacted-rendering implementation. Recovery objectives and deployment capacity depend on the installation.
