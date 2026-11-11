// Refuses a color literal anywhere but the token file, so tokens.css stays the one theme source.
// Usage: node tools/check-tokens.mjs [app folder]   (exit 1 and one `file:line` per finding)
//
// Scans every .css, .ts, .tsx, .js and .jsx file under the app folder, whatever folder it is in. It
// skips what is not the app's source: node_modules, folders whose name starts with a dot (.next,
// .git), build output (dist, build, out, coverage), the Playwright report folders, and test files,
// which may name a color to assert one. It refuses a hex color, a color function, and a named color written
// as the value of a color property (`color: "red"`, `border: 1px solid red`). It allows
// `var(--token)`, a palette key (`"text.secondary"`, `"common.white"`) and the keywords that name no
// color (`inherit`, `currentColor`, `transparent`).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TOKEN_FILE = "app/tokens.css";
const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "build", "out", "coverage", "playwright-report", "test-results"]);
const SOURCE_FILE = /\.(?:css|tsx?|jsx?)$/;
const TEST_FILE = /\.(?:test|spec)\.[a-z]+$/;

// Every CSS named color; gr[ae]y matches both spellings CSS accepts for that one.
const NAMES =
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
  "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
  "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
  "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
  "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gr[ae]y green greenyellow honeydew " +
  "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
  "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
  "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
  "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
  "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
  "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
  "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
  "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
  "whitesmoke yellow yellowgreen";

// #rgb, #rgba, #rrggbb or #rrggbbaa, quoted or not; not an HTML entity (&#123;) or part of a word.
const HEX = /(?<![\w&])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/i;
// rgb(), hsl(), oklch(), color() and the rest; color-mix() and light-dark() only combine other colors.
const COLOR_FUNCTION = /(?<![\w.-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
// A property that takes a color (color, backgroundColor, border-left, fill, boxShadow, bgcolor...) and its value.
const COLOR_PROPERTY =
  /(?:color|background|border|outline|fill|stroke|shadow|caret|accent|decoration)[\w-]*["']?\s*[:=]\s*(.*)$/i;
// A color name standing alone: not part of a longer word, a custom property name or a palette key.
const NAMED_COLOR = new RegExp(`(?<![\\w.#-])(?:${NAMES.replaceAll(" ", "|")})(?![\\w.(-])`, "i");

/** @param {string} folder @returns {string[]} */
function listFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (!entry.isDirectory()) return [path];
    return entry.name.startsWith(".") || SKIPPED_FOLDERS.has(entry.name) ? [] : listFiles(path);
  });
}

/** The line without what may name a color safely: a `var(--token)` and a comment. @param {string} line */
function withoutAllowed(line) {
  return line
    .replace(/var\(\s*--[\w-]+\s*\)/g, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/, "$1")
    .replace(/^\s*(?:\/\*|\*).*$/, "");
}

/** @param {string} line @returns {string | null} what kind of color literal the line holds */
function colorLiteralIn(line) {
  const code = withoutAllowed(line);
  if (HEX.test(code)) return "hex color";
  if (COLOR_FUNCTION.test(code)) return "color function";
  const value = COLOR_PROPERTY.exec(code)?.[1];
  return value !== undefined && NAMED_COLOR.test(value) ? "named color" : null;
}

const root = process.argv[2] ?? join(import.meta.dirname, "..");
const findings = [];
for (const path of listFiles(root)) {
  const name = relative(root, path).split(sep).join("/");
  if (name === TOKEN_FILE || !SOURCE_FILE.test(name) || TEST_FILE.test(name)) continue;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const kind = colorLiteralIn(line);
      if (kind !== null) findings.push(`${name}:${String(index + 1)}: ${kind} outside ${TOKEN_FILE}`);
    });
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
}
