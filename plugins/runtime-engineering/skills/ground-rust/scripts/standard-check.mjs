#!/usr/bin/env node
// standard-check.mjs - holds a Rust repo's root and ci files to the standard in ground-rust's assets.
//
//     node standard-check.mjs <repo>
//
// Each file the standard names must be present; the config files and the generic ci scripts must also match their
// asset. Prints each difference on one line, marked when the repo's MAP.md names the file under its
// "## Differences from the standard" heading.
//
// Lints are held harder. The workspace sets `unsafe_code = "deny"`; a crate root
// (`crates/<crate>/src/lib.rs` or `main.rs`) may carry `#![allow(unsafe_code)]` only when MAP.md's "## Unsafe crates"
// table names the crate and the root also carries `#![deny(unsafe_op_in_unsafe_fn)]`. Any other crate-level allow or
// expect of a lint the workspace sets (or of a clippy group such as `pedantic`), a `[workspace.lints]` level below the
// standard's, a member manifest whose `[lints]` is not `workspace = true`, or an allow of `unsafe_code` under a
// workspace `forbid` (E0453: it cannot compile) is refused: it is printed "(refused)" and MAP.md cannot list it away.
//
// Exit:
//     0  no difference, or every difference's file is named under that heading
//     1  a difference whose file is not named there, or a refused lint relaxation
//     2  usage error, or the repo cannot be read

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = fileURLToPath(new URL("../assets/", import.meta.url));

// Each repo path the standard names. "toml" compares keys by section, "lines" compares line by line, and no diff
// means presence only.
export const FILES = [
  { path: "Cargo.toml", asset: "workspace.Cargo.toml", diff: "toml" },
  { path: "rust-toolchain.toml", asset: "rust-toolchain.toml", diff: "toml" },
  { path: "rustfmt.toml", asset: "rustfmt.toml", diff: "toml" },
  { path: "clippy.toml", asset: "clippy.toml", diff: "toml" },
  { path: "deny.toml", asset: "deny.toml", diff: "toml" },
  { path: ".gitignore", asset: "gitignore", diff: "lines" },
  { path: "ci/check.sh", asset: "ci/check.sh", diff: "lines" },
  { path: "ci/check-lib-imports.sh", asset: "ci/check-lib-imports.sh", diff: "lines" },
  { path: "ci/schema-check.sh", asset: "ci/schema-check.sh", diff: "lines" },
  { path: "ci/gitleaks.sh", asset: "ci/gitleaks.sh", diff: "lines" },
  { path: "Cargo.lock" },
  { path: "README.md" },
  { path: "LICENSE" },
  { path: "THIRD-PARTY" },
  { path: ".env.example" },
  { path: "MAP.md" },
  { path: "structure-map.json" },
  { path: "catalog/homes.json" },
  { path: "ci/proof/scaffold.sh" },
  { path: ".github/workflows/ci.yml" },
];

// Per-repo values: every product lists its own dependencies, version and repository in the workspace manifest, and
// its own GitHub organization in deny.toml.
const PER_REPO = new Set(["workspace.dependencies", "workspace.package.version", "workspace.package.repository", "sources.allow-org"]);

/** The differences between `repo` and the standard, each `{ path, text, refused? }`; a refused one is a lint
 * relaxation MAP.md cannot list away. */
export function differences(repo) {
  const found = [];
  for (const file of FILES) {
    const at = join(repo, file.path);
    if (!existsSync(at) || !statSync(at).isFile()) {
      found.push({ path: file.path, text: "missing" });
      continue;
    }
    if (!file.diff) continue;
    const ours = readFileSync(join(ASSETS, file.asset), "utf8");
    const theirs = readFileSync(at, "utf8");
    const texts = file.diff === "toml" ? tomlDifferences(ours, theirs) : lineDifferences(ours, theirs);
    for (const text of texts) found.push({ path: file.path, text });
  }
  found.push(...lintRelaxations(repo));
  return found;
}

// Lint levels in order; a repo may go up this list, never down.
const LEVEL = { allow: 0, warn: 1, deny: 2, forbid: 3 };

/** The workspace's `[workspace.lints.<tool>]` levels, `tool::name` to level, from the repo or the standard. */
function workspaceLints(text) {
  const out = new Map();
  for (const [key, value] of tomlKeys(text)) {
    const cut = key.indexOf("\u0000");
    const section = key.slice(0, cut), name = key.slice(cut + 1);
    const tool = section.match(/^workspace\.lints\.(rust|clippy)$/)?.[1];
    if (!tool) continue;
    const level = value.match(/^"(allow|warn|deny|forbid)"$/)?.[1] ?? value.match(/level="(allow|warn|deny|forbid)"/)?.[1];
    if (level) out.set(tool === "rust" ? name : `clippy::${name}`, level);
  }
  return out;
}

