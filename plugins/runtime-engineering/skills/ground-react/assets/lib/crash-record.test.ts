import { expect, test } from "vitest";

import { isCrashReport, MAX_REPORT_BYTES, redact, toCrashRecord, toCrashReport } from "./crash-record";

function jsonSizeBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

test("an Error becomes a record that keeps its cause and drops the path's query string", () => {
  const error = new Error("read failed", { cause: new Error("disk full") });
  const record = toCrashRecord(toCrashReport(error, "/items?token=abc"), "server", new Date(0), "1.2.3");

  expect(record).toMatchObject({
    time: "1970-01-01T00:00:00.000Z",
    version: "1.2.3",
    where: "server",
    name: "Error",
    message: "read failed",
    cause: "Error: disk full",
    path: "/items",
  });
});

test("a thrown value that is not an Error is recorded as what it was", () => {
  expect(toCrashReport("boom", null)).toMatchObject({ name: "NonError", message: "boom" });
  expect(toCrashReport(null, null).message).toBe("null was thrown, not an Error");
  expect(toCrashReport({ status: 500 }, null).message).toBe("a value of type object was thrown, not an Error");
});

test("secrets in the message, the stack and the cause are redacted", () => {
  const key = "a1b2c3d4".repeat(4); // a fake key, built so no scanner reads it as a real one
  const error = new Error(`GET https://api.example.com/v1/items?api_key=${key}&q=my+search failed`, {
    cause: new Error("401 for Authorization: Bearer abc.def.ghi with password=hunter2"),
  });
  error.stack = `Error: fetch failed\n    at load (https://user:pw@example.com/app.js?session=s3cr3t:10:5)\n    at ${key}`;

  const report = toCrashReport(error, "/items");

  expect(report.message).toBe("GET https://api.example.com/v1/items?api_key=[redacted]&q=[redacted] failed");
  expect(report.cause).toBe("Error: 401 for Authorization: [redacted]");
  expect(report.stack).toBe(
    "Error: fetch failed\n    at load (https://[redacted]@example.com/app.js?session=[redacted])\n    at [redacted]",
  );
});

test("redacting keeps an ordinary message and is the same done twice", () => {
  const plain = "Cannot read properties of undefined (reading 'map') at Notice (app/page.tsx:12:5)";
  expect(redact(plain)).toBe(plain);

  const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxIn0", "c2lnbmF0dXJl"].join("."); // a fake token
  const secret = `${jwt} and Bearer abc123 and ?code=42`;
  expect(redact(secret)).toBe("[redacted] and Bearer [redacted] and ?code=[redacted]");
  expect(redact(redact(secret))).toBe(redact(secret));
});

test("a cookie header, a quoted value and a password with spaces are redacted whole", () => {
  expect(redact("Cookie: sid=abc; theme=dark; csrf=xyz\nnext line")).toBe("Cookie: [redacted]\nnext line");
  expect(redact("set-cookie: sid=abc; Path=/; HttpOnly")).toBe("set-cookie: [redacted]");
  expect(redact('{"cookie":"sid=abc; csrf=xyz","ok":true}')).toBe('{"cookie":"[redacted]","ok":true}');
  expect(redact('password="correct horse battery staple" next')).toBe('password="[redacted]" next');
  expect(redact("{'pass': 'two words'}")).toBe("{'pass': '[redacted]'}");
  expect(redact('"authorization": "Basic dXNlcjpwYXNz"')).toBe('"authorization": "[redacted]"');
  expect(redact('Cookie: "sid=abc"; csrf=xyz')).toBe("Cookie: [redacted]");
  expect(redact('password="never closed\nnext line')).toBe('password="[redacted]\nnext line');
  expect(redact("token='cut off")).toBe("token='[redacted]");
  const once = redact('Cookie: a=1; b=2 and token="x y"');
  expect(redact(once)).toBe(once);
});

test("a report never serializes past the endpoint's cap, whatever its text costs in bytes", () => {
  const error = new Error("é".repeat(9_000));
  // Every one of these costs six bytes in JSON, and an emoji is two characters and four bytes.
  error.stack = "\u0001".repeat(9_000) + "😀".repeat(9_000);

  const report = toCrashReport(error, "/items");

  expect(jsonSizeBytes(report)).toBeLessThanOrEqual(MAX_REPORT_BYTES);
  // The stack is cut first, and the message keeps its start.
  expect(report.stack).toBe("");
  expect(report.message.length).toBeGreaterThan(7_000);
  expect("é".repeat(9_000).startsWith(report.message)).toBe(true);
});

test("a stack is cut from its end, to the longest start that fits", () => {
  const error = new Error("read failed");
  error.stack = "Error: read failed\n    at readItems (lib/data/items.ts:4:9)";
  expect(toCrashReport(error, "/items").stack).toBe(error.stack);

  error.stack = "at frame (app.js:1:1)\n".repeat(2_000);
  const report = toCrashReport(error, "/items");
  // One more character, a newline at most, would cost two bytes.
  expect(jsonSizeBytes(report)).toBeLessThanOrEqual(MAX_REPORT_BYTES);
  expect(jsonSizeBytes(report)).toBeGreaterThanOrEqual(MAX_REPORT_BYTES - 1);
  expect(error.stack.startsWith(report.stack ?? "")).toBe(true);
});

test("a report from a browser is checked for shape, then redacted and fitted like any other", () => {
  const report = toCrashReport(new Error("x"), "/");
  expect(isCrashReport(report)).toBe(true);
  expect(isCrashReport({ ...report, message: 7 })).toBe(false);
  expect(isCrashReport({ name: "Error" })).toBe(false);

  const forged = { ...report, message: "token=abc123", stack: "s".repeat(40_000).replaceAll("sss", "s s") };
  const record = toCrashRecord(forged, "browser", new Date(0), null);
  expect(record.message).toBe("token=[redacted]");
  const { name, message, stack, cause, digest, path } = record;
  expect(jsonSizeBytes({ name, message, stack, cause, digest, path })).toBeLessThanOrEqual(MAX_REPORT_BYTES);
});
