import type { CrashRecord } from "./crash-record";

/** Writes the record as one JSON line to stderr. Server only. A record holds only strings, so nothing here can throw. */
export function writeCrashRecord(record: CrashRecord): void {
  console.error(JSON.stringify(record));
}

/** The deployed version, from the environment the server was started with; null when unset. */
export function readAppVersion(): string | null {
  return process.env["APP_VERSION"] ?? null;
}
