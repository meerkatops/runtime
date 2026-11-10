---
id: connector-m365-graph
title: "Microsoft 365: Outlook mail, Calendar, Teams files, OneDrive and SharePoint"
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [connector, connector-auth-entra-fic, connector-delta-sync, connector-throttle, index-archives]
provides: [Source]
requires: [Connection, ItemSink, KeyStore]
environment:
  language: []
  runs: cloud
  cloud_services: [Microsoft Graph v1.0, Microsoft Entra ID, Outlook mail, Outlook calendar, Microsoft Teams, OneDrive, SharePoint]
  local_needs: [a Microsoft 365 test tenant with mail, recurring meetings with attachments, a team with standard, private and shared channels, and files shared in chats]
---

# Microsoft 365

## Problem

Microsoft Graph looks uniform and is not. Mail ids change when a message moves. A delta request that selects one field its delta does not allow fails with an empty error. An expanded folder list stops short with no next link. A calendar delta that is not bounded is beta only. An event has no MIME form. A stored delta link reused for another user leaks one person's calendar into another's. Teams files live in several sites and in people's OneDrive, and a connector that asks for chat permissions to reach them asks for far more than it reads. A refresh token is replaced on every use, and a replacement not saved leaves the client holding one it was told to discard.

## Use when / Do not use when

- **Use when** indexing Outlook mail and calendars, Teams files, OneDrive and SharePoint from one Microsoft 365 organization.
- **Do not use** for Teams chat or channel messages: this pattern reads files only. Do not treat a file permission as permission to read mail or other protected resources.

## Environment

Microsoft Graph v1.0 over HTTPS, a verified connection (connector-auth-entra-fic for application access), shared delta and throttle handling, and durable intake. Locally, a test tenant holding every source.

## Solution

**Two access models, kept apart.**

- **Delegated, a person's own sources.** Authorization code flow with PKCE and OpenID Connect, asking for `offline_access` so a refresh token is returned. Verify the ID token's signature, a tenant-specific issuer, a tenant id that matches the issuer, and the nonce. A delegated connection reads only the signed-in person's own mailbox, calendar and OneDrive, and the sites and teams that person can reach.
- **Application, an organization's sources.** Client credentials with a federated credential assertion and no client secret (connector-auth-entra-fic). Graph's access tokens are opaque to a client, so never parse one to decide what it may do: confirm the application's granted permissions before the first sync with a test read of each enabled source, and treat a forbidden answer as a missing grant, not a retryable failure. Every mail and calendar read names its mailbox owner.

For delegated access, request the narrowest scope set for each call (mail calls ask only for mail read, files calls only for files read), because a narrow token limits what a leaked one can read. An application token is requested for the resource's default scope and carries every application permission granted, so application access is narrowed where it is granted: selected sites and only the sources enabled. Before any sync, request tokens only from the connection's own tenant authority, and for delegated access confirm that the verified ID token's tenant id is the connection's organization; refuse on a mismatch, and never read an access token to find out.

**Mail.** One message is one item.

- Send `Prefer: IdType="ImmutableId"` on every mail call, so ids survive moves inside the mailbox.
- Walk folders: list the top level page by page, then each folder's child folders page by page wherever it reports children, to a depth bound. Never expand child folders inline, because an expanded collection is not paged.
- Run delta per folder, one cursor per folder, with a fixed, tested property selection, because a delta request selecting a property outside what its delta supports fails as a whole. Fetch everything else by enrichment: per-message reads sent in batches of 20, every part inspected, failed parts retried on their own after each part's own `Retry-After` (connector-throttle).
- Read sensitivity as the MAPI single-value extended property `Integer 0x36`, because it is not a v1.0 message property.
- Thread key, first present: the conversation id; else the first id in References; else In-Reply-To; else the message's own internet message id. Bound the References header read.
- Record each message's internet message id. Identity stays per mailbox: a removal in one folder's delta removes that folder's observation, and the mailbox's message is retired only when no folder of that mailbox still observes its internet message id. Copies of one message in other mailboxes are separate items, grouped by that id for display.
- Fetch the raw MIME through the message's `$value`, and make attachments children by parsing that MIME (index-archives); a nested message keeps its parent's context. A reference attachment is a link, recorded as such, never fetched as bytes.

**Calendar.** One event is one item.

- Use v1.0 calendar-view delta on the primary calendar, in bounded windows, one cursor per user and window. It rejects property selection, expansion, filtering, ordering and search; ignore removals outside the window.
- Key each stored delta link by user and window, and discard a stored link whose user is not the one being synced.
- Recurring meetings: a calendar view returns occurrences and exceptions, each naming its series master; fetch the master by that id. The series master is one item holding its pattern; each exception is its own item linked to the master; plain occurrences are dates on the master. The iCalendar uid identifies one meeting across the organizer's and attendees' calendars (and differs per occurrence), so copies are grouped by it while each copy stays its own observation.
- An event has no MIME form: build its text from the full event, with start, end and their original time zones, because a calendar-view row is not the whole event.
- List an event's attachments only when it has some, encoding every id placed in a path. Fetch each file attachment's bytes from its raw `$value`, not the inline content. If listing an event's attachments fails, do not advance that window's cursor, because a cursor past the event loses its attachments.

