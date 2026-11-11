import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife, cacheTag } from "next/cache";

import { MAX_NOTICE_CHARS } from "../notice";
import type { Notice, NoticeFailure } from "../notice";
import type { Result } from "../result";
import type { Caller } from "./caller";

// The data layer: the only code that reads or writes the app's data, and it runs on the server only.
// A JSON file stands in for the repo's store.

export const NOTICE_TAG = "notice";
export const NOTICE_FILE = join(process.cwd(), "data", "notice.json");

export class NoticeFileError extends Error {
  readonly code = "E_NOTICE_FILE";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NoticeFileError";
  }
}

function parseNotice(json: string, noticeFile: string): Notice {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new NoticeFileError(`the notice file is not JSON: ${noticeFile}`, { cause: error });
  }
  if (typeof value !== "object" || value === null || !("text" in value) || typeof value.text !== "string") {
    throw new NoticeFileError(`the notice file has no text: ${noticeFile}`);
  }
  // Only the field the page shows leaves the data layer.
  return { text: value.text };
}

/** Reads the notice from its file and checks its shape. */
export async function readNoticeFile(noticeFile: string): Promise<Notice> {
  return parseNotice(await readFile(noticeFile, "utf8"), noticeFile);
}

/**
 * The notice every visitor may see. It is the same for every caller, so it is cached: for hours,
 * or until a write expires its tag.
 */
export async function readNotice(): Promise<Notice> {
  "use cache";
  cacheLife("hours");
  cacheTag(NOTICE_TAG);
  return readNoticeFile(NOTICE_FILE);
}

/** Changes the notice: checks who is calling, then what was sent, and only then writes. */
export async function writeNotice(
  caller: Caller | null,
  text: unknown,
  noticeFile: string,
): Promise<Result<Notice, NoticeFailure>> {
  if (caller === null) return { ok: false, error: "signed-out" };
  if (typeof text !== "string") return { ok: false, error: "invalid-text" };
  const notice: Notice = { text: text.trim() };
  if (notice.text.length === 0 || notice.text.length > MAX_NOTICE_CHARS) return { ok: false, error: "invalid-text" };
  await writeFile(noticeFile, `${JSON.stringify(notice)}\n`);
  return { ok: true, value: notice };
}
