// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { MAX_NOTICE_CHARS } from "../notice";
import type { Caller } from "./caller";
import { NoticeFileError, readNoticeFile, writeNotice } from "./notice";

// `server-only` throws wherever a module is not built for the server, a test runner included.
vi.mock("server-only", () => ({}));

const caller: Caller = { id: "user-1" };
let folder = "";
let noticeFile = "";

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "notice-"));
  noticeFile = join(folder, "notice.json");
  writeFileSync(noticeFile, '{"text":"Hello","editedBy":"user-9"}\n');
});

afterEach(() => {
  rmSync(folder, { recursive: true });
});

test("a read returns only the field the page shows", async () => {
  expect(await readNoticeFile(noticeFile)).toEqual({ text: "Hello" });
});

test("a notice file that is not JSON, or has no text, is an error that names the file", async () => {
  writeFileSync(noticeFile, "not json");
  await expect(readNoticeFile(noticeFile)).rejects.toThrow(NoticeFileError);
  await expect(readNoticeFile(noticeFile)).rejects.toThrow(noticeFile);

  writeFileSync(noticeFile, '{"text":7}');
  await expect(readNoticeFile(noticeFile)).rejects.toThrow("the notice file has no text");
});

test("a signed-in caller's notice is trimmed, written and returned", async () => {
  const result = await writeNotice(caller, "  Closed Friday  ", noticeFile);

  expect(result).toEqual({ ok: true, value: { text: "Closed Friday" } });
  expect(await readNoticeFile(noticeFile)).toEqual({ text: "Closed Friday" });
});

test("a caller who is not signed in is refused, whatever was sent, and nothing is written", async () => {
  const result = await writeNotice(null, "Closed Friday", noticeFile);

  expect(result).toEqual({ ok: false, error: "signed-out" });
  expect(readFileSync(noticeFile, "utf8")).toContain("Hello");
});

test("text that is missing, not text, empty or too long is refused and nothing is written", async () => {
  const uploadedFile = new File(["x"], "notice.txt");
  for (const text of [null, uploadedFile, "   ", "x".repeat(MAX_NOTICE_CHARS + 1)]) {
    expect(await writeNotice(caller, text, noticeFile)).toEqual({ ok: false, error: "invalid-text" });
  }
  expect(readFileSync(noticeFile, "utf8")).toContain("Hello");
  expect(await writeNotice(caller, "x".repeat(MAX_NOTICE_CHARS), noticeFile)).toMatchObject({ ok: true });
});
