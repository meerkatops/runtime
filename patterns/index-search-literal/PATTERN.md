---
id: index-search-literal
title: Exact search that keeps punctuation
version: 1.0.0
status: mixed
license: Apache-2.0
visibility: public
uses: [index-query-syntax, index-search, index-extract]
provides: [LiteralAnalysis, LiteralQuery]
requires: [Adapter, FieldRegistry]
environment:
  language: []
  runs: cloud
  cloud_services: [a search engine with configurable analyzers, such as OpenSearch or Elasticsearch]
  local_needs: [a local engine of the same version, to test the analyzers]
---

# Exact search that keeps punctuation

## Problem

Reviewers search for values whose punctuation is the meaning: `83(b)`, `§ 2.1(a)`, `$1,250.00`, `10-K`, `U.S.C.`, `AT&T`, `Smith-Jones`, `don't`. A default search engine analyzer splits text at punctuation and throws it away, so `83(b)` is stored as `83` and `b`. After that, no query can find it exactly, quoted or not. Query languages make it worse by treating `(`, `-`, `:`, `/`, `&` and `!` as operators or escape characters, so the characters a person typed never reach the index as text.

## Use when / Do not use when

Use when people search documents for citations, amounts, identifiers, form names, codes or names that contain punctuation. Do not use for a field searched only by meaning (index-vectors), or for an exact-value metadata field that already uses a keyword type.

## Environment

A search engine whose tokenizer, character filters and token filters can be set per field, and that supports multi-fields, phrase queries and positions. The search syntax is parsed by the application (index-query-syntax), never by the engine's own query language.

## Solution

**Store every content field twice or more, never once.** Each content zone (body, header, footer, footnotes, comments) has:

| Field | Tokenizer | Filters | Used for |
|---|---|---|---|
| `zone` | whitespace | normalize, lowercase, edge trim | ordinary words, case-insensitive |
| `zone.stemmed` | whitespace | normalize, lowercase, edge trim, stemmer | word forms (`terminate` finds `terminated`) |
| `zone.exact` | whitespace | normalize, edge trim | quoted phrases, case kept |
| `zone.prefix` | whitespace | normalize, lowercase, edge trim, edge n-grams; searched with the `zone` analyzer | `merg*` |

**Split only on whitespace.** The whitespace tokenizer keeps punctuation inside the word, so `83(b)`, `10-K`, `AT&T` and `U.S.C.` are each one stored token. This one choice is what makes punctuation searchable.

**Normalize before splitting, the same way at index and query time.** Character filters turn curly quotes into straight ones, every dash form (em, en, figure, horizontal bar) into `-`, and remove zero-width spaces, soft hyphens and byte-order marks. Convert characters; never delete them, or `don't` written with a curly apostrophe is stored as `dont` and a typed `don't` misses. Where the engine offers Unicode compatibility normalization, apply it too.

**Trim only sentence punctuation at the edges of a word.** A token filter removes `.` `,` `;` `:` `!` `?` from the start and end of a token, so `orchard.` is stored as `orchard`, while `U.S.C.` keeps its inner periods and `2.1(a)` is untouched. Also trim an unbalanced parenthesis or quote at an edge, so `(see` becomes `see` and `83(b))` becomes `83(b)`, but keep a balanced one, so `83(b)` stays whole. Apply the same trim to the exact field, or a quoted `"83(b)"` misses `83(b).` at the end of a sentence.

**Amounts.** Choose one rule and apply it at index and query time alike. Either keep `$` and `,` as typed, so `"$1,250.00"` matches only that form, or strip `$` before a digit and commas between digits, so `$1,250.00`, `1,250.00` and `1250.00` all match. The second rule finds more amounts; state which one you use in the search guide.

**Keep sheets, slides and tables apart.** Index them with a large position gap between cells or slides, so a phrase never matches across a boundary.

**The query side never uses the engine's query language.** The application parses the search box (index-query-syntax) and builds only typed clauses: phrase, term, prefix, wildcard, span and range. Engine operators are never sent as text, so the engine's reserved characters never need escaping. Where an engine accepts only a query string, the compiler writes that string itself from the parsed tree, quoting and escaping every value the engine's way; the person's text is never passed through.

- Quotes are the only way to make text literal; there is no backslash escape. To search for a quote mark itself, write it twice inside a phrase: `"the ""best"" offer"`. The compiler passes it to the engine as one quote mark inside the phrase value, escaped the engine's way where the engine takes a query string, and the whitespace analysis keeps it in the stored word, so the phrase matches the document's quote marks after curly quotes are made straight. The search guide says so. Everything between quotes is literal text, including parentheses, hyphens and the words AND, OR and NOT. An unclosed quote is an error that says so; it is never guessed at.
- A bare word ends only at whitespace, a quote or a grouping parenthesis, so unquoted `$500`, `10-K`, `AT&T` and `U.S.C.` reach the index whole. A parenthesis directly after a letter or digit is part of the term, so unquoted `83(b)` and `2.1(a)` are one term; after a space, the start of the query or an operator, a parenthesis opens a group (index-query-syntax).
- Operators are recognized only as whole words. AND, OR and NOT are operators only in capitals (index-query-syntax), so a lower-case "and" inside a sentence is a word.
- A quoted phrase searches `zone.exact` as a phrase. A bare word searches `zone` and `zone.stemmed`, with the unstemmed match scored higher. Wildcards and proximity search the exact field with the case rule that field uses; if `zone.exact` keeps case, add a lower-cased exact field for them, or capitalized words never match.
- A builder or natural-language helper writes a value with punctuation as a quoted phrase, never as a regular expression.

