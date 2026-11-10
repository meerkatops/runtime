---
id: connector-throttle
title: Staying inside a provider's limits
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [platform-errors]
provides: [Throttle]
requires: [JobLease]
environment:
  language: []
  runs: unknown
  cloud_services: [Microsoft Graph (proven), Google APIs quotas (designed)]
  local_needs: []
---

# Throttle

## Problem

Retries can turn a temporary provider limit into a tenant-wide outage. A successful batch wrapper can hide failed parts, while a sleeping worker can lose its lease and continue work it no longer owns.

## Use when / Do not use when

Use when calling a provider with concurrency limits or transient failures. Do not use retry as a remedy for missing permission, malformed requests, or a broken adapter contract.

## Environment

Leased workers sharing durable tenant budgets, stop state, and retry progress. Each request passes through this boundary, including requests made during enumeration and enrichment.

## Solution

Apply a bounded retry policy around individual calls. Honor the provider's requested delay when it fits the allowed waiting window. Otherwise hold the affected work with an explanation. Without provider guidance, use a short, finite sequence of increasing waits with jitter.

Coordinate concurrency across workers rather than granting each process a full tenant allowance. Graph can meter the application across tenants and within a tenant; Google APIs also impose project and user budgets. Include each applicable budget. A batch is a transport optimization; its parts retain independent outcomes and retry decisions.

Keep ownership and cancellation active during every wait. A durable retry record holds the affected tenant and work, the reason, attempts made, and earliest allowed retry time. Long delays release execution capacity without losing that record.

## Ports

- **Throttle:** Applies shared budgets and bounded retries to calls and batch parts.
- **JobLease:** Renews current ownership while a worker waits or transfers work.

## Rules

1. **Honor supported delay guidance in both duration and date form,** because guessing a shorter wait prolongs throttling. Bound the wait; hold rather than silently shortening a delay beyond policy. [Throttle guidance](https://learn.microsoft.com/en-us/graph/throttling).
2. **Use finite fallback waits with jitter,** because synchronized unlimited retries amplify an outage. A suitable policy waits roughly one, two, three, five, then eight seconds before holding; the policy belongs with shared failure handling.
3. **Enforce budgets across all workers for a tenant,** because local caps multiply when workers scale. Cool the affected budget after throttling so unrelated tenants can proceed.
4. **Inspect each batch part and retry only retryable failures,** because transport success does not imply operation success. Graph permits at most 20 requests per JSON batch. Preserve successes and honor each failed part's delay; Graph SDK automatic retries do not cover throttled batch parts. [Batch behavior](https://learn.microsoft.com/en-us/graph/json-batching), [batch throttling](https://learn.microsoft.com/en-us/graph/throttling).
5. **Renew leases and check stops throughout waiting,** because an expired or stopped worker must not resume a request. If renewal cannot be confirmed, cease work.
6. **Retry effects only with stable replay protection,** because a lost response does not prove the first attempt failed. Resume downloads only against unchanged strong content evidence.
7. **Hold exhausted work without blocking unrelated processing,** because one unhealthy item must not stall a tenant. Its listing checkpoint still cannot pass unaccepted work.
8. **Separate contract failures from transient failures,** because repeated malformed calls waste quota and hide an adapter defect. Surface an actionable explanation without credentials or sensitive response content.

## Conformance

1. Given either supported form of retry guidance, the worker respects it; an excessive delay holds the work.
2. Given persistent transient failures without guidance, the finite policy ends in a visible hold.
3. Given a mixed-outcome batch, successful parts run once and only eligible failures retry.
4. Given multiple workers, their combined in-flight calls remain within the tenant budget.
5. Given a stop, failed renewal, or expired lease during a wait, no subsequent request starts.
6. Given a lost response to an accepted write, replay creates no duplicate effect.

## Swap points

Change delay bounds, concurrency budgets, or coordination storage while retaining bounded retries, per-part decisions, and current ownership.

## Sources

The linked provider guidance defines delay and batch behavior. Source adapters supply resource-specific budgets. [Graph budget scopes](https://learn.microsoft.com/en-us/graph/throttling-limits), [Gmail user and project quotas](https://developers.google.com/workspace/gmail/api/reference/quota).

## Known gaps

A local budget cannot predict every provider limit. Shared applications can encounter limits caused by activity outside the connector's control.