/** The crate names MAP.md's "## Unsafe crates" table lists in its first column. */
export function unsafeCrates(repo) {
  const section = headingSection(repo, "Unsafe crates");
  const names = new Set();
  for (const line of section.split("\n")) {
    const cell = line.match(/^\|\s*`?([A-Za-z0-9_-]+)`?\s*\|/)?.[1];
    if (cell && cell !== "Crate" && cell !== "None" && !/^-+$/.test(cell)) names.add(cell);
  }
  return names;
}

/** Each lint relaxation in the repo: the workspace below the standard, a member not inheriting, a crate root allowing
 * what the workspace sets, or an unsafe allow the list does not cover. All refused. */
function lintRelaxations(repo) {
  const out = [];
  const manifest = join(repo, "Cargo.toml");
  if (!existsSync(manifest)) return out;
  const want = workspaceLints(readFileSync(join(ASSETS, "workspace.Cargo.toml"), "utf8"));
  const have = workspaceLints(readFileSync(manifest, "utf8"));
  for (const [lint, level] of want) {
    const theirs = have.get(lint);
    if (!theirs) out.push({ path: "Cargo.toml", text: `[workspace.lints] ${lint} is missing; the standard sets "${level}"`, refused: true });
    else if (LEVEL[theirs] < LEVEL[level]) out.push({ path: "Cargo.toml", text: `[workspace.lints] ${lint} = "${theirs}" is below the standard's "${level}"`, refused: true });
  }
  const unsafeLevel = have.get("unsafe_code") ?? "deny";
  const listed = unsafeCrates(repo);
  const crates = join(repo, "crates");
  if (!existsSync(crates)) return out;
  for (const crate of readdirSync(crates).sort()) {
    const dir = join(crates, crate);
    if (!statSync(dir).isDirectory()) continue;
    const member = join(dir, "Cargo.toml");
    if (existsSync(member)) {
      const keys = tomlKeys(readFileSync(member, "utf8"));
      // `[lints] workspace = true` or the dotted `lints.workspace = true`: both valid TOML.
      const inherits = keys.get("lints\u0000workspace") === "true" || keys.get("\u0000lints.workspace") === "true";
      const own = [...keys.keys()].some((k) => /^lints\.(rust|clippy)\u0000/.test(k) || /^\u0000lints\.(rust|clippy)\./.test(k));
      if (!inherits || own) out.push({ path: `crates/${crate}/Cargo.toml`, text: "[lints] must be workspace = true and nothing else", refused: true });
    }
    for (const root of ["src/lib.rs", "src/main.rs"]) {
      const file = join(dir, root);
      if (!existsSync(file)) continue;
      const text = withoutComments(readFileSync(file, "utf8"));
      const allows = crateAllows(text);
      for (const lint of allows) {
        if (lint === "unsafe_code") {
          if (unsafeLevel === "forbid") out.push({ path: `crates/${crate}/${root}`, text: "#![allow(unsafe_code)] under a workspace forbid cannot compile (E0453); the workspace sets deny", refused: true });
          else if (!listed.has(crate)) out.push({ path: `crates/${crate}/${root}`, text: "#![allow(unsafe_code)] in a crate MAP.md does not list under ## Unsafe crates", refused: true });
          else if (!/#!\[deny\(([^)]*,\s*)?unsafe_op_in_unsafe_fn/.test(text)) out.push({ path: `crates/${crate}/${root}`, text: "#![allow(unsafe_code)] without #![deny(unsafe_op_in_unsafe_fn)]", refused: true });
          continue;
        }
        const group = lint.startsWith("clippy::") && !want.has(lint) && !have.has(lint);
        if (want.has(lint) || have.has(lint) || group) out.push({ path: `crates/${crate}/${root}`, text: `#![allow(${lint})] relaxes a workspace lint`, refused: true });
      }
    }
  }
  return out;
}

/** Each lint a crate root allows or expects with an inner attribute: `#![allow(a, b)]`, `#![expect(c, reason = "…")]`
 * and `#![cfg_attr(<cond>, allow(…))]`. A small scanner, not a regex: a `reason` string may hold parentheses, so the
 * attribute's parentheses are balanced with string literals skipped. */
export function crateAllows(source) {
  const text = withoutComments(source);
  const out = [];
  for (const m of text.matchAll(/#!\[\s*(allow|expect|cfg_attr)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const close = closingParen(text, open);
    if (close < 0) continue;
    let inner = text.slice(open + 1, close);
    if (m[1] === "cfg_attr") {
      // cfg_attr(<cond>, allow(a), expect(b)): each allow or expect after the condition.
      for (const a of inner.matchAll(/\b(allow|expect)\s*\(/g)) {
        const o = a.index + a[0].length - 1;
        const c = closingParen(inner, o);
        if (c > 0) out.push(...lintNames(inner.slice(o + 1, c)));
      }
      continue;
    }
    out.push(...lintNames(inner));
  }
  return out;
}

/** Rust source with every comment blanked to spaces (block comments nest, newlines kept), and every string literal's
 *  content blanked inside its quotes, so `// #![allow(x)]` is not an attribute and `allow(<block comment> x)` still names x. */
export function withoutComments(text) {
  let out = "";
  let i = 0;
  const blank = (s) => s.replace(/[^\n]/g, " ");
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === "//") {
      const end = text.indexOf("\n", i);
      const stop = end < 0 ? text.length : end;
      out += blank(text.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === "/*") {
      let depth = 0, j = i;
      do {
        if (text.startsWith("/*", j)) { depth++; j += 2; }
        else if (text.startsWith("*/", j)) { depth--; j += 2; }
        else j++;
      } while (depth > 0 && j < text.length);
      out += blank(text.slice(i, j));
      i = j;
      continue;
    }
    const raw = /^b?r(#*)"/.exec(text.slice(i, i + 300));
    if (raw && !/[A-Za-z0-9_]/.test(text[i - 1] ?? "")) {
      const end = text.indexOf('"' + raw[1], i + raw[0].length);
      const stop = end < 0 ? text.length : end + 1 + raw[1].length;
      const body = i + raw[0].length;
      out += raw[0] + blank(text.slice(body, Math.max(body, stop - 1 - raw[1].length))) + text.slice(Math.max(body, stop - 1 - raw[1].length), stop);
      i = stop;
      continue;
    }
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += '"' + blank(text.slice(i + 1, j)) + text.slice(j, j + 1);
      i = j + 1;
      continue;
    }
    const ch = /^'(?:\\(?:u\{[0-9A-Fa-f]{1,6}\}|x[0-9A-Fa-f]{2}|.)|[^\\'\n])'/.exec(text.slice(i, i + 12));
    if (ch) {
      out += ch[0];
      i += ch[0].length;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/** The index of the `)` that closes the `(` at `open`, skipping string literals; -1 when unbalanced. */
function closingParen(text, open) {
  let depth = 0, quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (c === '"') quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i;
  }
  return -1;
}

/** The lint names in an allow list, top-level commas only, `reason = …` and other `key = value` parts dropped. */
function lintNames(list) {
  const out = [];
  let depth = 0, quote = null, part = "";
  const take = () => {
    const lint = part.trim();
    if (lint && !lint.includes("=")) out.push(lint);
    part = "";
  };
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (quote) {
      if (c === "\\") part += c + (list[++i] ?? "");
      else { part += c; if (c === quote) quote = null; }
      continue;
    }
    if (c === '"') quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === "," && depth === 0) take();
    else part += c;
  }
  take();
  return out;
}

