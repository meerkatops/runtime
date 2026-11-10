<!-- SPDX-License-Identifier: Apache-2.0 -->
# Pattern template

Copy this file to `patterns/<id>/PATTERN.md` and fill each part. Every part says, in one line, what it is and who it is
for: **a person** (someone deciding whether to use it), **the builder** (the team building from it), or **both**.
A person should understand the pattern from the front matter, Problem, Use when and Environment alone; the builder
needs every part.

## The parts

| Part | What it is, in one line | For |
|---|---|---|
| `id`, `title` | The folder's name, and one sentence saying what the pattern builds | both |
| `version` | Which saved version this is; each change is a new version, and a project names the version it uses | both |
| `status` | Proven (it ran live), designed (written from the provider's documents, never run) or mixed (the body says which part is which) | a person |
| `visibility` | Public or private: whether it is meant for public use, not whether it is published yet | a person |
| `uses` | The smaller patterns this one is built from | both |
| `provides` | The operations a finished build offers to whoever uses it | the builder |
| `requires` | The operations it needs someone else to supply | the builder |
| `environment` | What it is built in and what it needs to run: language (`[]` when not stated), where it runs (`local`, `cloud`, `both`, or `unknown` when the pattern does not say yet), cloud services, local needs | both |
| Problem | What goes wrong if you build this piece without the pattern | a person |
| Use when / Do not use when | Where it fits, and where something else fits better | a person |
| Environment | The `environment` front matter, said in a few plain lines | both |
| Solution | The shape of the answer, in words and a diagram | both |
| Ports | Each operation it provides or requires: inputs, outputs, errors, in no particular language | the builder |
| Rules | Numbered must-keep rules; a rule learned from a failure says what failed | both |
| Conformance | Numbered test cases (given, when, then) every build must pass; they become a card's done checks | the builder |
| Swap points | What may be replaced (an engine, a provider) and what must stay the same when it is | both |
| Sources | The provider's own documentation for every claim about it | both |
| Known gaps | What is not proven or not built yet | a person |

## A filled-in example

The example below is small on purpose; real patterns are in `patterns/`.

```markdown
---
id: retry-with-backoff
title: Retry a call that a provider throttles, without making the throttling worse
version: 0.1.0
status: designed
license: Apache-2.0
visibility: public
uses: []
provides: [Caller]
requires: [Clock]
environment:
  language: []
  runs: both
  cloud_services: []
  local_needs: [nothing beyond the process itself]
---

# Retry with backoff

## Problem

A provider that says "slow down" and is retried at once says it louder; a sync that retries in a tight loop gets
its whole tenant blocked.

## Use when / Do not use when

- **Use when** a call can be refused for load and is safe to repeat.
- **Do not use when** the call is not safe to repeat (a payment): make it safe first.

## Environment

Designed only, so no language yet. Runs anywhere the caller runs; needs no cloud service and nothing locally.

## Solution

Wait what the provider asks (its Retry-After), else wait longer each time with some randomness, and stop after a
limit.

## Ports

- **Caller.call(request) → response | GaveUp**: makes the call, retrying as the rules say.
- **Clock.sleep(ms)** (required): waits; a test supplies a fake one.

## Rules

1. Honor the provider's Retry-After when it sends one. (A sync that ignored it was blocked for an hour.)
2. Otherwise double the wait each time, with up to 20% randomness, capped at 60 seconds.
3. Give up after 6 tries and say which request gave up.

## Conformance

1. **Given** a 429 with Retry-After: 5, **when** called, **then** the next try is 5 seconds later.
2. **Given** six 503s in a row, **when** called, **then** it returns GaveUp naming the request.

## Swap points

The Clock can be replaced; the wait rules may not change when it is.

## Sources

- The provider's documentation for its throttling response and Retry-After header.

## Known gaps

Not run against a live provider yet.
```
