// typescript-engineer: the TypeScript compiler API parts, run with the project's own typescript.
// The hook uses only `owners` (which tsconfig's program includes a file). `scan` (the AST checks: `any` incl.
// `Array<any>`/`as any`/`<any>`, non-null `!`, `as unknown as`, `@ts-ignore`, `@ts-nocheck`, a reasonless
// `@ts-expect-error`, each with its full line span) and `configs` (effective strictness through `extends`,
// before vs after) are kept as graders for the eval suite; no hook runs them.
// Usage: node ts-scan.mjs <dir of a typescript package>   (request JSON on stdin)
// Request: { scan?: [{path, text, test}], owners?: {root, files, gone?, cacheDir?}, configs?: {root, before, after} }
// Reply:   { scan: {path: [{rule, start, end}]}, owners: {file: config|null}, goneConfigs: [config], configs: {...} }
// It reads files and parses; it never runs project code. It writes only the Program file-list cache in `cacheDir`.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const tsDir = process.argv[2];
if (!tsDir) throw new Error("usage: ts-scan.mjs <typescript package dir>");
const ts = (await import(pathToFileURL(path.join(tsDir, "lib", "typescript.js")).href)).default;

// ---------- the AST guard ----------

const DIRECTIVE = /^\s*@ts-(ignore|nocheck|expect-error)\b(.*)$/;

function scriptKind(file) {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/** Every rule break in one file, each with its full line span (1-based, inclusive). */
function scan(file, text, isTest) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const found = [];
  const add = (rule, startPos, endPos) => found.push({ rule, start: line(startPos), end: line(Math.max(startPos, endPos - 1)) });

  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      add("any", node.getStart(sf), node.end); // `: any`, `Array<any>`, `as any`, `<any>x`, `? any :`
    } else if (ts.isNonNullExpression(node) && !isTest) {
      add("non-null !", node.getStart(sf), node.end); // spans from the operand's first line to the `!`
    } else if (ts.isAsExpression(node) && ts.isAsExpression(node.expression)
               && node.expression.type.kind === ts.SyntaxKind.UnknownKeyword) {
      add("as unknown as", node.getStart(sf), node.end);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // Comments live in the trivia before each token; walk every token so none is missed.
  const seen = new Set();
  const comments = (pos) => {
    for (const r of ts.getLeadingCommentRanges(text, pos) ?? []) {
      if (seen.has(r.pos)) continue;
      seen.add(r.pos);
      directive(text.slice(r.pos, r.end), r);
    }
  };
  const directive = (c, r) => {
    const body = c.startsWith("//") ? [c.replace(/^\/\/+/, "")]
      : c.replace(/^\/\*+/, "").replace(/\*+\/$/, "").split("\n").map((l) => l.replace(/^\s*\*+/, ""));
    for (const b of body) {
      const m = DIRECTIVE.exec(b);
      if (!m) continue;
      if (m[1] === "ignore") add("@ts-ignore", r.pos, r.end);
      else if (m[1] === "nocheck") add("@ts-nocheck", r.pos, r.end);
      else if (!/[A-Za-z0-9]/.test(m[2])) add("bare @ts-expect-error", r.pos, r.end);
    }
  };
  const tokens = (node) => {
    comments(node.pos);
    for (const child of node.getChildren(sf)) tokens(child);
  };
  tokens(sf);
  return found;
}

// ---------- which tsconfig's program holds a file ----------
// A file belongs to a project when the project's full Program holds it: its root files (`files`/`include`) and
// every file they import. Building a Program parses the whole project, so its file list is cached on disk in
// `cacheDir` per tsconfig, valid while the tsconfig's mtime and every cached project file's mtime are unchanged
// (a new import changes the importing file's mtime; a new root file is caught by the root-file check first).

const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const inside = (p, root) => p === root || p.startsWith(root + path.sep);
const parsedCache = new Map();
let cacheDir = null;
let projectRoot = null;

function parseProject(cfg) {
  if (!parsedCache.has(cfg)) {
    let errors = [];
    const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => errors.push(d) };
    const p = ts.getParsedCommandLineOfConfigFile(cfg, {}, host);
    const files = new Set((p?.fileNames ?? []).map(real));
    const refs = (p?.projectReferences ?? []).map((r) => {
      const rp = ts.resolveProjectReferencePath(r);
      return real(rp);
    });
    parsedCache.set(cfg, { parsed: p, files, refs, program: null,
      error: p ? null : errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ") });
  }
  return parsedCache.get(cfg);
}

const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return null; } };
const cachePath = (cfg) => cacheDir && path.join(cacheDir,
  "program-" + crypto.createHash("sha256").update(cfg).digest("hex").slice(0, 16) + ".json");

