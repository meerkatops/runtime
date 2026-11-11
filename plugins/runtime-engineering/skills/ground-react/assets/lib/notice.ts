// The notice's shapes, shared by the server and the browser. Reading and writing it is lib/data/notice.ts.

export interface Notice {
  readonly text: string;
}

export const MAX_NOTICE_CHARS = 200;

/** Why a change to the notice was refused. */
export type NoticeFailure = "signed-out" | "invalid-text";
