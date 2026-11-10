---
id: design-clear-ui
title: A screen anyone can use on sight, with no manual, that still shows everything it needs to
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: []
provides: [DesignReview]
requires: []
environment:
  language: []
  runs: unknown
  cloud_services: []
  local_needs: []
---

# Clear design

## Problem

Small additions accumulate until a screen needs training. Removing detail indiscriminately creates the opposite failure: a tidy screen that hides the evidence people need to decide.

## Use when / Do not use when

Use when designing or reviewing screens, reports, charts, forms, or messages. Do not use as a substitute for the site's design system, accessibility requirements, or understanding the person's task.

## Environment

Any platform and interface technology. Review requires representative tasks, realistic content, and people who have not learned the screen.

## Solution

Combine three named design sources.

**Tufte** supplies information in context: keep the data needed for judgment, place comparisons near the values they explain, and remove marks that contribute no meaning. A compact trend can explain a number without sending the reader elsewhere.

**Rams** supplies purpose and honesty: each element earns its place through usefulness. Controls reveal their function, states describe reality, and details receive the same care as the main task.

**Ive** supplies the product that needs no manual, and the first-generation iPod is the standard this pattern aims at. It had a scroll wheel and five buttons, and nothing to learn: a person turned it on and used it, with no manual and no instructions on the screen. Give the main task one obvious control, let each control show by its form what it does, and answer every touch at once.

Join these into a practical test: an unfamiliar reader can identify the screen's purpose and complete its main task without coaching, while retaining access to the evidence needed for a sound decision. Aim ordinary instructional prose at roughly a fourth-grade reading level; verify understanding with people.

## Ports

- **DesignReview:** Judges a screen against its main task and identifies concrete failures and remedies.

## Rules

1. **Give the main task one clear primary action,** because competing emphasis forces people to decide which control matters before doing their work.
2. **Require a useful job for every element,** because each addition consumes attention. Remove decoration that supplies no meaning while retaining context that changes a decision.
3. **Explain the main task through the controls themselves,** because a mandatory tour or tooltip excludes people who miss it. Supplemental help can explain uncommon details.
4. **Place comparisons beside values,** because an isolated number hides scale, direction, and significance. Label units and the basis of comparison.
5. **Show the answer before supporting detail,** because most readers need orientation first. Keep the full record reachable; simplicity must not conceal qualifications or uncertainty.
6. **Use short, familiar words and meaningful labels,** because readers should understand actions without decoding internal terminology. Measure readability and investigate difficult passages.
7. **Distinguish empty, loading, partial, failed, and completed states in words,** because blankness and optimistic indicators can falsely imply success.
8. **Keep the task usable on narrow screens and without a pointer,** because screen size and input method must not determine whether someone can complete it. Preserve visible focus and readable feedback.
9. **Treat names, comments, and highlighted excerpts as untrusted content,** because a clear interface can still expose people to executable markup. Render text safely and keep emphasis separate from source markup.
10. **Review with representative people and content,** because a designer's familiarity can hide missing cues. A readability score or uncluttered screenshot alone does not prove understanding.

## Conformance

1. Given an unfamiliar reader and a representative task, the reader identifies the purpose and completes the task without coaching.
2. Given every visible element, a reviewer can explain its useful job and identify the single primary action.
3. Given a reported value, its unit and meaningful comparison are available together.
4. Given empty, partial, failed, and completed data, the screen communicates each state truthfully.
5. Given a narrow screen or keyboard-only use, the main task remains reachable and usable.
6. Given difficult prose, measurement and reader testing identify passages needing revision.
7. Given hostile markup in displayed content, it appears safely without executing.

## Swap points

Replace visual styling, components, or layout while preserving task clarity, useful information, honest states, and accessible interaction.

## Sources

- [Rams: *As Little Design as Possible*](https://www.goodreads.com/book/show/7318651-as-little-design-as-possible), the work of Dieter Rams by Sophie Lovell, with a foreword by Jony Ive; the main reference.
- [Rams: ten principles for good design](https://www.vitsoe.com/us/about/good-design).
- [Tufte: books and essays](https://www.edwardtufte.com/); [sparklines, compact trends in context](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/).
- [Ive: the first-generation iPod](https://www.moma.org/collection/works/89465), the no-manual standard this pattern aims at; [Ive on designing the iPod](https://www.wired.com/story/rewired-2021-jony-ive-anna-wintour/).
- [Ive: *Jony Ive: The Genius Behind Apple's Greatest Products*](https://www.amazon.com/dp/159184617X), by Leander Kahney; [Jony Ive's books](https://www.goodreads.com/author/list/5135550.Jonathan_Ive).
- [Plain language guidance](https://digital.gov/guides/plain-language).

## Known gaps

The fourth-grade target is a chosen review standard, not a universal usability threshold. Judgment and representative user observation remain necessary. Readability measures do not assess technical accuracy, accessibility, or whether information is sufficient.
