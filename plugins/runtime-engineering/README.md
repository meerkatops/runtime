# Runtime engineering

Engineer and reviewer agents for Rust, TypeScript, Python and React front ends, the coding rulebook they are held to, and ground skills whose facts cite first-party sources.

## What's inside

- **5 ground skills**: `ground-rust`, `ground-typescript`, `ground-python`, `ground-react` and `ground-parquet`. Each holds facts about its subject, every one with the first-party page it rests on. The three language skills also hold the starting files for a new repo, and `ground-react` a starting app: Next.js with Material UI themed from one CSS token file, its lint config, a component test and a browser test.
- **The coding rulebook** (`coding-rulebook`): how we write code, one shared file and one file each for Rust, TypeScript, Python and React. Every rule has an id (A2, R14, T23, P5, X7) and a source, or says it is our own rule and why.
- **4 engineer agents**: `rust-engineer`, `typescript-engineer`, `python-engineer` and `react-engineer`. Each writes and changes code in its language; `react-engineer` builds front ends: React, Next.js, CSS, Material UI and their tests.
- **4 reviewer agents**: `rust-review`, `typescript-review`, `python-review` and `react-review`. Each judges a diff you hand it and has no write tool.

How they fit:

- An engineer writes with a checker in the loop. After each edit, a hook runs `cargo check`, `tsc`, or `ruff` and the type checker on what changed, and hands the errors back.
- An engineer ends by running the gate (the repo's lint, type check and tests) and writing the results to a checks file.
- A reviewer judges the diff and that checks file against the rulebook and its language's ground skill.
- Each rule has one home. The agents point at the rulebook and the ground skills and restate none of them.
- React code is TypeScript. The React rules (X) build on the TypeScript rules (T) and restate none; `react-engineer` and `react-review` read both files and load `ground-typescript` beside `ground-react`. On a front-end change, run `react-review` beside `typescript-review`.

## Install

```
/plugin marketplace add https://github.com/meerkatops/runtime.git
/plugin install runtime-engineering@runtime
```

## Use

Invoke an agent by name, or ask for it in plain words:

```
@agent-runtime-engineering:rust-engineer add a retry to the fetch in crates/client
```

The engineer's reply names its checks file. A reviewer cannot run git, so write the change to a diff file in a private folder, then hand the reviewer both (see [Reviews](#reviews)):

```
D=$(mktemp -d) && git add -N . && git diff HEAD > "$D/change.diff" && echo "$D/change.diff"
```

```
@agent-runtime-engineering:rust-review review the diff in <the path it printed>; the checks file is <the path the engineer named>
```

Run a skill as a command, or let Claude load it when the task matches:

```
/runtime-engineering:ground-rust
/runtime-engineering:coding-rulebook
```

## Trusted roots

The hooks check nothing until you list the repo. The checkers run project code (build scripts, proc macros, the project's own `tsc`, mypy plugins), so no hook can make an untrusted repo safe, and nothing is trusted by default.

List each repo, or a folder that holds your repos, in `~/.config/engineer-agents/trusted-roots`, one absolute path per line:

```
mkdir -p ~/.config/engineer-agents
echo "$HOME/code/my-repo" >> ~/.config/engineer-agents/trusted-roots
```

The file is read only when it is a regular file you own, not a symlink, and not writable by group or others (`chmod 644` it if your umask leaves it wider).

## Check it works

In a repo you listed, ask an engineer to break something on purpose and repeat what the hook told it:

```
@agent-runtime-engineering:typescript-engineer write a scratch file in a folder the tsconfig includes holding `export const n: number = "one";`, quote the hook's report word for word, then delete the file
```

The reply should quote a `tsc --noEmit` report naming error TS2322. "not a trusted repo; type check skipped" means the repo is not under a listed root. No report at all means the hook did not run: check [Requirements](#requirements). The same test works with a Rust or a Python file. To prove a hook with no agent, run its test suite (see [Tests](#tests)).

## What the hooks do

- They run only inside the four engineer agents, never in your main session or in another agent. `typescript-engineer` and `react-engineer` share the `tsc` hook.
- They never block. A report arrives as context for the agent, which fixes what it names.
- After a Bash command they look at every changed, untracked or deleted file `git status` lists. A deleted or renamed file's crate or project is checked too, since the files that imported it are now broken.
- Each skip (not a trusted repo, a missing tool, a pinned toolchain that is not installed, a file in no tsconfig) is said once per session. Silence there after that means unchecked, not clean.

## Requirements

macOS and Linux. Windows is not supported.

- **All hooks**: `git`.
- **Rust hook**: `python3` 3.11 or later, `rustup` and `cargo`. It never installs a toolchain; a workspace whose pinned toolchain is missing is skipped.
- **TypeScript hook** (`typescript-engineer` and `react-engineer`): `python3`, Node, and the project's own `node_modules/typescript`, version 5 or 6. TypeScript 7 has no JavaScript compiler API, so on a TypeScript 7 project the hook says it cannot run.
- **React gate**: the hook checks types only. `react-engineer`'s final gate runs the repo's own ESLint, Vitest, build and Playwright, so Playwright's browser must be installed (`npx playwright install chromium`); a missing tool is reported, never fetched.
- **Python hook**: `python3`, `ruff` and `pyright`, from the project's environment or `PATH`. When the project configures mypy (`mypy.ini`, `.mypy.ini`, `[tool.mypy]` in `pyproject.toml` or `[mypy]` in `setup.cfg`), the hook runs mypy from the project's own environment (`.venv` or `venv`) instead of pyright.

- **Codex and other agents**: the skills and the agent instructions are plain Markdown and work anywhere they are loaded, but the hooks are Claude Code hooks and do not run there. In Codex, the engineer runs its tool gate by hand after each edit and before it finishes, as its instructions say.

Each hook has one total deadline in seconds, which an environment variable overrides:

| Variable | Default |
| :- | :- |
| `RUST_ENGINEER_DEADLINE_S` | 300 |
| `TYPESCRIPT_ENGINEER_DEADLINE_S` | 240 |
| `PYTHON_ENGINEER_DEADLINE_S` | 240 |

Hook state lives in `~/.cache/<agent>-hooks`, such as `~/.cache/rust-engineer-hooks`, or under `$XDG_STATE_HOME` when that is set.

## Reviews

A reviewer has no Bash. It cannot run git, so it cannot find "the last commit", and it cannot run the gate. Hand it both:

- **The change**: a diff file or a pasted diff. In a private folder (`D=$(mktemp -d)`), `git diff main...HEAD > "$D/change.diff"` writes a branch's change and `git add -N . && git diff HEAD > "$D/change.diff"` writes uncommitted work, new files included. To have code judged as it stands instead, name the paths and the sha. Handed neither, the reviewer returns its scope line and a note saying what is missing; it does not guess.
- **The checks file**: before it returns, each engineer runs the gate and writes the results as JSON Lines, one object per gate step with the command, its exit code, the commit and its last lines. The file sits in your temp folder and the engineer's reply names its path. Rule B3 in the rulebook's `references/shared.md` gives the format. With no checks file the reviewer still judges the code and says the gate was not supplied.

A reviewer returns three things and writes no file: a scope line, one JSON line per finding (JSONL), and a verdict block with the counts by severity. It has no web access, since it reads untrusted code: it cites only pages its skills name, marks any other claim as a belief for you to verify, and loads `ground-parquet` through the Skill tool when the change touches Parquet.

## Words the rulebook uses

- **Phases, cards, tasks**: work is planned as phases, each phase as cards, each card as tasks. A review judges one card's change, or a scope of code with no card.
- **Existing repos**: in a repo that predates the rulebook, the repo's own CI is the gate. The rulebook's tool gate applies to new repos, and its rules to the lines a change adds.
- **Units**: every quantity has its unit in its name (`length_ft`, `timeout_ms`). Data that arrives in another unit stays as it came, named with its unit, and is converted when it is used.

## Models, CLAUDE.md and permissions

- All eight agents name their model by the alias `opus`, at medium effort. Claude Code resolves the alias to the Opus version recommended for your provider, so your account needs access to an Opus model.
- The reviewers set `omitClaudeMd`, so they start without your CLAUDE.md files and judge by the rulebook alone. This needs Claude Code v2.1.271 or later.
- The engineers keep project memory in `.claude/agent-memory/<agent>/` in your repo.
- The agents read the rulebook and ground skill files from the plugin's folder, and a reviewer reads the diff and checks file you hand it. Where your permission settings prompt for reads outside the project, allow Read on the plugin's folder under `~/.claude/plugins/` and on those files.
- A reviewer's Skill calls ask permission where your settings require it.

## Tests

The hooks ship with their own tests in `engineers/hooks/`: `test-cargo-hooks.sh`, `test-ts-hooks.sh` and `test-py-hooks.sh`. Each feeds its hook crafted inputs in a scratch HOME and prints a pass and fail count; each file's header names what it needs.

```
TMPDIR=/tmp sh engineers/hooks/test-cargo-hooks.sh
TMPDIR=/tmp TS_PKG=<a TypeScript 5 or 6 package folder> sh engineers/hooks/test-ts-hooks.sh
TMPDIR=/tmp sh engineers/hooks/test-py-hooks.sh
```

## License

Apache License 2.0. See LICENSE and NOTICE at the repository root.
