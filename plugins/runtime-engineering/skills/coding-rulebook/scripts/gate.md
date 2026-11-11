# gate.mjs

Runs a repo's check steps, the ones in this rulebook's tool gates, and writes the checks file a reviewer reads. CI runs the same command, so reviewers and CI see the same list.

## Install

Copy `gate.mjs` into the repo as `ci/gate.mjs` and commit it. It needs Node 20 or later and the repo's own tools, already installed: `node_modules` for JavaScript, `.venv` (or PATH) for Python, and cargo, cargo-deny and rustfmt for Rust.

## Run

```
node ci/gate.mjs --checks /tmp/checks.jsonl
```

It finds the languages from `Cargo.toml`, `package.json` and `pyproject.toml`, and runs each language's steps:

| Language | Steps |
| --- | --- |
| Rust | fmt check, Clippy with warnings denied, cargo deny, tests |
| JavaScript, TypeScript, React | Next typegen, type check, lint with no warnings, token check, tests, build, browser tests, SBOM |
| Python | ruff format, ruff lint, pyright, pytest, SBOM |

Each step is one line in the checks file: the command, its exit code, the commit, the output's last lines, and its status (`pass`, `fail` or `needs-work`). It prints each step and the checks file's path. It exits 1 when any step fails.

Without `--checks`, it writes the file to a new temporary folder.

## An existing repo: the backlog

```
node ci/gate.mjs --trueup
```

This runs every step and writes `ci/gate-backlog.txt`, listing the steps that fail today. Commit that file. A step on the backlog that fails shows `needs-work` and does not fail the run, so adopting the gate never turns a working repo red. To work through the backlog, fix a step, then delete its line.

## SBOM

npm and uv write a CycloneDX SBOM next to the checks file. A missing exporter shows `needs-work` and never fails the run. Rust has no SBOM step yet. npm needs a `version` in `package.json`.

## CI

Run it before the image build, and keep the checks file and the SBOM with the build:

```yaml
- run: node ci/gate.mjs --checks "$RUNNER_TEMP/checks.jsonl"
- uses: actions/upload-artifact@v4
  with:
    name: gate
    path: ${{ runner.temp }}/*.json*
```
