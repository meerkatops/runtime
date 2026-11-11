// The crash record: one JSON line per crash, with no secret in it. Shared by the server and the browser.

export interface CrashReport {
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
  readonly cause: string | null;
  readonly digest: string | null;
  readonly path: string | null;
}

export interface CrashRecord extends CrashReport {
  readonly time: string;
  readonly version: string | null;
  readonly where: "server" | "browser";
}

/** The one size budget: a report serialized as JSON is at most this many UTF-8 bytes, and the endpoint reads no more. */
export const MAX_REPORT_BYTES = 16_384;

const REDACTED = "[redacted]";
// What an error's text can carry that a log must not: each pattern keeps the label and drops the value.
const SECRET_PATTERNS: readonly (readonly [RegExp, string])[] = [
  // The value of every query parameter: ?token=abc&q=what+a+person+typed
  [/([?&][\w.~%[\]-]+=)[^&#\s"'<>)]*/g, `$1${REDACTED}`],
  // The user and password in a URL: https://user:password@host
  [/(:\/\/)[^/\s:@]+:[^/\s@]+@/g, `$1${REDACTED}@`],
  // A cookie or authorization header goes to the end of its line, quoted or not: every pair of "Cookie: a=1; b=2".
  [/\b((?:set-)?cookie|authorization)(\s*[:=]\s*)[^\r\n]*/gi, `$1$2${REDACTED}`],
  // A named credential. A quoted value goes to its closing quote, spaces and all: password="two words";
  // a quote that never closes goes to the end of the line.
  [
    /\b(pass(?:word|wd)?|secret|token|api[_-]?key|authorization|cookie|session(?:[_-]?id)?)(["']?\s*[:=]\s*)(["'])(?:\\.|(?!\3)[^\\\r\n])*(\3|(?=[\r\n])|$)/gi,
    `$1$2$3${REDACTED}$4`,
  ],
  // Any other unquoted credential goes to the next separator: password=..., Bearer ...
  [
    /\b(pass(?:word|wd)?|secret|token|api[_-]?key|session(?:[_-]?id)?)(["']?\s*[:=]\s*)(?!["'])(?:(?:Bearer|Basic)\s+)?[^\s"',;&)]+/gi,
    `$1$2${REDACTED}`,
  ],
  [/\b(Bearer|Basic)\s+[\w.~+/=-]+/g, `$1 ${REDACTED}`],
  // A JSON Web Token, and any unbroken run of 32 or more letters and digits: a key, a hash, a session id.
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED],
  [/\b[A-Za-z0-9]{32,}\b/g, REDACTED],
];

/** The text with every value that looks like a secret replaced; redacting twice changes nothing more. */
export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((redacted, [pattern, replacement]) => redacted.replace(pattern, replacement), text);
}

function redactOrNull(text: string | null): string | null {
  return text === null ? null : redact(text);
}

function redactReport(report: CrashReport): CrashReport {
  return {
    name: redact(report.name),
    message: redact(report.message),
    stack: redactOrNull(report.stack),
    cause: redactOrNull(report.cause),
    digest: redactOrNull(report.digest),
    path: redactOrNull(report.path),
  };
}

const encoder = new TextEncoder();

function jsonSizeBytes(report: CrashReport): number {
  return encoder.encode(JSON.stringify(report)).byteLength;
}

// The longest and least needed text is cut first.
const CUT_ORDER = ["stack", "cause", "message", "path", "digest", "name"] as const;

function clampChars(text: string | null): string | null {
  // A character is at least one byte, so no field can keep more characters than the budget has bytes.
  return text === null ? null : text.slice(0, MAX_REPORT_BYTES);
}

/** The report with one field cut, from its end, to the longest start that fits the budget. */
function cutField(report: CrashReport, field: (typeof CUT_ORDER)[number]): CrashReport {
  const text = report[field];
  if (text === null || jsonSizeBytes(report) <= MAX_REPORT_BYTES) return report;
  let fitsChars = 0;
  let tooManyChars = text.length;
  while (tooManyChars - fitsChars > 1) {
    const middleChars = Math.floor((fitsChars + tooManyChars) / 2);
    if (jsonSizeBytes({ ...report, [field]: text.slice(0, middleChars) }) <= MAX_REPORT_BYTES) {
      fitsChars = middleChars;
    } else {
      tooManyChars = middleChars;
    }
  }
  return { ...report, [field]: text.slice(0, fitsChars) };
}

/** The report cut down until its JSON is within the budget, however many bytes its characters cost. */
function fitToBudget(report: CrashReport): CrashReport {
  const clamped: CrashReport = {
    name: report.name.slice(0, MAX_REPORT_BYTES),
    message: report.message.slice(0, MAX_REPORT_BYTES),
    stack: clampChars(report.stack),
    cause: clampChars(report.cause),
    digest: clampChars(report.digest),
    path: clampChars(report.path),
  };
  return CUT_ORDER.reduce(cutField, clamped);
}

/** The path without its query string, which can carry a token or a search a person typed. */
function pathOnly(path: string): string {
  const queryStart = path.indexOf("?");
  return queryStart === -1 ? path : path.slice(0, queryStart);
}

function digestOf(error: object): string | null {
  return "digest" in error && typeof error.digest === "string" ? error.digest : null;
}

function describe(thrown: unknown): string {
  if (thrown instanceof Error) return `${thrown.name}: ${thrown.message}`;
  if (typeof thrown === "string") return thrown;
  if (thrown === null) return "null was thrown, not an Error";
  return `a value of type ${typeof thrown} was thrown, not an Error`;
}

/**
 * Turns any thrown value into a report that is redacted and within the size budget. A value that is
 * not an `Error` is recorded as what it was, never dropped.
 */
export function toCrashReport(error: unknown, requestPath: string | null): CrashReport {
  const path = requestPath === null ? null : pathOnly(requestPath);
  const report: CrashReport =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? null,
          cause: error.cause === undefined ? null : describe(error.cause),
          digest: digestOf(error),
          path,
        }
      : { name: "NonError", message: describe(error), stack: null, cause: null, digest: null, path };
  return fitToBudget(redactReport(report));
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** The run-time check for a report that arrived from a browser. Its size was capped when its body was read. */
export function isCrashReport(value: unknown): value is CrashReport {
  if (typeof value !== "object" || value === null) return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "stack" in value &&
    isStringOrNull(value.stack) &&
    "cause" in value &&
    isStringOrNull(value.cause) &&
    "digest" in value &&
    isStringOrNull(value.digest) &&
    "path" in value &&
    isStringOrNull(value.path)
  );
}

/**
 * The line to write. The report is redacted and fitted again here, so a report a browser sent, which
 * anyone can forge, is held to the same rules as one made on the server.
 */
export function toCrashRecord(
  report: CrashReport,
  where: CrashRecord["where"],
  time: Date,
  version: string | null,
): CrashRecord {
  const { name, message, stack, cause, digest, path } = fitToBudget(redactReport(report));
  return { time: time.toISOString(), version, where, name, message, stack, cause, digest, path };
}
