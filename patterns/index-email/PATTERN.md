---
id: index-email
title: Email as an item a reviewer can search, read and follow
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-archives, index-extract, search-preview, index-search-literal]
provides: [MailParse, MailItem]
requires: [Extractor, ContentStore, ItemSink]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: [a set of real messages: plain, HTML, multipart, forwarded, signed, with inline images and attachments, in several character sets]
---

# Email

## Problem

Email looks like a simple text file and is not. A message is a tree of MIME parts in several transfer encodings and character sets, with an HTML body and a plain one, inline images, attachments, forwarded messages inside it and headers that differ by sender. A general extractor often drops the body, wraps parts inconsistently or leaves the header block in the text, so every message matches "subject" and "from". Shown as received, its HTML can run script or tell the sender who opened it.

## Use when / Do not use when

Use when collections hold email, from a mailbox connector (connector-m365-graph, connector-google-workspace) or from uploaded `.eml`, `.msg` or mailbox files. Do not use for chat messages.

## Environment

The raw message bytes, a maintained MIME parser, the shared extractor and intake, and the preview's sanitizer.

## Solution

**Parse the raw message, not an extractor's rendering of it.** Fetch or keep each message as raw MIME (from a mailbox, its raw content, not a JSON body). Parse it with a maintained MIME parser that decodes quoted-printable and base64 and converts every part's character set to UTF-8. Keep the general extractor's output only as a fallback when the parse fails, and record which one was used.

**Headers are fields, not body text.** From, to, cc, bcc, subject, date, message id, in-reply-to and references become metadata fields. The body zone holds only the body, so a search for `subject` finds messages that say it, not every message. Dates are stored in UTC with the sender's offset kept, and shown with the time zone named.

**The searched body.** Use the plain-text part when the message has one. Otherwise turn the HTML part into text with a line break at every block element, so words from separate paragraphs and table cells never run together. Mark quoted and forwarded text as its own zone, so a reviewer can search only what this message's author wrote.

**The shown body.** The preview shows the header fields and the HTML body made safe (search-preview): an allowlist of tags and attributes, no script or event handler, links shown as text, and no remote resource loaded, so tracking images cannot report the open. Inline images referenced by `cid:` are drawn from their own parts; a message with no HTML part shows its plain text.

**Attachments and inline parts.** Every non-inline part is a child item with its own extraction, keyed by digest, name and occurrence (index-archives), so two attachments named `image001.png` stay two children. A part used only as an inline image is not a child. An attached message (`message/rfc822`) is a child email with its own headers, parsed by this same pattern, and its own attachments are its children.

**Threads.** Each message carries a thread key, taken in this order: the mailbox's own conversation id, then the first id in References, then In-Reply-To, then its own Message-ID. Threads are shown by key, and a reply's quoted text never duplicates the earlier message's hits in a thread view.

**Hard formats.** An Outlook `.msg` file and a `winmail.dat` (TNEF) attachment need their own parsers; until one is in place, keep the file as an item with the reason, never as a failure that hides it. A signed message (S/MIME or PGP) shows its content and marks the signature as not checked unless it is checked. An encrypted message is kept as a file, marked encrypted.

## Ports

- **MailParse.parse(bytes)** → headers, body text, body HTML, quoted zones and a list of parts, each part inline or attachment with its type, name, digest and bytes. Errors: unreadable, encrypted, unsupported format.
- **MailItem** → the indexed item: header fields, thread key, body zone, quoted zone, safe display HTML and its child items.

## Rules

1. **Parse raw MIME with a maintained parser and keep the extractor only as a fallback,** because general extractors drop bodies and parts.
2. **Store headers as fields and keep them out of the body zone,** because header words in the body make every message match.
3. **Search the plain part, or HTML turned into text with block breaks,** because stripped HTML joins words across paragraphs.
4. **Convert every character set and transfer encoding before indexing,** because undecoded text is unsearchable.
5. **Show only sanitized HTML, load nothing remote and draw `cid:` images from their parts,** because a message's HTML is written by its sender.
6. **Make every non-inline part a child, and an attached message a child email,** because a reviewer searches attachments as documents.
7. **Keep a message the parser cannot read as an item with its reason,** because a hidden failure is a missed document.
8. **Give every message a thread key by a fixed order,** because threads must group the same way on every rescan.

## Conformance

1. Given a message whose body never mentions "subject", a search for `subject` does not find it.
2. Given a multipart message with only an HTML body in a table layout, words from two cells are not joined.
3. Given quoted-printable text in ISO-8859-1 and a base64 body in Shift_JIS, both are found by their words.
4. Given an HTML body with a script, an `onload` handler, a `javascript:` link and a remote image, the preview runs nothing and requests nothing.
5. Given an inline `cid:` image and a PDF attachment, the image shows in the body, and only the PDF becomes a child.
6. Given a forwarded message attached as `message/rfc822` with its own attachment, there are two levels of children.
7. Given a reply with References, its thread key equals the original's.
8. Given a `.msg` file with no parser available, it is listed with the reason.
9. Given a message sent at 23:30 with a -05:00 offset, it is stored as 04:30 UTC the next day and shown with its zone named.

## Swap points

Replace the MIME parser, the HTML-to-text step and the sanitizer, while keeping raw-message parsing, headers as fields, safe display, attachments as children and the thread key order.

## Sources

- [Internet Message Format (RFC 5322)](https://www.rfc-editor.org/rfc/rfc5322), [MIME (RFC 2045)](https://www.rfc-editor.org/rfc/rfc2045), [Content-ID URLs (RFC 2392)](https://www.rfc-editor.org/rfc/rfc2392).
- [Outlook item file format](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxmsg/b046868c-9fbf-41ae-9ffb-8de2bd4eec82), [TNEF format](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxtnef/1f0544d7-30b7-4194-b58f-adc82f3763bb).

## Known gaps

Outlook `.msg` and TNEF parsing need dedicated parsers. Signature checking needs the signer's certificates.
