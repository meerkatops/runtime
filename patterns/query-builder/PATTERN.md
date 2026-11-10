---
id: query-builder
title: "Query builder: plain words in, a search-syntax query out, shown before it runs"
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public
uses: [index-query-syntax, index-search, index-access, platform-errors]
provides: [QueryBuilder, QueryReadout]
requires: [BuilderModel, SyntaxParser, SyntaxGrammar, FieldRegistry, Adapter, KeyStore]
environment:
  language: []
  runs: cloud
  cloud_services: []
  local_needs: []
---

# Query builder

## Problem

A plain-language search box can execute whatever a model invents, hide its interpretation, and leak private access information into prompts. Logging prompts creates another copy of sensitive search intent.

## Use when / Do not use when

Use when people want help expressing searches in the search syntax and the tenant authorizes model processing of search text. Do not use when that authorization or an acceptable model endpoint is absent; a typed query remains available.

## Environment

The shared search-syntax parser and grammar, an engine capability registry, a tenant-approved model endpoint, and protected tenant-specific fingerprinting keys.

## Solution

One search box has two lanes, and syntax is the default. In the syntax lane, what is typed runs as typed once the shared parser accepts it, and a refusal shows its position. Plain words go to the model only after the person switches the box to the plain-words lane, with a switch shown beside the box; the box never guesses the lane, because bare words are also valid ranked syntax (index-query-syntax), and a guess would send search text to a model the person did not choose. In the plain-words lane, the words are translated into syntax first; field filters and scope the words name ("emails from counsel last March") become field restrictions from the field registry, never free-form engine terms.

Translation produces a candidate query; it does not execute one. Supply the model with the person's words, selected translation mode, and only the grammar supported by the active engine.

Parse the candidate through the shared parser. Generate its plain reading from the parsed meaning, rather than asking the model to explain itself. Show the editable query and an optional engine translation before access scope is added.

After a search, a readout under the box shows what ran:

- a strategy chip naming the retrieval the parsed query uses (lexical, semantic, hybrid, regular expression), computed on the server from the parsed query, never taken from the model's description;
- the plain reading;
- the compiled syntax, with Edit, which moves it into the box as syntax;
- an expandable engine query with Copy, built before access scope is added and marked as omitting it.

The visual builder produces the same syntax, and the readout treats both alike.

Preview translates without searching. Run executes the accepted query. A combined control may translate and run, but must use the same validated query and expose its interpretation.

## Ports

- QueryBuilder translates intent and produces a validated query with a plain reading.
- BuilderModel proposes a search-syntax query using the supplied supported grammar.
- SyntaxParser validates both generated and edited queries.
- SyntaxGrammar describes the active engine's supported language.
- Adapter produces a safe explanation of the unscoped engine translation.
- KeyStore protects tenant-specific input fingerprints.
- QueryReadout shows the strategy, plain reading, compiled syntax, and unscoped engine query of the search that ran.
- FieldRegistry supplies the fields plain words may restrict.

## Rules

1. Parse every candidate and edit before execution, because model fluency does not establish valid or supported search meaning. A malformed candidate gets one corrective retry, then a clear refusal without searching.
2. Derive offered modes from engine capabilities, because a model must not be invited to generate unavailable behavior. Translation mode and search retrieval mode are separate choices.
3. Generate the plain reading from the parsed meaning, because a model's explanation can disagree with its query. Recompute that reading after every edit.
4. Keep translation and execution distinct, because preview must have no search side effect and a person must be able to inspect a query before it runs.
5. Send only the entered text, translation mode, supported grammar, and sanitized parser feedback to the model, because grants, tenant identities, folder structure, engine locations, and item content reveal unrelated information.
6. Authorize model egress per tenant, including endpoint and retention terms, because a deployment-wide model setting cannot grant permission to disclose another tenant's search text. Treat credentials and model output as untrusted data.
7. Build any displayed engine translation before access scope is applied and mark the scope as omitted, because a diagnostic view must not expose grants or private resource structure. Never display or log the scoped request.
8. Keep a private tenant-scoped audit of who requested translation, when, its mode and outcome, and a keyed fingerprint of the input, because accountability does not require storing prompts. The record legitimately retains internal tenant association; that context never enters model input or public explanations.
9. Keep prompts and generated output out of logs and audit text, because rejected output can be as sensitive as accepted output. Protect and rotate fingerprint keys; identical input must not be correlatable across tenants.
10. Encode all generated text safely for display and reauthorize the eventual search, because model output is not trusted markup and translation approval does not freeze access.
11. Derive the strategy chip from the parsed query on the server, because a model's account of its own query can disagree with what runs.
12. Let translation write only fields in the registry, because an invented field either fails at search time or silently becomes text.
13. Make syntax the default lane and send words to the model only after an explicit switch, because a box that detects the lane sends plain search text to a model on its own guess, and bare words are also valid syntax.

## Conformance

1. Given two invalid model answers, then translation refuses and performs no search.
2. Given preview, then no search runs; given an edited accepted query, then its new parsed meaning is what runs.
3. Given private grants and folder names, then model input and displayed translation contain none of that context while internal audit remains correctly tenant-scoped.
4. Given identical input in different tenants, then fingerprints differ and neither log contains the input or output.
5. Given an unsupported mode or unapproved endpoint, then translation is unavailable while supported typed searches remain usable.
6. Given a grant revoked after preview, then execution uses current access.
7. Given a search, the readout's strategy chip, syntax, and unscoped engine query all describe the query that ran; Edit puts that syntax in the box.
8. Given "emails from counsel last March," the candidate restricts the from and sent-date fields and adds no unregistered field.
9. Given bare words typed in the default lane, they run as ranked syntax and no model call is made; given words mixed with an operator, the parser refuses with its position and no model call is made; after the switch to plain words, either is translated first.

## Swap points

Replace model, prompt, hosting, and fingerprint algorithm while preserving one parser, bounded correction, explicit egress authorization, and separate execution.

## Sources

- [Keyed message authentication](https://www.rfc-editor.org/rfc/rfc2104).

## Known gaps

Validation establishes syntax and safety boundaries, not whether a translation best expresses the person's intent. A fingerprint supports repetition counts, not recovery of the original search.
