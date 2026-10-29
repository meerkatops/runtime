# Runtime

Runtime is a collection of skills and plugins that form a build pipeline for coding agents, with plugins for observability and for agents to talk to each other across sessions and machines.

## Install in Claude Code

```
/plugin marketplace add https://github.com/meerkatops/runtime.git
/plugin install hello-runtime@runtime
```

Then say "run hello-runtime". It prints a line naming your machine.

## The status line

A two-line status line: whether the session is working, then context, 5-hour and 7-day use, model and effort, and repo:branch. Needs `jq` and `git`.

```
/plugin install runtime-statusline@runtime
```

Then say "install the status line", or run its `scripts/install.sh`. The status line always runs the newest installed copy, so `claude plugin update runtime-statusline@runtime` is all an update needs.

## License

Apache License 2.0. See LICENSE and NOTICE.
