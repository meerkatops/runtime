# The coding rulebook

How we write code for the machine that runs it and for the agents that read and change it. Each rule has an id, says what a reviewer checks, and names its source: a page, a talk, a paper or a repeated failure. A rule that is our own choice, with no public source behind it, says so in those words and gives its reason. A rule a tool enforces names the tool.

The rulebook is five files. This one, `shared.md`, holds what applies to every language: the Concepts (ids C), All languages (A), For agents (G), the review bar and the review report (B), and how to add a rule. `rust.md` holds the R rules, `typescript.md` the T rules, `python.md` the P rules and `react.md` the X rules, for a React front end, which is TypeScript and so follows the T rules too; each language file also holds how that language meets the shared rules, its crash record (A6), its tool gate and its shared-library home. An id names its file by its letter, so a rule cited from another file (R15 from a TypeScript rule, say) is read there. The builder reads this file and the touched language's file before writing, and that language's reviewer (rust-review, typescript-review, python-review, react-review) judges against both, beside any other reviews. Every reviewer holds work to the review bar (B1), grades by consequence (B2), reports in one format (B3) and judges scaffolding, cleanliness, slop and reuse by the Concepts section's definitions (C1 to C4).

**Existing repos.** In a repo that predates this rulebook, the repo's own CI command is the gate; the rulebook's tool gate applies to new repos, and its rules to the lines a change adds. `scripts/gate.mjs` in this skill runs the tool gate in any repo and writes the checks file; `scripts/gate.md` says how to adopt it in an existing repo without turning it red.

Papers are cited by arXiv id, read at https://arxiv.org/abs/<id>.

Talks, cited by short name:

- Torvalds: https://www.youtube.com/watch?v=-xbzGngfQEw
- Karpathy, using LLMs: https://www.youtube.com/watch?v=7YEHs2SMaVQ
- Karpathy, Stanford: https://www.youtube.com/watch?v=XdbpCM4yGyE
- Ng, graph engineering: https://www.youtube.com/watch?v=pj341YTkh48
- Lead architect, coding agents: https://www.youtube.com/watch?v=mkN4uRZYPfs
- Cherny, prompting: https://www.youtube.com/watch?v=qyPCVqFUyDo
- Pocock, AI coding: https://www.youtube.com/watch?v=-QFHIoCo-Ko
- Rust for AI engineering: https://www.youtube.com/watch?v=R-tLX37Xgx8
- Why not Rust: https://www.youtube.com/watch?v=meEXag1XCFw
- Ronacher: https://www.youtube.com/watch?v=45kVol96IlM

## Concepts

Four words the rules and the reviewers use, defined once, here. A reviewer who judges one of them cites its id and carries no definition of its own.

**C1. Well scaffolded.** A repo is well scaffolded when its structure is written down and checked before the bodies exist: a map names each module's one place and the direction dependencies run between layers (`MAP.md`, `structure-map.json`); each module's public face is declared as typed signatures or stubs a person designed (G3); and the tool gate runs from the first commit. A change is well scaffolded when it fills that structure: each file where the map puts it, each export matching its declared signature, each stub filled by the task that owns it, and no new face, layer or dependency the task did not name. Source: our definition, from G3 and its sources (Pocock: "design the interface… delegate the implementation"; Lead architect: scaffold the signatures); Ousterhout, A Philosophy of Software Design (deep modules), https://web.stanford.edu/~ouster/cgi-bin/aposd.php.

**C2. Clean code.** Code is clean when an engineer who did not write it can understand it quickly and change it without breaking it. In this rulebook's terms: each function does one job and each file holds one subject (G4); names say what happens (A2); it is no more complex or general than today's task needs (G1); effects sit at the edges (A3); failure is loud (A4); a comment says why, never what the code already says; and nothing dead or commented out remains. Clean is judged by the reader's cost, not by taste: what a formatter or a linter decides belongs to the tool gate, not to a finding. Source: https://google.github.io/eng-practices/review/reviewer/looking-for.html ("'Too complex' usually means 'can't be understood quickly by code readers'"; over-engineering).

**C3. Anti-slop.** Slop is output that looks like work and carries none: it adds volume without adding behavior someone asked for, or proof that the behavior holds. Its forms: a test that proves nothing (it passes with the behavior removed, asserts only that code ran, or mirrors the implementation); debris (dead code, unused parameters, leftover debug output, commented-out code, placeholder bodies, files nothing calls); work larger than its result (an abstraction, option, layer or defensive branch for a case that does not exist, G1); a default or a catch that hides a failure so the output looks finished (A4); a name, API or package that was invented rather than read (P10); and comment noise (a comment that restates its line, narrates the change or addresses the reviewer). Anti-slop is the standard that every line of a change traces to the task and would be missed if deleted: remove it and a test fails or a requirement goes unmet. Source: our definition, resting on Karpathy, using LLMs ("tokens in the context window as a precious resource"; noise lowers accuracy), Lead architect ("write less code") and arXiv 2406.10279 (models recommend packages that do not exist).