**Teams, files only.** Never request chat or channel-message permissions; no message is read.

- List joined teams and channels with no page-size option, because joined-team listing takes no query options and channel listing takes only filter and select.
- A team's standard channels are folders in the team's group drive; match each channel to its folder by the channel's files folder.
- Private and shared channels each have their own SharePoint site: sync each as its own drive, from its files folder. Resolving a files folder needs Files.Read.All as its least-privileged permission; never add it silently to a selected-site identity.
- Files shared in one-to-one and group chats are stored in the sharer's OneDrive: cover them through that person's OneDrive.
- A team that answers forbidden is marked access revoked; one that answers not found is marked gone. Both are observation loss, never source removal by themselves (connector).

**OneDrive and SharePoint.** Drive delta per drive; keep the last occurrence of a repeated item across the whole round; renaming a folder does not return its descendants, so track them by id. Business drives omit the content-change token on creation and modification, so enrich or hash before skipping bytes. Folders and packages are not items. Look up a site by host and path given in the connection, never by a fixed host. Download through the content redirect or the item's short-lived pre-authenticated URL, refreshed when it expires.

**Every delta.** A `410 Gone`, a resync-required answer or an expired Outlook delta token means the cursor is dead: drop it, run a complete inventory, then replay, as connector-delta-sync sets. Throttling follows connector-throttle: honor `Retry-After` up to a cap, else back off with jitter; other client errors are contract failures, not retried.

**Refresh and reauth.** Refresh before expiry by a margin. Each refresh returns a new refresh token: encrypt and persist it (KeyStore) before using the new access token, then delete the old one. `invalid_grant` or `interaction_required` on refresh puts the auth record and every connection under it into a reauth-required state: sync stops, items stay, and the person is asked to sign in again. Admin consent is recorded only after an application token has read the organization through Graph (connector-auth-entra-fic rule 4).

## Ports

- **Source:** discovers approved mailboxes, calendars, teams, drives and sites, and supplies mapped items, children and byte streams.
- **Connection** (required): authorization bound to the verified organization and principal, delegated or application; reports reauth-required.
- **ItemSink** (required): accepts items and parents through shared intake.
- **KeyStore** (required): encrypts refresh tokens within their tenant boundary.

## Rules

1. **Send the immutable-id preference on every mail call and encode every id placed in a path,** because ordinary mail ids change on moves, and ids carry characters that break a path. Immutable ids hold only inside one mailbox.
2. **Recurse child folders page by page; never expand them,** because an expanded collection has no next link and stops short.
3. **Keep mail delta to a fixed, tested selection and enrich the rest in inspected batches of 20,** because delta fails whole on one unsupported property, and a successful batch can hold failed parts.
4. **Read mail as raw MIME and make attachments children from it,** because the JSON body is not the message, and attachments parsed once keep stable ids.
5. **Retire a mailbox's message only when no folder of that mailbox still observes its internet message id, and keep copies in other mailboxes as their own items,** because one message reached through two folders has different Graph ids, and identity includes the owning mailbox.
6. **Use bounded v1.0 calendar-view delta per user and window, and discard a link stored for another user,** because unbounded event delta is beta, and a reused link syncs another person's calendar.
7. **Build event text from the full event with its time zones, and hold the cursor when an attachment listing fails,** because an event has no MIME form, and a cursor past a failed event loses its attachments.
8. **Group meeting copies by iCalendar uid and keep exceptions as their own items,** because the organizer's and attendees' copies are one meeting, and an exception can change the subject, time or attendees.
9. **Never request chat or channel-message permissions; reach Teams files through drives and the sharer's OneDrive,** because the files live there, and a permission asked for is a permission an administrator must trust.
10. **Sync private and shared channels as their own sites,** because their files are not in the team's drive.
11. **Drop a dead delta cursor and run a full inventory,** because a reset or expired token cannot be resumed and its gap cannot be replayed.
12. **Persist a rotated refresh token before using its access token, then delete the old one,** because the identity platform expects the old token to be discarded on every use, and a new token lost to a crash leaves only one the client was told to throw away.
13. **Put every connection under an auth record into reauth-required on `invalid_grant` or `interaction_required`,** because each of them fails the same way until the person signs in again.
14. **Confirm granted application permissions by a test read, and the organization by the tenant authority and the verified ID token, never by parsing an access token,** because Graph tokens are opaque to clients, and a tenant mismatch reads the wrong organization.
15. **Do not use folder item totals as expected message counts,** because they count other Outlook item types.

