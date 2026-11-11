// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "vitest";

const CHECK = join(import.meta.dirname, "check-tokens.mjs");
const madeFolders: string[] = [];

/** Runs the check on a new folder holding `files`, and returns its exit code and findings. */
function check(files: Readonly<Record<string, string>>): { exitCode: number | null; findings: string[] } {
  const root = mkdtempSync(join(tmpdir(), "check-tokens-"));
  madeFolders.push(root);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  const run = spawnSync(process.execPath, [CHECK, root], { encoding: "utf8" });
  return { exitCode: run.status, findings: run.stderr.split("\n").filter((line) => line !== "") };
}

afterEach(() => {
  for (const folder of madeFolders.splice(0)) rmSync(folder, { recursive: true });
});

test("each kind of color literal is refused, in any source folder", () => {
  const { exitCode, findings } = check({
    "components/card.tsx": [
      'const a = <Box sx={{ color: "red" }} />;',
      'const b = <Box sx={{ border: "1px solid tomato" }} />;',
      'const c = <Box sx={{ bgcolor: "#FFAA00" }} />;',
      "const Title = styled(Typography)`",
      "  color: #fff;",
      "  background: color(display-p3 1 0 0);",
      "  outline-color: rebeccapurple;",
      "`;",
      'const d = <Box sx={{ boxShadow: "0 0 4px rgb(0 0 0 / 50%)" }} />;',
    ].join("\n"),
    "features/orders/row.module.css": ".row {\n  color: navy;\n  fill: hsl(210 50% 40%);\n}\n",
    "src/widgets/badge.jsx": 'export const badge = <span style={{ backgroundColor: "gold" }} />;\n',
  });

  expect(exitCode).toBe(1);
  expect(findings).toEqual([
    "components/card.tsx:1: named color outside app/tokens.css",
    "components/card.tsx:2: named color outside app/tokens.css",
    "components/card.tsx:3: hex color outside app/tokens.css",
    "components/card.tsx:5: hex color outside app/tokens.css",
    "components/card.tsx:6: color function outside app/tokens.css",
    "components/card.tsx:7: named color outside app/tokens.css",
    "components/card.tsx:9: color function outside app/tokens.css",
    "features/orders/row.module.css:2: named color outside app/tokens.css",
    "features/orders/row.module.css:3: color function outside app/tokens.css",
    "src/widgets/badge.jsx:1: named color outside app/tokens.css",
  ]);
});

test("tokens, palette keys, colorless keywords, the token file and test files pass", () => {
  const { exitCode, findings } = check({
    "app/tokens.css": ":root {\n  --color-primary: #1f5fbf;\n  --color-red: red;\n}\n",
    "components/card.tsx": [
      'const a = <Box sx={{ color: "text.secondary", bgcolor: "common.white", borderColor: "divider" }} />;',
      'const b = <Box sx={{ color: "var(--color-red)", border: "1px solid var(--color-primary)" }} />;',
      'const c = <Button color="primary" sx={{ backgroundColor: "transparent", fill: "currentColor" }} />;',
      'const d = <a href="#top">Orange and tan are words here.</a>; // a comment may say #123 or red',
      "const mixed = `background: color-mix(in srgb, var(--color-primary) 20%, transparent);`;",
    ].join("\n"),
    "components/card.test.tsx": 'expect(element).toHaveStyle({ color: "red" });\n',
    "node_modules/library/index.js": 'export const color = "#ff0000";\n',
    ".next/static/app.css": ".a { color: #ff0000; }\n",
    "dist/assets/index.css": ".a { color: #ff0000; }\n",
  });

  expect(findings).toEqual([]);
  expect(exitCode).toBe(0);
});
