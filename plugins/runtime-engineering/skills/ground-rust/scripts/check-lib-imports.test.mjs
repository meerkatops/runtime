import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSET = fileURLToPath(new URL("../assets/ci/check-lib-imports.sh", import.meta.url));

// A stand-in for cargo: `cargo tree --workspace` prints the members; `cargo tree -p <crate> --depth 1` prints that
// crate and its direct dependencies, and without --depth its whole tree, all from files the test writes, in cargo
// tree's own "name vX.Y.Z" lines.
const CARGO = `#!/bin/sh
if [ "$2" = "--workspace" ]; then cat "$GRAPH/members"; exit 0; fi
case " $* " in *" --depth 1 "*) cat "$GRAPH/$3" ;; *) cat "$GRAPH/$3.all" ;; esac
`;

/** Runs the asset in a repo whose graph is `deps` (crate to its direct dependencies), with `allowed` set; crates
 * named in `external` are dependencies, not workspace members. */
function run(t, deps, allowed = "", external = []) {
  const repo = mkdtempSync(join(tmpdir(), "check-lib-imports-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  mkdirSync(join(repo, "ci"));
  mkdirSync(join(repo, "bin"));
  mkdirSync(join(repo, "graph"));
  writeFileSync(join(repo, "ci/check-lib-imports.sh"), readFileSync(ASSET, "utf8").replace('allowed=""', `allowed="${allowed}"`));
  chmodSync(join(repo, "ci/check-lib-imports.sh"), 0o755);
  writeFileSync(join(repo, "bin/cargo"), CARGO);
  chmodSync(join(repo, "bin/cargo"), 0o755);
  const line = (name) => `${name} v0.1.0\n`;
  writeFileSync(join(repo, "graph/members"), Object.keys(deps).filter((c) => !external.includes(c)).map(line).join(""));
  for (const [crate, list] of Object.entries(deps)) writeFileSync(join(repo, "graph", crate), [crate, ...list].map(line).join(""));
  const closure = (crate, seen = new Set()) => {
    for (const d of deps[crate] ?? []) if (!seen.has(d)) { seen.add(d); closure(d, seen); }
    return seen;
  };
  for (const crate of Object.keys(deps)) writeFileSync(join(repo, "graph", `${crate}.all`), [crate, ...closure(crate)].map(line).join(""));
  const ran = spawnSync("sh", [join(repo, "ci/check-lib-imports.sh")], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${join(repo, "bin")}:${process.env.PATH}`, GRAPH: join(repo, "graph") },
  });
  return { code: ran.status, out: ran.stdout.trim().split("\n"), err: ran.stderr };
}

const CLEAN = { fixture: ["fixture-core", "tokio"], "fixture-core": ["lib-codec"], "lib-codec": ["serde"], "lib-text": [] };

test("a lib layer with no product crate, no lib edge and no runtime passes", (t) => {
  const { code, out, err } = run(t, CLEAN);
  assert.equal(code, 0, err);
  assert.deepEqual(out, ["check-lib-imports: no product crate and no async runtime under lib-codec lib-text fixture-core"]);
});

test("a lib crate depending on a product crate is refused", (t) => {
  const { code, out } = run(t, { ...CLEAN, "lib-codec": ["fixture-core"] });
  assert.equal(code, 1);
  assert.deepEqual(out, ["check-lib-imports: lib-codec may not depend on fixture-core"]);
});

test("the allowed line never excuses a lib-to-product edge", (t) => {
  const { code, out } = run(t, { ...CLEAN, "lib-codec": ["fixture-core"] }, "lib-codec:fixture-core");
  assert.equal(code, 1);
  assert.deepEqual(out, ["check-lib-imports: lib-codec may not depend on fixture-core"]);
});

test("a lib-to-lib edge is refused until the allowed line lists it", (t) => {
  const graph = { ...CLEAN, "lib-text": ["lib-codec"] };
  const refused = run(t, graph);
  assert.equal(refused.code, 1);
  assert.deepEqual(refused.out, ["check-lib-imports: lib-text may not depend on lib-codec"]);
  assert.equal(run(t, graph, "lib-text:lib-codec").code, 0);
});

test("an async runtime under a lib or a core crate is refused, listed or not, and the entry crate may have one", (t) => {
  const { code, out } = run(t, { ...CLEAN, "fixture-core": ["lib-codec", "tokio"], "lib-text": ["smol"] }, "lib-text:smol");
  assert.equal(code, 1);
  assert.deepEqual(out, [
    "check-lib-imports: lib-text may not depend on the async runtime smol",
    "check-lib-imports: fixture-core may not depend on the async runtime tokio",
  ]);
});

test("a workspace with no lib crate is not a pass", (t) => {
  const { code, err } = run(t, { fixture: [] });
  assert.equal(code, 2);
  assert.match(err, /no lib-\* crate/);
});

test("an async runtime reached through another dependency is refused", (t) => {
  const { code, out } = run(t, { ...CLEAN, "lib-codec": ["serde", "hyper"], hyper: ["tokio"] }, "", ["hyper"]);
  assert.equal(code, 1);
  assert.deepEqual(out, ["check-lib-imports: lib-codec may not depend on the async runtime tokio",
    "check-lib-imports: fixture-core may not depend on the async runtime tokio"]);
});
