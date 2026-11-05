<!-- SPDX-License-Identifier: Apache-2.0 -->
# Patterns

A pattern is a proven way to build one piece of a system: the problem, the rules, the operations an implementation
provides and the cases it must pass. Any coding agent can build from a `PATTERN.md`.

| Pattern | What it is |
|---|---|
| [connector](connector/PATTERN.md) | Pulls items from a SaaS source into a sink: authenticate, list changes, fetch bytes, write items |
| [connector-auth-entra-fic](connector-auth-entra-fic/PATTERN.md) | Microsoft 365 connection with no secrets: an Entra app whose only credential is a federated identity credential |
| [connector-m365-graph](connector-m365-graph/PATTERN.md) | The Microsoft Graph source adapter: SharePoint, OneDrive, Teams files, Outlook mail and calendar |
| [index-upload](index-upload/PATTERN.md) | A web page that uploads files and stages them for extraction: drop zone, per-file progress, start, PUT, complete; local disk or Azure Blob |
| [index-extract](index-extract/PATTERN.md) | One extractor port: bytes and a name in, structured content (sections, blocks, metadata) out, with one test kit for every extractor |
| [index-extract-tika](index-extract-tika/PATTERN.md) | The Tika adapter behind the extractor port: an isolated server sidecar with limits, timeouts and retries |
| [setup-rust-typescript](setup-rust-typescript/PATTERN.md) | A laptop and a new repo ready to build well in Rust and TypeScript: installs, editor, starting files and checks |

Some patterns name others in `uses` that are not published here yet; they will follow.

Copyright 2026 Meerkat Holdings LLC. Apache License 2.0; see [NOTICE](NOTICE) and [LICENSE](../LICENSE).