/** Each key the standard sets that the repo lacks or sets otherwise, and each key the repo adds. */
function tomlDifferences(ours, theirs) {
  const want = tomlKeys(ours), have = tomlKeys(theirs), out = [];
  for (const [key, value] of want) {
    if (perRepo(key)) continue;
    if (!have.has(key)) out.push(`${shown(key)} missing, standard ${value}`);
    else if (have.get(key) !== value) {
      const stricter = key === "workspace.lints.rust\u0000unsafe_code" && have.get(key) === '"forbid"'
        ? " (stricter; name Cargo.toml under MAP.md Differences, or move to deny when a crate needs the allow)"
        : "";
      out.push(`${shown(key)} = ${have.get(key)}, standard ${value}${stricter}`);
    }
  }
  for (const [key, value] of have) {
    if (!perRepo(key) && !want.has(key)) out.push(`${shown(key)} = ${value} not in the standard`);
  }
  return out;
}

const perRepo = (key) => PER_REPO.has(key.replace("\u0000", ".")) || PER_REPO.has(key.slice(0, key.indexOf("\u0000")));
const shown = (key) => {
  const cut = key.lastIndexOf("\u0000");
  return cut < 0 ? key : `[${key.slice(0, cut)}] ${key.slice(cut + 1)}`;
};

