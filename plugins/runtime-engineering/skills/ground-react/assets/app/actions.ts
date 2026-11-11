"use server";

import { updateTag } from "next/cache";

import type { NoticeFormState } from "../components/notice-form";
import { readCaller } from "../lib/data/caller";
import { NOTICE_FILE, NOTICE_TAG, writeNotice } from "../lib/data/notice";

/**
 * Changes the notice. A Server Function is a public endpoint, reachable by a direct POST, so the
 * caller and the arguments are checked here, through the data layer, whatever page drew the form.
 */
export async function changeNotice(_previous: NoticeFormState, formData: FormData): Promise<NoticeFormState> {
  const result = await writeNotice(await readCaller(), formData.get("text"), NOTICE_FILE);
  if (!result.ok) return { status: result.error };
  // The page reads the notice from the cache: expire it, so the caller sees the change at once.
  updateTag(NOTICE_TAG);
  return { status: "saved" };
}
