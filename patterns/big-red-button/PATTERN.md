---
id: big-red-button
title: "Big red button: an instant, durable all-stop, built in from the start"
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [platform-errors]
provides: [StopControl, StopGate]
requires: [StopStore, WakeSignal, PendingWorkList, CrossTenantOps]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Big red button

## Problem

An emergency message reaches only listening processes. Restarted workers can continue, delayed writes can land after a stop, and a lift can leave interrupted work stranded.

## Use when / Do not use when

Use when work consumes resources, changes durable state, or exposes sensitive data. Do not use as a substitute for ordinary permission checks or disaster recovery.

## Environment

A transactional stop store, an authenticated control plane, durable pending work, and push notifications.

## Solution

Store each stop with its scope, affected work, severity, reason, actor, and audit evidence. A work stop blocks new work and interrupts running work while permitting authorized reads. Lockdown also blocks reads.

Stops compose: lifting a narrower stop cannot cancel a covering stop. Each press and lift advances a durable stop generation. Workers must prove that their authorization to write still belongs to the current generation.

Pressing is immediate. A protected lift creates a pending request that another authorized person approves. Only the completed lift permits eligible pending work to resume.

## Ports

- StopControl records presses, lift requests, independent approvals, and effective state.
- StopGate checks covering stops and the current stop generation.
- StopStore commits stop decisions and their audit evidence atomically.
- WakeSignal alerts processes after durable state changes.
- PendingWorkList retains interrupted obligations through recovery.
- CrossTenantOps supplies narrowly authorized deployment-wide stop access.

## Rules

1. Persist a stop, advance its generation, and record audit evidence in one transaction, because a notification or memory flag cannot survive every crash.
2. Treat notifications as wakeups and reread durable state on startup and reconnect, because disconnected listeners miss notifications. Use a connection that retains its listening session rather than assuming transaction pooling preserves it. [Notification delivery](https://www.postgresql.org/docs/current/sql-notify.html), [listener lifetime](https://www.postgresql.org/docs/current/sql-listen.html).
3. Check at admission, job claim, each costly step, and commit, because a process can miss a wakeup or hang between checks. Deny progress when stop state cannot be read.
4. Reject writes from obsolete stop generations after both press and lift, because lifting must not revive authority held by interrupted workers. Resumed work obtains fresh authority.
5. Read deployment stops through a narrow audited path that works under forced row-level security, because an isolated tenant transaction cannot discover global state by ordinary reads. Keep the broader privilege unavailable to application callers.
6. Supervise extraction and conversion per job, including remote child processes, because ending a worker request does not end remote computation. Cancel within a declared deadline without interrupting another tenant's work.
7. Apply lockdown at a revocable byte gateway, checking every request and interrupting active delivery, because already-issued storage links otherwise remain usable. Bind byte capabilities to the permitted representation.
8. Keep emergency controls, audit, health, and grant revocation available, because recovery and containment must work while ordinary reads and writes are blocked.
9. Limit tenant users to authorized scopes and deployment-wide controls to operators, because approval cannot substitute for scope authority. Require a different authorized person for deployment-wide and lockdown lifts, because one compromised account must not undo containment. Bind approval to the exact request and revalidate covering stops at completion.
10. Keep interrupted work durably pending and redrive it from committed checkpoints, because removing the stop alone does not finish work. Respect remaining stops and changed source versions.

## Conformance

1. Given a stop and a missed notification, then claims and writes still fail; restart preserves the stop.
2. Given an old worker waking after a press and lift, then its write remains refused.
3. Given a remote extraction and another tenant's job, then stopping the first ends only its computation within the deadline.
4. Given a byte link issued before lockdown, then it cannot deliver additional bytes after containment takes effect.
5. Given a protected lift, then self-approval fails; an authorized independent approval leaves any wider stop effective.
6. Given interrupted pending work, then an eligible lift resumes it without duplicate effects.

## Swap points

Replace storage, wake transport, host, or work categories while preserving durable stops, fenced writes, revocable delivery, and independent approval.

## Sources

- [Emergency levers](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_emergency_levers.html).
- Database notification and listener semantics are cited beside their trap.

## Known gaps

Stop latency is bounded by checkpoint, supervision, and delivery interruption deadlines. Containment cannot recall bytes already delivered.
