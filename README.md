# Runtime

Runtime is a collection of skills and plugins that form a build pipeline for coding agents, with plugins for observability and for agents to talk to each other across sessions and machines.

## Install in Claude Code

```
/plugin marketplace add https://github.com/meerkatops/runtime.git
/plugin install hello-runtime@runtime
```

Then say "run hello-runtime". It prints a line naming your machine.

## The status line

A two-line status line: what the Runtime runner is doing (or "runtime idle"), whether the session or its subagents are working, then context, 5-hour and 7-day use, model and effort, and repo:branch. Needs `jq` and `git`.

```
/plugin install runtime-statusline@runtime
```

Then say "install the status line", or run its `scripts/install.sh`. The status line always runs the newest installed copy, so `claude plugin update runtime-statusline@runtime` is all an update needs.

## Engineering

Engineer and reviewer agents for Rust, TypeScript, Python and React, the coding rulebook they are held to (rules with ids), and five ground skills (Rust, TypeScript, Python, React, Parquet) whose facts cite first-party sources. An engineer writes with a checker in the loop: after each edit a hook runs `cargo check`, `tsc`, or `ruff` and the type checker, and hands the errors back. A reviewer judges a change against the rulebook and the ground skill. macOS and Linux.

```
/plugin install runtime-engineering@runtime
```

Then say "use the rust-engineer agent to ...", or run `/runtime-engineering:coding-rulebook`. The hooks check nothing until you list your repo in `~/.config/engineer-agents/trusted-roots`; see the plugin's [README](plugins/runtime-engineering/README.md) for that and for what each hook needs.

## Patterns

[patterns/](patterns/README.md) holds 45 design patterns for building document intake, indexing, search and review: each one the problem, the rules with their reasons, the operations it provides and the cases every build must pass. Version 1.0.0.

## License

Apache License 2.0. See LICENSE and NOTICE.
