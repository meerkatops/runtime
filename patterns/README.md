<!-- SPDX-License-Identifier: Apache-2.0 -->
# Patterns

A pattern is a proven way to build one piece of a system: the problem, the rules, the operations an implementation
provides and the cases it must pass. Any coding agent can build from a `PATTERN.md`.

| Pattern | What it is |
|---|---|
| [connector](connector/PATTERN.md) | Pulls items from a SaaS source into a sink: authenticate, list changes, fetch bytes, write items |
| [connector-auth-entra-fic](connector-auth-entra-fic/PATTERN.md) | Microsoft 365 connection with no secrets: an Entra app whose only credential is a federated identity credential |
| [connector-m365-graph](connector-m365-graph/PATTERN.md) | The Microsoft Graph source adapter: SharePoint, OneDrive, Teams files, Outlook mail and calendar |

Some patterns name others in `uses` that are not published here yet; they will follow.

Copyright 2026 Meerkat Holdings LLC. Apache License 2.0; see [NOTICE](NOTICE) and [LICENSE](../LICENSE).
