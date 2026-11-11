import "server-only";

export interface Caller {
  readonly id: string;
}

/**
 * The signed-in caller, or null when nobody is signed in. Every Server Function and every write in
 * the data layer asks here first. This starting app ships no sign-in, so the answer is always null
 * and every write is refused: wire the repo's sign-in provider in here, verifying its session cookie,
 * never trusting that one is present.
 */
export function readCaller(): Promise<Caller | null> {
  return Promise.resolve(null);
}