**C4. Reuse.** Reuse means a concept has one home and every user imports it. Before writing a type, function, component, schema, module or service, search for the one that exists (the repo, its shared libraries, the standard library, the dependencies already declared, then the organization's shared repos) and extend or import it. A second copy, a near-copy doing the same job, or a new dependency that duplicates one already present is a finding (G2). A common component, a piece two modules or two repos need, lives in the shared-library home its language file names, carrying no caller's types. Reuse is not speculative generality: a piece with one user stays where it is used until a second real user exists (G1). Source: Hunt and Thomas, The Pragmatic Programmer, the DRY principle ("Every piece of knowledge must have a single, unambiguous, authoritative representation within a system"), https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/; G2 and its sources.

## All languages

**A1. Algorithm first, then measure with a named tool.** Get the order of growth right before any micro-optimization. A performance change names its profiler and its before and after numbers; no micro-optimization without a profile. Source: Torvalds ("our algorithms are good before we started the micro optimizations"); https://nnethercote.github.io/perf-book/profiling.html.

**A2. Names say what happens, and every quantity names its unit.** A function that does I/O, allocates heavily, blocks or spawns says so with its verb (`read_`, `write_`, `load_`, `spawn_`, `wait_`). Every quantity carries its unit in its name, in the language's own case (`length_ft`, `distance_m`, `timeout_ms`, `size_bytes`; `lengthFt` in TypeScript). A build has one unit system for its own math and storage, and the builder knows which before writing a quantity: the repo's README or `MAP.md` names it, else the code around the change shows it. Ours is US customary (feet, miles, gallons, psi, pounds, °F). Data that arrives in another unit stays as it came, with its unit in its name, and is converted where it is used, never at the door. This rule is the one home for units: an agent or a language file points here and restates none of it. Source: Torvalds (read the cost off the page); https://rust-lang.github.io/api-guidelines/naming.html; the unit rule is our choice.

**A3. Predictable without running.** Effects happen only at the edges: files, network, git, clock. The core takes values and returns values. Context such as a session id, paths, the clock or config is passed as an argument, never read from a global or thread-local, and no global holds mutable state. Source: Ng (control flow in code; state in, update out); Ronacher (implicit context is lost across async chains); Karpathy, Stanford (short, wide dependency chains).

**A4. Loud, not silent.** A default never stands in for missing or invalid data (`?? 0`, `unwrap_or_default()`, `or ""`); return the absence or the error. Errors carry their inputs (path, id, ref) and their cause in release builds, not only debug. Absence and failure are different results: "not found" is returned only when the thing is absent, and an I/O, decode or corruption error is never folded into it, skipped or counted as skipped. State that marks a step done changes only after the step succeeds. Source: Karpathy, using LLMs (the model put 0.1 for N/A "without telling us"); Ronacher ("the most interesting errors don't happen in debug").

**A5. Tests at the module face, written first.** Each behavior change has a test that failed before it. Test through the module's public face, not every private function. A fast path keeps a plain reference version and a test that compares the two. Source: Pocock ("wrap a big test boundary around that one module", test first is "a lot harder to cheat"); Cherny ("the verification… is probably the single most important thing"); Karpathy, Stanford (a readable reference beside the fast one).

**A6. A crash leaves a record.** A process sets, at its start, a handler for whatever would kill it (a panic, an uncaught exception, an unhandled rejection) that writes a crash record before it exits: the time, the version, the error and its cause, the stack, and the context ids it was given (A3). It records no secret: arguments are redacted, and environment variables are listed by name, never by value. It writes the record synchronously as one JSON line (G5) to a known file or stderr, then exits non-zero; it never resumes, and it never fails itself: an error inside the handler is ignored. Each language file says how. Source: https://doc.rust-lang.org/std/panic/fn.set_hook.html, https://nodejs.org/docs/latest-v24.x/api/process.md, https://docs.python.org/3/library/sys.html#sys.excepthook.

**A7. Configuration is part of the tenant wall.** This rule applies only to a product with tenants; anywhere else, skip it.
1. No tenant's value sits in shared code, or in a shared migration, seed or SQL default: no tenant's name, identifier, setting or limit. Tests and fixtures may name a test tenant.
2. Every configured value is read through the product's one resolver, which returns the value and the layer it came from: the default every tenant gets, then the tenant's own, then the request's. No second store holds the same key.
3. The defaults every tenant gets live in one versioned place, the resolver's default layer.
4. A missing value is refused, naming its key (A4).
5. Every setting has bounds in its schema, enforced on the server, and a count or size computed from a setting is capped before allocation, so no tenant's setting can exhaust the server the tenants share.
6. A configured feature's test runs two tenants with different settings and checks that each answer uses its own tenant's values.

Source: our rule, with no public source. The reason: a setting is tenant data, so a tenant's value in shared code, a second store for one key or a default standing in for a missing value lets one tenant's configuration answer another tenant's request; line 5 is A8's bound applied to settings.

**A8. Untrusted input is bounded before it is read.** Input the code does not own (files, a git store, network bodies, names in either) is capped in bytes, entries, depth and name length before it is read, decoded or allocated, never measured after. Files are opened from a root resolved once, by descriptor with no-follow; names with control characters, `.git` spellings, or that collide under case or Unicode folding are refused. One shared home holds each capped read; a second copy is a finding (G2). Source: https://cwe.mitre.org/data/definitions/770.html (allocation of resources without limits), https://cwe.mitre.org/data/definitions/22.html (path traversal), https://man7.org/linux/man-pages/man2/openat.2.html (`O_NOFOLLOW`, opening relative to a directory descriptor), https://git-scm.com/docs/git-config (`core.protectHFS`, `core.protectNTFS`: names that fold to `.git`).

**A9. Every package carries a version.** Each `package.json`, crate and `pyproject.toml` a repo builds or ships, and each plugin, has a semantic version, starting at `0.1.0` (never `0.0.0` or none), raised on every release. A package without one cannot be named in an SBOM: `npm sbom` refuses it. Source: https://semver.org/, https://docs.npmjs.com/cli/v11/commands/npm-sbom/.

## For agents

**G1. Thin abstractions.** Concrete types and plain functions. A trait, interface or generic needs two real implementations today; a test fake counts. No macro or code generator that hides control flow. Each new dependency is justified, because build time is the agent's feedback loop. Source: Ronacher ("the abstractions are very thin. It understands the code better"); Why not Rust ("concept fatigue", compile times); Lead architect ("write less code").

**G2. One obvious home per concept.** Before adding a type or function, search for the one that exists and extend it. Two near-identical helpers are a finding. Source: Lead architect (a list feature "implemented five times"); Cherny (the "abstraction police" unifies near-duplicates).

**G3. Deep modules with a small, explicit face.** A module exposes few public items, each with concrete argument and return types. People design the signatures; agents fill the bodies. Source: Pocock ("a small, simple interface" with "a lot of functionality inside"; "design the interface… delegate the implementation"); Lead architect (scaffold the signatures).

**G4. A file fits in one read.** Keep a file within the repo's documented file-size limit. Split by concept, not by layer. Delete dead code and stale comments in the same change. Source: Karpathy, using LLMs ("tokens in the context window as a precious resource"; noise lowers accuracy); Pocock (doc rot).

**G5. Structured output for agents.** Output an agent reads is structured (JSON or a stable enum), not prose. Source: Ng ("the agent needs predictable format for its results").

**G6. A rule is enforced by a tool, or it earns its line.** Prefer a lint, a type, a check in CI or a script to prose. A rule added here cites its source; a rule from experience cites the repeated failure. Source: Lead architect ("from non-deterministic to deterministic"); Cherny ("only when you see it repeatedly stumble… add it back").

## The review bar

**B1. Good, not perfect.** Review as a principal engineer at AWS, Google Cloud, Anthropic or OpenAI would: approve a change that makes the code better, even if it is not perfect. Only two things block: a CRITICAL or HIGH finding (B2) you reproduced, by a failing test, a command and its output, or a traced path from input to the wrong result; and a gate that did not pass (B3). Everything else is a note that goes on the backlog, never a reason to hold the change or start another fix round. Every reviewer agent judges by this bar. Source: https://google.github.io/eng-practices/review/reviewer/standard.html ("reviewers should favor approving a CL once it is in a state where it definitely improves the overall code health"; "there is no such thing as 'perfect' code—there is only better code").

**B2. Severity is the consequence, not the rule id.** Any rule's break can be any severity; grade what the break does on a path the code can reach, and say in the finding which consequence you showed.

- **CRITICAL**: input the code does not own can run code or commands, read a secret, or reach data or actions its sender has no right to; or stored data is destroyed or corrupted with no way to recover it.
- **HIGH**: data can be lost or corrupted but recovered; the process can crash or hang; unchecked input passes a boundary; a wrong result is returned with no error; or a security control is weakened without a shown path to CRITICAL.
- **MEDIUM**: a rule is broken and none of those consequences is shown.
- **LOW**: no rule is broken; a senior engineer in that language would write it differently, by a page the finding names.

**B3. The review report: one format.** Work is planned as phases, each phase as cards, each card as tasks; a review judges one card's change, or a scope of code with no card. Whoever checks work against this rulebook, a reviewer agent or a session following the skill, returns these lines as its output and writes no file:

1. One scope line, so zero findings still marks the scope judged: `{"scope": {"repos": [...], "paths": [...], "sha": "...", "card": "..."}}`. `card` is the id of the card or task the change belongs to; leave it out for a scope with no card.
2. One JSON line per finding, in a fenced `jsonl` block with the scope line: `{"agent": "<who judged>", "kind": "language", "severity": "critical" | "high" | "medium" | "low", "repo", "path", "line", "end_line", "rule", "summary", "evidence", "related": [{"repo", "path", "line"}]}`, leaving out a key with no value. `rule` is the rule id, or `gate`, or `idiom`. `summary` says what is wrong and the specific fix; `evidence` is what showed it (the traced path, the command and its output, or the page).
3. One closing fenced `json` block a gate can read: `{"verdict": "pass" | "fail", "critical": n, "high": n, "medium": n, "low": n, "gate": "passed" | "failed" | "not supplied", "notes": [...]}`. `gate` is `"passed"` when the checks file shows every step of the gate, each with exit code 0, on the judged sha; `"failed"` when a step failed, is missing or ran on another sha; `"not supplied"` when no checks file was handed over. `notes` holds one line for each rule skipped because it does not fit this work, with why.

**The verdict: one rule.** The verdict is `"pass"` only when all three hold, and `"fail"` otherwise:

- something was reviewed: a change, or paths with their sha;
- no finding is CRITICAL or HIGH;
- `gate` is `"passed"`, or it is `"not supplied"` and the caller said in so many words that no gate applies to this scope, which a note then quotes. A `"failed"` gate is always a fail.

A pipeline reads the verdict and nothing else to call a review clean, so the verdict carries the gate: counts of zero never make a pass on their own. A reviewer agent restates none of this; it points here.

**What a reviewer is handed.** A reviewer agent has no shell: it cannot run git or the gate, so the caller hands it both. The change comes as a diff, a file (`git diff <base>...HEAD > change.diff`) or pasted text; a scope with no change comes as paths with the sha they stand at. Handed neither, the reviewer judges nothing and guesses nothing: it returns the scope line with empty `paths` and a closing block with `"verdict": "fail"`, zero counts and the note `not reviewed: no diff, and no paths with a sha, were supplied`.

**The checks file** is the gate's recorded results, which the caller hands a reviewer with the change: JSON Lines, one object per gate step, in the order run: `{"step": "<the command as run>", "exit_code": n, "sha": "<the commit it ran on>", "output": "<its last lines>"}`. The builder writes it: at its final gate run, after its last edit, it records every step as it happened, the exact command, its real exit code, `git rev-parse HEAD` (for an uncommitted change, the commit it sits on) and the output's last lines, which hold the result line, in a file at the checks-file path its task names, or, when the task names none, outside the repo in a new private folder from `mktemp -d`, as `<that folder>/<agent>-checks.jsonl`, and names that path in its return. A failed step is written as it failed; a step that did not run has no line. The gate is the one that applies to the repo (Existing repos, above). A step with a non-zero `exit_code`, a step of the gate that the file lacks, or a `sha` that is not the judged one is a MEDIUM finding with `rule` `gate`. A step whose `status` is `needs-work`, one on the repo's gate backlog, is a note, not a finding. With no checks file at all, as in an ad hoc review, that is not a finding: set `"gate": "not supplied"` in the closing block, and the verdict is B3's: fail, with the note that the caller must run the gate, unless the caller said no gate applies.

On a fix re-check, read only the fix diff and the supplied findings, answer each as closed or open in the closing block (`"verdicts": [{"path", "line", "rule", "status": "closed" | "open"}]`), and report nothing new except a CRITICAL or HIGH on a line the fix changed.

## Adding a rule

An id is never reused: a rule that is removed keeps its id, with one line saying it is retired.

1. Find where it belongs: a rule true in any language goes in All languages, one about how agents read and change code in For agents and a word reviewers judge by in Concepts (C), all in `shared.md`; one language's rule goes in that language's file (ids R, T, P), and a front-end rule in `react.md` (ids X).
2. Search all five files first. Sharpen the rule that already says it rather than adding a second.
3. Give it the next id in its section, a bold name, one or two sentences a reviewer can check, and its source: a page's URL, a talk's short name with its quote (a new talk joins the list at the top of `shared.md` with its URL), a paper's arXiv id with the claim it read, or the repeated failure with two sightings linked. A rule that is our own choice has none of these: write `our rule, with no public source` and the reason it holds.
4. Name the tool that enforces it when one can, and prefer adding that tool to adding prose.