function readProgramCache(cfg) {
  const f = cachePath(cfg);
  if (!f) return null;
  let c;
  try {
    const fd = fs.openSync(f, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { c = JSON.parse(fs.readFileSync(fd, "utf8")); } finally { fs.closeSync(fd); }
  } catch { return null; }
  if (c?.config !== cfg || c.configMtime !== mtime(cfg)) return null;
  for (const [file, m] of Object.entries(c.stamps ?? {})) if (mtime(file) !== m) return null;
  return new Set(c.files);
}

function writeProgramCache(cfg, files) {
  const f = cachePath(cfg);
  if (!f) return;
  // stamp the project's own sources (inside the project root, outside node_modules): an edit there can add an import
  const stamps = {};
  for (const file of files) {
    if (projectRoot && inside(file, projectRoot) && !file.split(path.sep).includes("node_modules")) stamps[file] = mtime(file);
  }
  try {
    const fd = fs.openSync(f, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, JSON.stringify({ config: cfg, configMtime: mtime(cfg), files: [...files], stamps })); }
    finally { fs.closeSync(fd); }
  } catch { /* a cache that cannot be written only costs speed */ }
}

/** Every file in the config's full Program, imports included (what `tsc --listFilesOnly` lists). A cached Program
 *  that lacks `want` is rebuilt once: the file may have been created since, resolving an import the cache saw fail. */
function programFiles(cfg, p, want) {
  if (p.program && (p.fresh || !want || p.program.has(want))) return p.program;
  let files = p.program ?? readProgramCache(cfg);
  if (files && want && !files.has(want)) files = null;
  if (!files) {
    const prog = ts.createProgram({ rootNames: p.parsed.fileNames, options: p.parsed.options,
      projectReferences: p.parsed.projectReferences });
    files = new Set(prog.getSourceFiles().map((sf) => real(sf.fileName)));
    writeProgramCache(cfg, files);
    p.fresh = true;
  }
  p.program = files;
  return files;
}

function configsIn(dir) {
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names.filter((n) => /^tsconfig.*\.json$/.test(n))
    .sort((a, b) => (a === "tsconfig.json" ? -1 : b === "tsconfig.json" ? 1 : a.localeCompare(b)))
    .map((n) => path.join(dir, n));
}

function holds(cfg, file, seen, deep) {
  if (seen.has(cfg) || !fs.existsSync(cfg)) return null;
  seen.add(cfg);
  const p = parseProject(cfg);
  if (p.files.has(file)) return cfg;
  if (deep && p.parsed && programFiles(cfg, p, file).has(file)) return cfg;
  for (const ref of p.refs) {
    const hit = holds(ref, file, seen, deep);
    if (hit) return hit;
  }
  return null;
}

/** The nearest tsconfig (or a project it references) whose program includes the file: first by root files,
 *  then by each full Program (imports included), so a root-file hit never pays for a Program build. */
function owner(file, root) {
  const f = real(file);
  for (const deep of [false, true]) {
    const seen = new Set();
    for (let d = path.dirname(f); inside(d, root); d = path.dirname(d)) {
      for (const cfg of configsIn(d)) {
        const hit = holds(cfg, f, seen, deep);
        if (hit && inside(hit, root)) return hit;
      }
      if (d === root) break;
    }
  }
  return null;
}

/** The tsconfigs to check after `file` was deleted: no Program holds a file that is gone, so it is the first
 *  tsconfig (tsconfig.json before any other) in the nearest folder above it that has one; a config with no files
 *  of its own stands for the projects it references. */
function configsAbove(file, root) {
  for (let d = path.dirname(path.resolve(file)); inside(d, root); d = path.dirname(d)) {
    const cfg = configsIn(d)[0];
    if (cfg) {
      const p = parseProject(cfg);
      return (p.files.size === 0 ? p.refs.filter((r) => fs.existsSync(r)) : [cfg]).filter((c) => inside(c, root));
    }
    if (d === root) break;
  }
  return [];
}

// ---------- effective strictness through `extends` ----------

const STRICT_FAMILY = ["noImplicitAny", "noImplicitThis", "strictNullChecks", "strictFunctionTypes",
  "strictBindCallApply", "strictPropertyInitialization", "strictBuiltinIteratorReturn", "alwaysStrict",
  "useUnknownInCatchVariables"];
