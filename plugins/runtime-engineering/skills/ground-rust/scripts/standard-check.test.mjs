import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FILES, crateAllows } from "./standard-check.mjs";

const SCRIPT = fileURLToPath(new URL("./standard-check.mjs", import.meta.url));
const ASSETS = fileURLToPath(new URL("../assets/", import.meta.url));

const MAP_NONE = "# MAP\n\n## Differences from the standard\n\nNone.\n";

/** A repo holding every file the standard names, its own values where the standard leaves them per repo. */
function standardRepo(t) {
  const repo = mkdtempSync(join(tmpdir(), "standard-check-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  for (const file of FILES) {
    const content = file.asset ? readFileSync(join(ASSETS, file.asset), "utf8") : `${file.path}\n`;
    put(repo, file.path, content);
  }
  const manifest = readFileSync(join(ASSETS, "workspace.Cargo.toml"), "utf8")
    .replaceAll("<product>", "fixture")
    .replace('version = "0.1.0"\nedition', 'version = "2.3.4"\nedition')
    .replace("[workspace.dependencies]\n", '[workspace.dependencies]\nserde = { version = "1", features = ["derive"] }\n');
  put(repo, "Cargo.toml", manifest);
  put(repo, "MAP.md", MAP_NONE);
  return repo;
}

function put(repo, path, content) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
}

function run(repo) {
  const ran = spawnSync(process.execPath, [SCRIPT, repo], { encoding: "utf8" });
  return { code: ran.status, lines: ran.stdout.trim().split("\n") };
}

test("a repo on the standard passes, its per-repo version, repository and dependencies not counted", (t) => {
  const { code, lines } = run(standardRepo(t));
  assert.equal(code, 0, lines.join("\n"));
  assert.deepEqual(lines, ["standard-check: matches the standard"]);
});

test("no gitleaks config is vendored: the scan uses the CLI's built-in rules", (t) => {
  assert.ok(!FILES.some((f) => f.path === "ci/gitleaks.toml"));
  const { code, lines } = run(standardRepo(t));
  assert.equal(code, 0, lines.join("\n"));
  assert.doesNotMatch(readFileSync(join(ASSETS, "ci/gitleaks.sh"), "utf8"), /--config|ci\/gitleaks\.toml/);
});

test("an unlisted difference fails, one line naming the file and the key", (t) => {
  const repo = standardRepo(t);
  const manifest = readFileSync(join(repo, "Cargo.toml"), "utf8").replace('panic = "abort"\ndebug = "line-tables-only"', 'panic = "abort"\ndebug = "full"');
  put(repo, "Cargo.toml", manifest);
  rmSync(join(repo, "ci/schema-check.sh"));
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes('Cargo.toml: [profile.release] debug = "full", standard "line-tables-only"'), lines.join("\n"));
  assert.ok(lines.includes("ci/schema-check.sh: missing"), lines.join("\n"));
  assert.equal(lines.at(-1), 'standard-check: 2 differences, 2 not listed under "## Differences from the standard" in MAP.md, 0 refused');
});

test("a difference listed in MAP.md by file name passes and is still printed", (t) => {
  const repo = standardRepo(t);
  const check = readFileSync(join(repo, "ci/check.sh"), "utf8") + "step doc cargo doc --workspace --locked --no-deps\n";
  put(repo, "ci/check.sh", check);
  put(repo, "MAP.md", "# MAP\n\n## Differences from the standard\n\n- `ci/check.sh` also builds the docs.\n\n## Next\n");
  const { code, lines } = run(repo);
  assert.equal(code, 0, lines.join("\n"));
  const at = check.split("\n").length - 1;
  assert.equal(lines[0], `ci/check.sh: line ${at} not in the standard: step doc cargo doc --workspace --locked --no-deps (listed in MAP.md)`);
});

