---
id: platform-errors
title: One error registry, one retry rule, structured logs and an audit of who did what
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-tenancy]
provides: [Problems, Retrier, Log, Audit]
requires: [AuditStore, Clock]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Errors, retries, and audit

## Problem

Inconsistent failures obscure recovery, expose internals, and hide stranded work. Logs can leak content and credentials.

## Use when / Do not use when

Use when components fail, retry work, or record security decisions. Do not use as a substitute for authorization, durable scheduling, or incident response.

## Environment

A shared failure registry, a clock, structured diagnostics, an append-only audit store, and operational alerting.

## Solution

Give each failure a stable meaning, a safe explanation, and a retry classification. Translate that meaning consistently across interfaces using Problem Details where appropriate. Unexpected faults expose a support reference rather than internal causes.

Distinguish diagnostic logs from accountability. Diagnostics explain execution without content. Audit evidence records the tenant, authenticated actor, authority used, intended action, affected scope, outcome, time, and correlation needed to reconstruct a decision.

Retry temporary failures only within a bounded policy. People must see exhausted work and be able to retry after correction.

## Ports

- Problems translates classified failures into safe explanations for each interface.
- Retrier schedules bounded attempts for repeat-safe work.
- Log records content-free execution diagnostics.
- Audit records durable evidence of authorized and refused actions.
- AuditStore protects append-only evidence within tenant boundaries.
- Clock supplies time for deadlines, delay, and correlation.

## Rules

1. Classify failures centrally and preserve their meaning across interfaces, because callers must make the same recovery decision regardless of transport. Distinguish invalid input, exceeded capacity, temporary unavailability, stale work, hidden content, and emergency stops without exposing internals.
2. Check visibility before reporting missing authority, because an access refusal must not confirm another tenant's item exists. Never include raw provider messages, document text, internal locations, or stack traces in a public explanation. [Security considerations](https://www.rfc-editor.org/rfc/rfc9457).
3. Retry only idempotent work or work protected by durable repeat detection, because a timeout can follow a successful remote effect. Retain enough context to reconcile uncertain outcomes.
4. Honor a provider's requested delay before applying bounded backoff with jitter, because immediate retries amplify throttling and synchronized retries create another burst. Accept both relative and absolute delay forms; if the delay exceeds the allowed wait, hold work visibly rather than retry early. [Delay semantics](https://www.rfc-editor.org/rfc/rfc9110), [rate limiting](https://www.rfc-editor.org/rfc/rfc6585).
5. Put exhausted temporary failures into a visible held state with their safe reason and a permitted retry action, because endless loops and silent drops both conceal unfinished work. Permanent failures remain terminal unless an authorized correction changes the conditions.
6. Let unrelated batch work continue while preserving the failed item's obligation, because throughput must not turn into lost work. A source checkpoint cannot advance past an unhandled change merely because its retries are held.
7. Describe an expired continuation by the resource being continued and the required restart, because a feed position and a passage location require different recovery.
8. Carry correlation through admission, queueing, workers, projections, and provider calls, because a local success says nothing about the complete operation.
9. Keep content, queries, prompts, model outputs, bearer tokens, and secrets out of logs and audit text, because operational access must not grant content access. Use a tenant-specific keyed fingerprint for necessary repetition counts.
10. Append audit evidence for changes, sensitive reads, connection binding, privilege changes, stops, lift requests, and approvals, because accountability must survive lockdown. Restrict audit access and preserve durable evidence when the usual sink is unavailable.
11. Alert on old queued work, feed lag, held jobs, lease failures, and stop latency, because structured logs alone cannot reveal that nothing is happening. Bound diagnostic retention and protect recoverable encryption keys.

## Conformance

1. Given one failure through different interfaces, then its explanation, retry decision, and correlation agree without internal details.
2. Given repeated temporary failures, then attempts honor provider delay and end visibly held; unrelated work proceeds without skipping the failed source change.
3. Given a secret planted in content, query text, or model output, then diagnostics and audit contain none of it.
4. Given an emergency stop, then refusals and authorized control actions remain auditable.
5. Given an expired feed continuation, then recovery requests feed reconciliation rather than claiming a passage disappeared.

## Swap points

Replace diagnostic storage, delay schedules, or alert delivery while preserving stable failure meaning, bounded retries, privacy, and durable accountability.

## Sources

The linked standards define safe problem reporting, delay semantics, and throttling. [Interface error propagation](https://spec.graphql.org/September2025/) supports equivalent failure meaning.

## Known gaps

Retry policy cannot make an unkeyed remote side effect safe. Safe messages require localization beyond US English when other languages are served.