const OWN_FLAGS = ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes", "noImplicitOverride",
  "noUncheckedSideEffectImports", "erasableSyntaxOnly", "verbatimModuleSyntax"];

function leafConfigs(root, extra) {
  const out = new Set(extra.filter((p) => /^tsconfig.*\.json$/.test(path.basename(p))));
  const walk = (d, depth) => {
    if (depth > 12) return;
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        walk(path.join(d, e.name), depth + 1);
      } else if (e.isFile() && /^tsconfig.*\.json$/.test(e.name)) {
        out.add(path.join(d, e.name));
      }
    }
  };
  walk(root, 0);
  return [...out];
}

/** Effective strict flags of one config in one state of the files. `state` maps path to text or null. */
function effective(cfg, state) {
  const read = (p) => (Object.hasOwn(state, p) ? state[p] ?? undefined : ts.sys.readFile(p));
  const chain = [];
  const host = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory: () => [],
    fileExists: (p) => (Object.hasOwn(state, p) ? state[p] !== null : ts.sys.fileExists(p)),
    readFile: (p) => { const t = read(p); if (t !== undefined) chain.push(p); return t; },
  };
  const text = read(cfg);
  if (text === undefined) return null;
  const json = ts.parseConfigFileTextToJson(cfg, text);
  if (json.error) return { error: ts.flattenDiagnosticMessageText(json.error.messageText, " ") };
  // Other diagnostics (a deprecated option, an unresolved `extends`) do not stop the comparison: a lost
  // `extends` shows up as the flags it took away.
  const o = ts.parseJsonConfigFileContent(json.config, host, path.dirname(cfg), undefined, cfg).options;
  const flags = {};
  for (const f of OWN_FLAGS) flags[f] = o[f] === true;
  for (const f of STRICT_FAMILY) flags[f] = (o[f] ?? o.strict) === true; // default false: removing an explicit true is loosening
  flags.skipLibCheck = o.skipLibCheck === true;
  return { flags, chain: [cfg, ...chain.filter((c) => c !== cfg)] };
}

function loosened(b, a) {
  const out = [];
  for (const [f, v] of Object.entries(b.flags)) {
    if (f === "skipLibCheck") { if (!v && a.flags[f]) out.push("turns on `skipLibCheck`"); }
    else if (v && !a.flags[f]) out.push(`turns off \`${f}\``);
  }
  return out;
}

/** For every leaf tsconfig: is it looser after than before? A new leaf is compared with the nearest tsconfig.json above it. */
function configs({ root, before = {}, after = {} }) {
  const keys = [...Object.keys(before), ...Object.keys(after)];
  const leaves = leafConfigs(root, keys);
  const result = { loosened: [], unreadable: [], chains: {} };
  for (const leaf of leaves) {
    const a = effective(leaf, after);
    if (a === null) continue; // deleted
    let b = effective(leaf, before);
    if (a.error) { // only a config this change broke; one broken already is not this change's to fix
      if (b && !b.error) result.unreadable.push({ config: leaf, error: a.error });
      continue;
    }
    result.chains[leaf] = a.chain;
    let via = null;
    if (b === null) { // new config: it must be at least as strict as the one that governed its folder
      for (let d = path.dirname(leaf); inside(d, root); d = path.dirname(d)) {
        const parent = path.join(d, "tsconfig.json");
        if (parent !== leaf) {
          b = effective(parent, before);
          if (b) { via = parent; break; }
        }
        if (d === root) break;
      }
    }
    if (!b || b.error) continue;
    const what = loosened(b, a);
    if (what.length) result.loosened.push({ config: leaf, via, what, chain: a.chain });
  }
  return result;
}

// ---------- main ----------

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const reply = {};
if (input.scan) {
  reply.scan = {};
  for (const f of input.scan) reply.scan[f.path] = scan(f.path, f.text, f.test);
}
if (input.owners) {
  const root = real(input.owners.root);
  projectRoot = root;
  cacheDir = input.owners.cacheDir ?? null;
  reply.owners = {};
  reply.ownerErrors = {};
  for (const f of input.owners.files) reply.owners[f] = owner(f, root);
  reply.goneConfigs = [...new Set((input.owners.gone ?? []).flatMap((f) => configsAbove(f, root)))];
  for (const [cfg, p] of parsedCache) if (p.error) reply.ownerErrors[cfg] = p.error;
}
if (input.configs) reply.configs = configs({ ...input.configs, root: real(input.configs.root) });
process.stdout.write(JSON.stringify(reply));