## Conformance

Pass the connector, authorization, delta and throttle cases, and these.

1. Given a message moved between folders, it keeps its id.
2. Given a folder tree deeper than one level and wider than one page, every folder is synced.
3. Given a mail delta round, its selection is the fixed one; given one failed part in an enrichment batch, only that part is retried, after its own `Retry-After`.
4. Given a message whose sensitivity property is set, the item records its sensitivity value.
5. Given a message in two folders of one mailbox and removed from one, the item remains; removed from both, it is retired; a copy in another mailbox is unaffected.
6. Given a message with an attached message holding an attachment, all three are items, parent to child.
7. Given two users synced in turn, neither's calendar delta link is used for the other.
8. Given a weekly meeting with one moved occurrence, the master is fetched by its id, the series is one item and the exception another, linked to it.
9. Given an event whose attachment listing fails, the window's cursor does not move.
10. Given the delegated scopes requested, none is a chat or channel-message permission.
11. Given a private channel, its files are synced from its own site; given a file shared in a chat, it is found through the sharer's OneDrive.
12. Given a team answering forbidden, it is marked access revoked and its items remain.
13. Given a `410 Gone` on any delta, the cursor is dropped and a full inventory runs before replay.
14. Given a crash right after a refresh, the stored refresh token is the new one.
15. Given `invalid_grant` on refresh, every connection under the auth record is reauth-required and sync stops.
16. Given an application connection whose test read is forbidden, or a delegated sign-in whose ID token names another tenant, no sync runs.

## Swap points

The sources enabled, calendar window size, enrichment batching and the HTTP client may change. Immutable ids, raw MIME, per-user and per-folder cursors, bounded calendar delta, files-only Teams access, full resync on a dead cursor, and refresh tokens saved before use must stay.

## Sources

- [Immutable ids](https://learn.microsoft.com/en-us/graph/outlook-immutable-id); [query parameters, encoding and expansion limits](https://learn.microsoft.com/en-us/graph/query-parameters).
- [Child folders, hidden folders](https://learn.microsoft.com/en-us/graph/api/mailfolder-list-childfolders?view=graph-rest-1.0); [message delta](https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0); [JSON batching, 20 requests](https://learn.microsoft.com/en-us/graph/json-batching).
- [Extended properties, property-tag form](https://learn.microsoft.com/en-us/graph/api/resources/extended-properties-overview); [PidTagSensitivity, 0x0036](https://learn.microsoft.com/en-us/office/client-developer/outlook/mapi/pidtagsensitivity-canonical-property).
- [Message resource](https://learn.microsoft.com/en-us/graph/api/resources/message?view=graph-rest-1.0); [MIME through $value](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0); [attachments and raw contents](https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0); [folder counts](https://learn.microsoft.com/en-us/graph/api/resources/mailfolder?view=graph-rest-1.0).
- [Calendar-view delta, v1.0](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0); [beta event delta](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-beta); [event resource, iCalUId and time zones](https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0); [event attachments](https://learn.microsoft.com/en-us/graph/api/event-list-attachments?view=graph-rest-1.0).
- [Joined teams](https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0); [channels](https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0); [files folder](https://learn.microsoft.com/en-us/graph/api/channel-get-filesfolder?view=graph-rest-1.0); [group drive](https://learn.microsoft.com/en-us/graph/api/drive-get?view=graph-rest-1.0); [Teams and SharePoint sites](https://learn.microsoft.com/en-us/sharepoint/teams-connected-sites); [chat files in the sharer's OneDrive](https://learn.microsoft.com/en-us/purview/ediscovery-teams-workflow).
- [Drive delta and resync](https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0); [delta reset and token expiry](https://learn.microsoft.com/en-us/graph/delta-query-overview); [downloads](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0); [selected-site access](https://learn.microsoft.com/en-us/graph/permissions-selected-overview); [throttling](https://learn.microsoft.com/en-us/graph/throttling).
- [Authorization code flow with PKCE, errors, single-resource scopes](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow); [refresh token rotation](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens); [access tokens, opaque to clients](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens); [calendar view, series master id](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0); [ID token tid and iss](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference); [client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).

## Known gaps

Proven: immutable ids, the folder walk, per-folder mail delta with batched enrichment, sensitivity, raw MIME with attachments as children, per-user calendar cursors, event attachments, Teams team drives and channel folders, drive delta, rotated refresh tokens and reauth. Designed, not run: full resync on a dead cursor, private and shared channels as their own sites, recurring-meeting exceptions as items, and grouping meeting copies by uid. Calendar coverage is the primary calendar's bounded views. Reference attachments are recorded as links, not fetched. Source permission replication is not covered.
