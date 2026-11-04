---
id: connector-m365-graph
title: Microsoft 365 source adapter over Microsoft Graph
version: 0.2.1
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [connector, connector-auth-entra-fic, connector-delta-sync, connector-throttle]
provides: [Source]
requires: [Connection, ItemSink]
environment:
  language: []
  runs: unknown
  cloud_services: [Microsoft Graph v1.0, SharePoint, OneDrive, Microsoft Teams, Outlook mail, Outlook calendar]
  local_needs: [a Microsoft 365 test tenant with every source in the table]
---

# Microsoft 365 over Microsoft Graph

## Problem

Graph has traps that cost days each: ids that change when an item moves, a delta `$select` that rejects an
unpublished set of fields, a batch that returns 200 while its parts fail, a property that is not a property, inline
attachment bytes that come back empty above a size. This adapter writes them down once.

## Use when / Do not use when

- **Use when** the source is SharePoint, OneDrive, Teams channel files, Outlook mail or Outlook calendar.
- **Do not use when** the source is Teams messages without first checking current licensing and approval rules
  (they are protected APIs).

## Environment

The pattern does not say yet what language it is written in, or where it runs. It needs Microsoft Graph
v1.0 over SharePoint, OneDrive, Teams channel files, Outlook mail and Outlook calendar (Teams messages are designed
only). Running it needs a Microsoft 365 test tenant holding each source in the table, so each can be fetched end to
end.

## Solution

| Source | Lists | Items | Status |
|---|---|---|---|
| SharePoint (`Sites.Selected`) | drive delta per document library | `file` | Proven |
| OneDrive | drive delta per user drive | `file` | Proven |
| Teams channel files | the channel's backing SharePoint drive, reached through its `filesFolder` | `file` | Proven |
| Outlook mail | message delta per folder | `email` (+ children split out by the sink) | Proven |
| Outlook calendar | event delta per calendar | `calendar_event` + child `file` | Proven (series master only) |
| Teams messages | channel and chat messages | `chat_message` | Designed |

**General rules for every call:**

- **`/me`** for delegated tokens and **`/users/{id}`** for app-only. The literal `/users/me/` returns 400.
- **Send `Prefer: IdType="ImmutableId"` on every call,** from the lister and the fetcher. Otherwise ids change when
  an item moves between folders, and nothing matches.
- **URL-encode every id.** Event ids contain `+`, `/` and `=`.
- **Prove each `$select` field** against the v1.0 reference or a live response. A disallowed field returns 400,
  sometimes with an empty body. `@odata.type` cannot go in `$select`.
- **`$top` is rejected on some collections** (`/me/joinedTeams`, `/teams/{id}/channels`).
- **`$expand=childFolders` truncates.** Walk folders recursively.

**Drives (SharePoint, OneDrive, Teams files):**

- A deleted item comes back with a `deleted` facet.
- Change token: **cTag** (content), not eTag. **OneDrive for Business delta leaves out cTag on create and modify,**
  so GET each changed item by id to read it.
- **Download URLs are short-lived;** refresh per item. **Every source type needs its own download branch** (a
  missing OneDrive branch meant nothing was ingested).
- Stream large files to storage; multipart uploads use 8 MB parts.

**Mail:**

- Delta per folder; store a map from folder id to delta link.
- **The delta `$select` accepts only an unpublished subset.** Adding `internetMessageHeaders` or `sensitivity` made
  every scan return 400. Keep a minimal, proven `$select` on delta, then enrich each message through **`$batch`**
  (20 requests), checking every sub-response.
- **`sensitivity` is not a v1.0 message property.** Read MAPI extended property `0x36` with the type token `Integer`
  (not `Int`). Getting this wrong left the field null on every email for weeks.
- Bytes: `GET /messages/{id}/$value` returns the raw MIME → an `.eml` item. The sink splits attachments out of the
  MIME; the adapter does not fetch them separately.
- A folder's `totalItemCount` includes soft-deleted and non-message items; it is not an expected count.

**Calendar:**

- Delta per calendar (`/calendars/{id}/events/delta`), **keyed by mailbox user and calendar.**
- Body from `body.content`; `bodyPreview` is truncated to about 255 characters.
- **Events have no `$value`.** Build the event item from the JSON.
- Attachments: list their metadata, then stream each from `/events/{e}/attachments/{a}/$value`. **Never use inline
  `contentBytes`;** it caps at about 3 MB and larger files came back empty.
- Index the series master with a recurrence summary; store start and end with their time zones.

## Ports

| Port | Operation | Notes |
|---|---|---|
| Source (provided) | `resources(tenant)` → drives, folders, calendars | per the deployment's include/exclude rules |
| Source | `list(key)` → pages | via `connector-delta-sync` |
| Source | `fetch(item)` → byte stream or JSON | per-source download branch |
| Source | `map(providerItem)` → Item | kind set explicitly |

## Rules

1. Immutable ids on every call; every id URL-encoded.
2. A `$select` field is added only with proof.
3. Delta `$select` stays minimal; enrichment goes through `$batch` with per-sub-response checks.
4. Every source type has a download branch, tested.
5. Calendar attachments are streamed from `$value`, never read from `contentBytes`.

## Conformance

1. **Given** an item moved between folders, **then** its id is unchanged.
2. **Given** an event id containing `+`, `/` and `=`, **then** fetching it succeeds.
3. **Given** a mail folder, **then** the delta `$select` contains only proven fields and every enriched message
   carries sensitivity read from `0x36`.
4. **Given** a calendar attachment over 3 MB, **then** its bytes arrive whole.
5. **Given** each source in the table above, **then** at least one item is fetched end to end on the test tenant.
6. **Given** a OneDrive item created or modified, **then** its cTag is read by a GET by id.

## Swap points

- Which sources are enabled; SharePoint least-privilege or broad mode (from the auth pattern).
- Must not change: immutable ids, the proven-field rule.

## Sources

- Graph v1.0 reference: https://learn.microsoft.com/en-us/graph/api/overview
- Drive delta: https://learn.microsoft.com/en-us/graph/api/driveitem-delta
- JSON batching (20 requests): https://learn.microsoft.com/en-us/graph/json-batching
- Teams export and protected APIs: https://learn.microsoft.com/en-us/microsoftteams/export-teams-content
- Metered APIs: https://learn.microsoft.com/en-us/graph/metered-api-list

## Known gaps

- Not built: permissions and sharing metadata, version history, retention labels; Outlook item and reference
  attachments; calendar instance expansion (`/calendarView`); Teams messages.
