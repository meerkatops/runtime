---
id: connector-google-workspace
title: Google Workspace source adapter
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector, connector-auth-google-keyless, connector-delta-sync, connector-throttle]
provides: [Source]
requires: [Connection, ItemSink]
environment:
  language: []
  runs: unknown
  cloud_services: [Google Drive API, Gmail API, Google Calendar API, Google Chat API, Directory API]
  local_needs: []
---

# Delegated source adapter

## Problem

A moving inventory can skip mail changes; creation-time message filters miss edits and removals. Lost access can also look like source removal, while native documents lack the binary content evidence a file connector expects.

## Use when / Do not use when

Use for delegated organization files, mail, calendars, and message spaces. Do not use when fetching one shared link meets the need.

## Environment

A verified keyless connection, per-user authorization, durable observations and checkpoints, shared throttling, and the common intake boundary.

## Solution

Enumerate approved users and resources within the verified organization. Scan shared drives once per organization, while retaining each principal's observations. Capture a change baseline, complete inventory, replay changes, and only then declare the resource synchronized.

Map downloaded files, exported documents, decoded mail, calendar series, and messages into the same resolved intake handoff. Preserve source scope, stable identity, relationships, and approved access. Keep provider behavior inside the adapter.

## Ports

- **Source:** Enumerates approved resources and supplies mapped content and byte streams.
- **Connection:** Supplies organization-bound authorization for each represented user.
- **ItemSink:** Accepts resolved items through shared guarded intake.

## Rules

1. **Keep a starting mail-history baseline and replay it after inventory,** because taking the largest marker seen during a changing scan skips edits to messages already read. History is typically available for at least a week but can disappear sooner; an unavailable starting marker requires full reconciliation. [Mail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).
2. **Use message update and removal events plus reconciliation,** because a creation-time listing cannot discover changes to older messages. Renew subscriptions and recover gaps from retained events or a complete comparison. [Listing limits](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list), [message events](https://developers.google.com/workspace/events/guides/events-chat).
3. **Separate access loss from confirmed source removal,** because a change-feed removal can mean either. Withdraw that observation and restrict its access without retiring an item still visible through an authoritative connection. [Change meaning](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes).
4. **Persist inventory phase separately from its starting cursor,** because a saved start token does not prove that listing completed. Commit progress only after durable intake and all child work. [File changes](https://developers.google.com/workspace/drive/api/guides/manage-changes).
5. **Fetch and hash exports without documented strong byte-change evidence,** because native documents need not expose a binary checksum. Size, time, and a generic revision label are insufficient proof. [File metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files).
6. **Hold oversized exports visibly,** because Drive export caps output at 10 MB. Do not assume export links bypass that ceiling; an alternative needs a documented guarantee. [Export limit](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export), [download options](https://developers.google.com/workspace/drive/api/guides/manage-downloads).
7. **Use resource-scoped shared-drive listing and detect incomplete searches,** because searching all drives can report an incomplete search. Explicitly enable shared-drive support and include shared-drive items; never retire from an incomplete result. [Shared-drive support](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).
8. **Finish all calendar pages before saving incremental progress,** because Calendar returns the sync token only on the last page. Incremental calls include deleted events and forbid suppressing them; omit text search, time bounds, update bounds, ordering, and extended-property filters. Keep other options unchanged and restart on expiry. [Calendar synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [incremental restrictions](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
9. **Use source message identity within organization and space,** because per-user indexing duplicates messages. Chat defaults to 25 messages per page and caps pages at 1,000; follow continuation even after a short page. Application reads require administrator approval and return only public messages. User reads need chat.messages.readonly for this read-only adapter. [Message listing](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list).
10. **Decode complete mail and link calendar attachments to their source files,** because raw Gmail is base64url-encoded and unavailable with gmail.metadata; use gmail.readonly. Copying linked files loses provenance. Skip extraction only when bytes and derivative targets match. [Mail formats](https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format), [event attachments](https://developers.google.com/workspace/calendar/api/guides/create-events#add_drive_attachments).

## Conformance

Pass the connector, authorization, delta, and throttle cases as well as these adapter cases.

1. Given mail changed during inventory, baseline replay captures that change.
2. Given an old message edited or removed, event handling or reconciliation updates the index.
3. Given expired event history, reconciliation completes without assuming absence means removal.
4. Given one lost observation and one valid observation, only the affected access is withdrawn.
5. Given a native document without content proof, its bytes are compared; an oversized export is visibly held.
6. Given a message seen by several users or a linked attachment, canonical identity remains singular.
7. Given a changed derivative target, unchanged bytes are reprocessed independently of source deltas.

## Swap points

Change enabled sources or export format while preserving observation meaning, inventory replay, complete content, and common intake.

## Sources

- [Change pagination](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list).
- [Directory enumeration](https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list).

- [Gmail read scopes](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get).

## Known gaps

Delegated visibility cannot prove organization-wide absence. Export ceilings and retained event history bound recovery. Source permission replication needs complete sharing evidence and identity mapping.
