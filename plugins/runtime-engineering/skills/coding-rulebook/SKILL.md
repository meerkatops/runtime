---
name: coding-rulebook
description: Holds our coding rulebook: how we write code for the machine and for the agents that read it, each rule with its source. It has one shared file and one each for Rust, TypeScript, Python and React front ends, each with its tool gate. Use before writing or reviewing code, on "check the coding rulebook" or "are you abiding by the rulebook", and to add a rule.
---

# coding-rulebook

The rules live in five files. Read them with the Read tool:

- `${CLAUDE_SKILL_DIR}/references/shared.md`: the concepts reviewers judge by (C1 to C4: well scaffolded, clean code, anti-slop, reuse), the rules for all languages (A) and for agents (G), and the review bar, severities and report format (B1 to B3). Everyone reads it.
- `${CLAUDE_SKILL_DIR}/references/rust.md`: the R rules.
- `${CLAUDE_SKILL_DIR}/references/typescript.md`: the T rules, which plain Node JavaScript follows too (T23).
- `${CLAUDE_SKILL_DIR}/references/python.md`: the P rules.
- `${CLAUDE_SKILL_DIR}/references/react.md`: the X rules, for a React front end: React, Next.js, CSS and the component library. React code is TypeScript, so its reader reads `typescript.md` too.

An id's letter names its file. Each language file also says how its process leaves a crash record, its tool gate and where its shared libraries live.

## Before writing code

Read `shared.md` and the file of each language the work touches, and load that language's ground skill. After every edit, run what the language file's "Check after every edit" rule names; run the gate before any review and record it as the checks file (`shared.md` B3). In a repo that predates the rulebook, the gate is the repo's own CI command (`shared.md`, Existing repos).

## Check work against it

1. Read `shared.md` and each touched language's file whole.
2. Read the checks file (B3) when you are given one. With none, a builder runs the gate and writes one, and a reviewer says so as B3 describes.
3. Check the work against each rule in those files, reading the code itself, not its description.
4. Grade each break by its consequence (B2) and hold the work to the review bar (B1): good, not perfect. Only a CRITICAL or HIGH you reproduced blocks; the rest is backlog.
5. Report in B3's format; a rule that does not fit the work gets one line in `notes`.

## Add a rule

A rule joins only with its source: a page, a talk with its quote, a paper read, or a failure seen at least twice; a choice of our own that no public source states says `our rule, with no public source` and gives its reason. Add rules only to the five rules files. Follow "Adding a rule" at the end of `shared.md`.
