#!/usr/bin/env node
// Runs this repo's check steps from the coding rulebook's tool gates and writes the checks file reviewers read.
//   node ci/gate.mjs [--dir FOLDER]... [--checks FILE]   run every step; exit 1 when a step not on the backlog fails
//   node ci/gate.mjs [--dir FOLDER]... --trueup          also write ci/gate-backlog.txt: the steps failing today
// Each --dir is a folder holding a Cargo.toml, package.json or pyproject.toml (default: the repo root), so one copy
// serves a monorepo. A step on the backlog that fails is "needs-work", so an existing repo is not red on day one.
// A tool that is not installed always fails and never goes on the backlog. No steps found at all exits 2.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BACKLOG = "ci/gate-backlog.txt";
const bin = (tool) => join("node_modules", ".bin", tool);

/** The steps for one folder, run from that folder, and the languages it has no manifest for. */
function steps(dir) {
  const has = (f) => existsSync(join(dir, f));
  const py = (tool) => (has(join(".venv", "bin", tool)) ? join(".venv", "bin", tool) : tool);
  const pkg = has("package.json") ? JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) : null;
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const list = [];
  if (has("Cargo.toml")) {
    list.push(
      ["rust:fmt", ["cargo", "fmt", "--all", "--", "--check"]],
      ["rust:clippy", ["cargo", "clippy", "--all-targets", "--all-features", "--locked", "--", "-D", "warnings", "-W", "clippy::pedantic"]],
      ["rust:deny", ["cargo", "deny", "check"]],
      ["rust:test", ["cargo", "test", "--all-targets", "--locked"]],
    );
  }
  if (pkg !== null) {
    const next = "next" in deps;
    const vite = "vite" in deps;
    if (next) list.push(["js:typegen", [bin("next"), "typegen"]]);
    if (has("tsconfig.json")) list.push(["js:typecheck", [bin("tsc"), "--noEmit", "-p", "tsconfig.json"]]);
    list.push(["js:lint", [bin("eslint"), ".", "--max-warnings", "0"]]);
    if (has("tools/check-tokens.mjs")) list.push(["js:tokens", ["node", "tools/check-tokens.mjs"]]);
    list.push(["js:test", pkg.scripts?.test ? ["npm", "test"] : ["node", "--test"]]);
    if (next) list.push(["js:build", [bin("next"), "build"]], ["js:e2e", [bin("playwright"), "test"]]);
    else if (vite) list.push(["js:build", [bin("vite"), "build"]]);
    list.push(["js:sbom", ["npm", "sbom", "--sbom-format", "cyclonedx", "--package-lock-only"], "sbom-js.cdx.json"]);
  }
  if (has("pyproject.toml")) {
    list.push(
      ["python:format", [py("ruff"), "format", "--check"]],
      ["python:lint", [py("ruff"), "check"]],
      ["python:types", [py("pyright")]],
      ["python:test", [py("pytest")]],
      ["python:sbom", ["uv", "export", "--locked", "--offline", "--format", "cyclonedx1.5"], "sbom-python.cdx.json"],
    );
  }
  const skipped = [["rust", "Cargo.toml"], ["js", "package.json"], ["python", "pyproject.toml"]].filter(([, f]) => !has(f));
  return { list, skipped };
}

const args = process.argv.slice(2);
const trueup = args.includes("--trueup");
const at = args.indexOf("--checks");
const checks = at >= 0 ? args[at + 1] : join(mkdtempSync(join(tmpdir(), "gate-")), "checks.jsonl");
const dirs = args.flatMap((a, i) => (a === "--dir" ? [args[i + 1]] : []));
if (dirs.length === 0) dirs.push(".");
const backlog = existsSync(BACKLOG) ? readFileSync(BACKLOG, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
const sha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();

const lines = [];
const failing = [];
const missing = [];
let failed = false;
let ran = 0;
const record = (step, exit_code, output, status, id) => {
  lines.push(JSON.stringify({ step, exit_code, sha, output, status }));
  console.log(`${status.padEnd(10)} ${id}`);
};
for (const dir of dirs) {
  const prefix = dir === "." ? "" : `${dir}:`;
  const { list, skipped } = steps(dir);
  for (const [lang, manifest] of skipped) record(`${prefix}${lang}`, null, `no ${manifest} in ${dir}: not checked`, "skipped", `${prefix}${lang}`);
  for (const [name, [cmd, ...argv], sbomFile] of list) {
    const id = `${prefix}${name}`;
    const run = spawnSync(cmd, argv, { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    ran += 1;
    const exit = run.error ? null : run.status;
    const text = run.error ? `${cmd}: not installed` : `${run.stdout}${run.stderr}`;
    const sbom = sbomFile && `${prefix.replaceAll(/[/:]/g, "-")}${sbomFile}`;
    if (sbom && exit === 0) writeFileSync(join(checks, "..", sbom), run.stdout);
    const ok = exit === 0;
    // An SBOM is still being worked out: a missing exporter is needs-work, never a failure.
    // A tool that is not installed fails, so a skipped check never looks like a pass.
    const status = ok ? "pass" : sbomFile ? "needs-work" : run.error ? "fail" : backlog.includes(id) ? "needs-work" : "fail";
    if (!ok && !sbomFile) (run.error ? missing : failing).push(id);
    if (status === "fail") failed = true;
    const output = (sbom && ok ? `wrote ${sbom}` : text).trimEnd().split("\n").slice(-30).join("\n");
    record([cmd, ...argv].join(" "), exit, `${dir === "." ? "" : `in ${dir}: `}${output}`, status, id);
  }
}
writeFileSync(checks, `${lines.join("\n")}\n`);
console.log(`checks: ${checks}`);
if (ran === 0) {
  console.error(`gate: no Cargo.toml, package.json or pyproject.toml in ${dirs.join(", ")}: nothing was checked; name the folders with --dir`);
  process.exit(2);
}
if (missing.length > 0) console.error(`not installed, so failing until installed: ${missing.join(", ")}`);

if (trueup) {
  writeFileSync(BACKLOG, `# Steps failing when the gate was adopted. Fix one, remove its line.\n${failing.join("\n")}\n`);
  console.log(`wrote ${BACKLOG}: ${failing.length} step(s) on the backlog`);
  process.exit(0);
}
process.exit(failed ? 1 : 0);