**Metadata text fields get the same treatment.** Subjects and other text fields use the same analyzers. File names, paths and email addresses also get a parts field that splits on `_`, `/`, `\`, `.` and `@` but keeps `-` and `&`, so `10-K_final.pdf` is found by `10-K` and `jane.doe@example.com` by `jane.doe`.

**Highlights follow the same rule.** Highlights come only from the positions the engine returns for the field that matched, mapped onto the shown text (search-ui rule 8). Where an engine returns fragments rather than positions, the server finds the positions itself by matching the parsed query against the stored shown text with the same analysis. Either way `83(b)` and `$500` are marked on exactly those characters. A person's own find-in-document box is separate; it matches the typed text literally, punctuation included.

## Ports

- **LiteralAnalysis.settings(zone)** → the character filters, tokenizer, token filters and multi-fields for one zone, generated from one definition.
- **LiteralQuery.compile(tree)** → typed engine clauses from the parsed search tree, never a query string.

## Rules

1. **Tokenize content on whitespace only,** because every other common tokenizer discards the punctuation that makes the value.
2. **Define the analysis once and generate it everywhere it is used,** because an index-time filter missing at query time, or in a second environment, silently breaks matches.
3. **Convert look-alike characters to one form; never delete them,** because deletion joins words into tokens nobody types.
4. **Trim only edge sentence punctuation and unbalanced brackets, on every field,** because inner punctuation is the value and edge punctuation is the sentence.
5. **Never send the person's text to the engine's query language,** because its reserved characters turn values into operators.
6. **Make quotes the only literal marker, and refuse an unclosed quote,** because a second escape rule gives one search two meanings.
7. **Search a quoted phrase only against an exact field,** because a stemmed or n-gram field matches text that was not typed.
8. **Give every field a phrase searches the same case rule as the query value,** because a lower-cased value against a case-kept field misses capitals.
9. **Test the analyzers against a real engine with a fixed list of punctuated values,** because analysis settings are not checked by unit tests of the parser.

## Conformance

Index one document containing each value below, in body text and at the end of a sentence, and search for it quoted.

1. `"83(b)"`, unquoted `83(b)`, `"section 2.1(a)"` and `"(83(b))"` each find the document, including where it reads `83(b).` at the end of a sentence.
2. `"10-K"`, `"AT&T"`, `"U.S.C."`, `"Smith-Jones"` and `"#4521"` find it; unquoted `10-K` finds it too.
3. A document written with a curly apostrophe and an en dash is found by a typed `"don't"` and `"2019-2020"`.
4. Under the stripping rule, `"$1,250.00"`, `"1,250.00"` and `"1250.00"` all find `$1,250.00`; under the keeping rule only the first does, and the guide says which rule applies.
5. `"merger AND termination"` in quotes is a phrase; without quotes it is a Boolean search.
6. `(83(b) OR 83(c))` groups the two terms; an unclosed `"83(b)` is refused with a message.
7. A phrase never matches across two spreadsheet cells or two slides.
8. `10-K_final.pdf` is found by a file-name search for `10-K`, through the file name's parts field.
9. Each match above is highlighted on exactly the characters searched.
10. The same tests pass on every environment the index is deployed to.

## Swap points

Replace the engine, the stemmer, the n-gram lengths and the amount rule, while keeping whitespace tokenizing, conversion before splitting, edge-only trimming, quotes as the only literal marker and typed clauses instead of a query string.

## Sources

- [Whitespace tokenizer](https://docs.opensearch.org/latest/analyzers/tokenizers/whitespace/), [pattern replace character filter](https://docs.opensearch.org/latest/analyzers/character-filters/pattern-replace-character-filter/), [pattern replace token filter](https://docs.opensearch.org/latest/analyzers/token-filters/pattern-replace/).
- [Multi-fields](https://docs.opensearch.org/latest/mappings/mapping-parameters/fields/), [match phrase query](https://docs.opensearch.org/latest/query-dsl/full-text/match-phrase/), [position increment gap](https://docs.opensearch.org/latest/mappings/mapping-parameters/position-increment-gap/).

## Known gaps

Some managed engine services offer no Unicode normalization plugin, so compatibility forms such as full-width digits are not unified there. A word joined by a hyphen is found as a whole, not by its parts: `Smith` alone does not find `Smith-Jones` unless a split form is also indexed.