/** `section\0key` to its value with the spaces and trailing commas outside strings removed. */
function tomlKeys(text) {
  const keys = new Map();
  let section = "", pending = null;
  for (const raw of text.split("\n")) {
    const line = withoutComment(raw);
    if (pending) {
      pending.value += line;
      if (balanced(pending.value)) {
        keys.set(pending.key, normalized(pending.value));
        pending = null;
      }
      continue;
    }
    const header = line.trim().match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1].trim();
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = `${section}\u0000${line.slice(0, eq).trim()}`;
    const value = line.slice(eq + 1);
    if (balanced(value)) keys.set(key, normalized(value));
    else pending = { key, value };
  }
  return keys;
}

function withoutComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#") return line.slice(0, i);
  }
  return line;
}

function outsideStrings(value, keep) {
  let out = "", quote = null;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      out += c;
      if (c === "\\" && quote === '"') out += value[++i] ?? "";
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else out += keep(c);
  }
  return out;
}

function balanced(value) {
  let unclosed = 0;
  outsideStrings(value, (c) => {
    if (c === "[" || c === "{") unclosed++;
    if (c === "]" || c === "}") unclosed--;
    return c;
  });
  return unclosed <= 0;
}

const normalized = (value) => outsideStrings(value, (c) => (/\s/.test(c) ? "" : c)).replace(/,([\]}])/g, "$1");

/** Each line the standard has that the repo lacks, and each line the repo adds, in order. Comments and blank lines
 * are not compared: a difference in words is not a difference in what runs. */
function lineDifferences(ours, theirs) {
  const a = codeLines(ours), b = codeLines(theirs);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i].text === b[j].text ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].text === b[j].text) {
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push(`line ${b[j].n} not in the standard: ${b[j].text}`);
      j++;
    } else {
      out.push(`standard line ${a[i].n} missing: ${a[i].text}`);
      i++;
    }
  }
  return out;
}

const codeLines = (text) =>
  text
    .split("\n")
    .map((line, n) => ({ n: n + 1, text: line.trim() }))
    .filter(({ n, text }) => text !== "" && (n === 1 || !text.startsWith("#")));

/** The text under MAP.md's "Differences from the standard" heading, up to the next heading as high or higher. */
export function listedSection(repo) {
  return headingSection(repo, "Differences from the standard");
}

/** The text under MAP.md's `## <title>` heading, up to the next heading as high or higher. */
function headingSection(repo, title) {
  const map = join(repo, "MAP.md");
  if (!existsSync(map)) return "";
  const lines = readFileSync(map, "utf8").split("\n");
  const start = lines.findIndex((l) => new RegExp(`^##+\\s+${title}\\s*$`, "i").test(l.trim()));
  if (start < 0) return "";
  const level = lines[start].trim().match(/^#+/)[0].length;
  const end = lines.findIndex((l, n) => n > start && /^#+\s/.test(l) && l.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

const named = (section, path) =>
  new RegExp(`(^|[\\s\`'"(\\[])${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[\\s\`'"),.:;\\]])`, "m").test(section);

/** The report: one line per difference, and the exit code. */
export function check(repo) {
  const section = listedSection(repo);
  let unlisted = 0;
  let refusedCount = 0;
  const lines = differences(repo).map(({ path, text, refused }) => {
    if (refused) {
      refusedCount++;
      return `${path}: ${text} (refused)`;
    }
    const listed = named(section, path);
    if (!listed) unlisted++;
    return `${path}: ${text}${listed ? " (listed in MAP.md)" : ""}`;
  });
  return { lines, code: unlisted || refusedCount ? 1 : 0, unlisted, refused: refusedCount };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = process.argv[2];
  if (!repo || process.argv.length > 3) {
    console.error("usage: node standard-check.mjs <repo>");
    process.exit(2);
  }
  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    console.error(`standard-check: ${repo} is not a folder`);
    process.exit(2);
  }
  const { lines, code, unlisted, refused } = check(repo);
  for (const line of lines) console.log(line);
  console.log(
    lines.length === 0
      ? "standard-check: matches the standard"
      : `standard-check: ${lines.length} differences, ${unlisted} not listed under "## Differences from the standard" in MAP.md, ${refused} refused`,
  );
  process.exit(code);
}