test("a file named only outside the heading is not listed", (t) => {
  const repo = standardRepo(t);
  rmSync(join(repo, "THIRD-PARTY"));
  put(repo, "MAP.md", "# MAP\n\nTHIRD-PARTY is not needed.\n\n## Differences from the standard\n\nNone.\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.equal(lines[0], "THIRD-PARTY: missing");
});

// Lints: deny at the workspace, allowed per crate the MAP names, every other relaxation refused.

const UNSAFE_MAP =
  "# MAP\n\n## Unsafe crates\n\n| Crate | Why | Proof |\n|---|---|---|\n| `fixture-core` | the codec reads aligned u32 words | `ci/proof/miri-fixture-core.sh` |\n\n## Differences from the standard\n\nNone.\n";
const MEMBER = '[package]\nname = "fixture-core"\n\n[lints]\nworkspace = true\n';

test("the standard's workspace denies unsafe_code, and a listed crate allowing it beside unsafe_op_in_unsafe_fn passes", (t) => {
  const repo = standardRepo(t);
  assert.match(readFileSync(join(repo, "Cargo.toml"), "utf8"), /unsafe_code = "deny"/);
  put(repo, "MAP.md", UNSAFE_MAP);
  put(repo, "crates/fixture-core/Cargo.toml", MEMBER);
  put(repo, "crates/fixture-core/src/lib.rs", "#![allow(unsafe_code)]\n#![deny(unsafe_op_in_unsafe_fn)]\n//! codec\n");
  const { code, lines } = run(repo);
  assert.equal(code, 0, lines.join("\n"));
  assert.deepEqual(lines, ["standard-check: matches the standard"]);
});

test("a crate allowing unsafe_code that MAP.md does not list is refused, even when Differences names the file", (t) => {
  const repo = standardRepo(t);
  put(repo, "MAP.md", "# MAP\n\n## Unsafe crates\n\n| Crate | Why | Proof |\n|---|---|---|\n| None | | |\n\n## Differences from the standard\n\n- `crates/fixture-core/src/lib.rs` allows unsafe.\n");
  put(repo, "crates/fixture-core/Cargo.toml", MEMBER);
  put(repo, "crates/fixture-core/src/lib.rs", "#![allow(unsafe_code)]\n#![deny(unsafe_op_in_unsafe_fn)]\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.equal(lines[0], "crates/fixture-core/src/lib.rs: #![allow(unsafe_code)] in a crate MAP.md does not list under ## Unsafe crates (refused)");
});

test("a listed crate without #![deny(unsafe_op_in_unsafe_fn)] is refused", (t) => {
  const repo = standardRepo(t);
  put(repo, "MAP.md", UNSAFE_MAP);
  put(repo, "crates/fixture-core/Cargo.toml", MEMBER);
  put(repo, "crates/fixture-core/src/lib.rs", "#![allow(unsafe_code)]\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.equal(lines[0], "crates/fixture-core/src/lib.rs: #![allow(unsafe_code)] without #![deny(unsafe_op_in_unsafe_fn)] (refused)");
});

test("a workspace forbid with a crate allow is refused as E0453, and forbid alone is a listable difference", (t) => {
  const repo = standardRepo(t);
  put(repo, "Cargo.toml", readFileSync(join(repo, "Cargo.toml"), "utf8").replace('unsafe_code = "deny"', 'unsafe_code = "forbid"'));
  put(repo, "MAP.md", UNSAFE_MAP.replace("None.", "- `Cargo.toml` forbids unsafe: no kernel yet."));
  put(repo, "crates/fixture-core/Cargo.toml", MEMBER);
  put(repo, "crates/fixture-core/src/lib.rs", "#![allow(unsafe_code)]\n#![deny(unsafe_op_in_unsafe_fn)]\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes('Cargo.toml: [workspace.lints.rust] unsafe_code = "forbid", standard "deny" (stricter; name Cargo.toml under MAP.md Differences, or move to deny when a crate needs the allow) (listed in MAP.md)'), lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-core/src/lib.rs: #![allow(unsafe_code)] under a workspace forbid cannot compile (E0453); the workspace sets deny (refused)"), lines.join("\n"));
  rmSync(join(repo, "crates"), { recursive: true });
  assert.equal(run(repo).code, 0);
});

test("a workspace lint the standard sets, deleted, is refused even when listed", (t) => {
  const repo = standardRepo(t);
  put(repo, "Cargo.toml", readFileSync(join(repo, "Cargo.toml"), "utf8").replace(/^unsafe_code = "deny".*\n/m, ""));
  put(repo, "MAP.md", "# MAP\n\n## Differences from the standard\n\n- `Cargo.toml` drops the unsafe lint.\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes('Cargo.toml: [workspace.lints] unsafe_code is missing; the standard sets "deny" (refused)'), lines.join("\n"));
});

test("a workspace lint below the standard's level is refused even when listed", (t) => {
  const repo = standardRepo(t);
  put(repo, "Cargo.toml", readFileSync(join(repo, "Cargo.toml"), "utf8").replace('unsafe_code = "deny"', 'unsafe_code = "allow"'));
  put(repo, "MAP.md", "# MAP\n\n## Differences from the standard\n\n- `Cargo.toml` allows unsafe.\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes('Cargo.toml: [workspace.lints] unsafe_code = "allow" is below the standard\'s "deny" (refused)'), lines.join("\n"));
});

test("a stray crate-level allow of a workspace lint or a clippy group is refused", (t) => {
  const repo = standardRepo(t);
  put(repo, "crates/fixture-app/Cargo.toml", MEMBER.replace("fixture-core", "fixture-app"));
  put(repo, "crates/fixture-app/src/lib.rs", "#![allow(clippy::pedantic)]\n#![expect(clippy::unwrap_used, reason = \"hurry\")]\n");
  put(repo, "crates/fixture-adapters/Cargo.toml", '[package]\nname = "fixture-adapters"\n\n[lints.clippy]\nunwrap_used = "allow"\n');
  put(repo, "crates/fixture-adapters/src/lib.rs", "//! adapters\n");
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-app/src/lib.rs: #![allow(clippy::pedantic)] relaxes a workspace lint (refused)"), lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-app/src/lib.rs: #![allow(clippy::unwrap_used)] relaxes a workspace lint (refused)"), lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-adapters/Cargo.toml: [lints] must be workspace = true and nothing else (refused)"), lines.join("\n"));
  assert.equal(lines.at(-1), 'standard-check: 3 differences, 0 not listed under "## Differences from the standard" in MAP.md, 3 refused');
});

test("an allow whose reason holds parentheses, and one under cfg_attr, are still seen", (t) => {
  const repo = standardRepo(t);
  put(repo, "crates/fixture-app/Cargo.toml", MEMBER.replace("fixture-core", "fixture-app"));
  put(
    repo,
    "crates/fixture-app/src/lib.rs",
    '#![allow(clippy::unwrap_used, reason = "a (b)")]\n#![cfg_attr(test, expect(clippy::panic, reason = "x"))]\n#![allow(dead_code, reason = "no, (really)")]\n',
  );
  const { code, lines } = run(repo);
  assert.equal(code, 1, lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-app/src/lib.rs: #![allow(clippy::unwrap_used)] relaxes a workspace lint (refused)"), lines.join("\n"));
  assert.ok(lines.includes("crates/fixture-app/src/lib.rs: #![allow(clippy::panic)] relaxes a workspace lint (refused)"), lines.join("\n"));
  assert.equal(lines.filter((l) => l.includes("dead_code")).length, 0, "dead_code is not a workspace lint");
  assert.deepEqual(crateAllows('#![expect(clippy::a, clippy::b, reason = "c, (d)")]\n#![cfg_attr(not(test), allow(unsafe_code))]'), [
    "clippy::a",
    "clippy::b",
    "unsafe_code",
  ]);
});

test("a member whose [lints] is the dotted lints.workspace = true inherits", (t) => {
  const repo = standardRepo(t);
  put(repo, "crates/fixture-app/Cargo.toml", 'lints.workspace = true\n\n[package]\nname = "fixture-app"\n');
  put(repo, "crates/fixture-app/src/lib.rs", "//! app\n");
  const { code, lines } = run(repo);
  assert.equal(code, 0, lines.join("\n"));
});

test("the compiler-fact fixtures each name their expectation", () => {
  const dir = fileURLToPath(new URL("./fixtures/compiler-facts/", import.meta.url));
  const expected = {
    "allow-below-deny.rs": /^\/\/ expect: compiles/,
    "allow-below-forbid.rs": /^\/\/ expect: E0453/,
    "set-var-2024.rs": /^\/\/ expect: E0133/,
    "float-rounding.rs": /^\/\/ expect: prints false/,
  };
  for (const [file, line] of Object.entries(expected)) assert.match(readFileSync(join(dir, file), "utf8"), line, file);
});

test("comments and strings hold no crate attribute; a block comment inside one is whitespace", () => {
  assert.deepEqual(crateAllows("// #![allow(unsafe_code)]\nfn main() {}"), []);
  assert.deepEqual(crateAllows("/* a /* nested */ #![allow(a)] */ #![allow(b)]"), ["b"]);
  assert.deepEqual(crateAllows('const S: &str = r#"#![allow(z)]"#; const T: &str = "#![allow(w)]";'), []);
  assert.deepEqual(crateAllows("#![allow(/* why */ unsafe_code)]"), ["unsafe_code"]);
  assert.deepEqual(crateAllows('#![expect(dead_code, reason = "see // here (x)")]'), ["dead_code"]);
});
