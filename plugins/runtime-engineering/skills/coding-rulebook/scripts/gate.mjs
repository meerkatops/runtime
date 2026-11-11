#!/usr/bin/env node
// Runs this repo's check steps from the coding rulebook's tool gates and writes the checks file reviewers read.
//   node ci/gate.mjs [--checks FILE]   run every step; exit 1 when a step not on the backlog fails
//   node ci/gate.mjs --trueup          run every step and write ci/gate-backlog.txt: the steps failing today
// A step on the backlog that fails is "needs-work", never a failure, so an existing repo is not red on day one.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BACKLOG = "ci/gate-backlog.txt";
const bin = (tool) => join("node_modules", ".bin", tool);
const py = (tool) => (existsSync(join(".venv", "bin", tool)) ? join(".venv", "bin", tool) : tool);

function steps() {
  const has = (f) => existsSync(f);
  const pkg = has("package.json") ? JSON.parse(readFileSync("package.json", "utf8")) : null;
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
  return list;
}

const args = process.argv.slice(2);
const trueup = args.includes("--trueup");
const at = args.indexOf("--checks");
const checks = at >= 0 ? args[at + 1] : join(mkdtempSync(join(tmpdir(), "gate-")), "checks.jsonl");
const backlog = existsSync(BACKLOG) ? readFileSync(BACKLOG, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
const sha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();

const lines = [];
const failing = [];
let failed = false;
for (const [id, [cmd, ...argv], sbomFile] of steps()) {
  const run = spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const exit = run.error ? null : run.status;
  const text = run.error ? `${cmd}: not installed` : `${run.stdout}${run.stderr}`;
  if (sbomFile && exit === 0) writeFileSync(join(checks, "..", sbomFile), run.stdout);
  const ok = exit === 0;
  // An SBOM is still being worked out: a missing exporter is needs-work, never a failure.
  const status = ok ? "pass" : sbomFile || backlog.includes(id) ? "needs-work" : "fail";
  if (!ok) failing.push(id);
  if (status === "fail") failed = true;
  const output = (sbomFile && ok ? `wrote ${sbomFile}` : text).trimEnd().split("\n").slice(-30).join("\n");
  lines.push(JSON.stringify({ step: [cmd, ...argv].join(" "), exit_code: exit, sha, output, status }));
  console.log(`${status.padEnd(10)} ${id}`);
}
writeFileSync(checks, lines.length ? `${lines.join("\n")}\n` : "");
console.log(`checks: ${checks}`);

if (trueup) {
  const keep = failing.filter((id) => !id.endsWith(":sbom"));
  writeFileSync(BACKLOG, `# Steps failing when the gate was adopted. Fix one, remove its line.\n${keep.join("\n")}\n`);
  console.log(`wrote ${BACKLOG}: ${keep.length} step(s) on the backlog`);
  process.exit(0);
}
process.exit(failed ? 1 : 0);
