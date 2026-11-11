import type { Instrumentation } from "next";

import { toCrashRecord, toCrashReport } from "./lib/crash-record";
import { readAppVersion, writeCrashRecord } from "./lib/write-crash-record";

// Runs once when a server instance starts, in every runtime, so Node-only code is imported
// only where it can run.
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    await import("./instrumentation-node");
  }
}

// Called for every error the server catches while rendering or handling a request.
export const onRequestError: Instrumentation.onRequestError = (error, request) => {
  writeCrashRecord(toCrashRecord(toCrashReport(error, request.path), "server", new Date(), readAppVersion()));
};
