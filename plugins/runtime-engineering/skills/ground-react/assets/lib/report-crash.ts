import { toCrashReport } from "./crash-record";

const CRASH_ENDPOINT = "/api/crash";

/**
 * Sends a crash seen in the browser to the server, which writes the record. `sendBeacon` survives the
 * page closing; when the browser refuses to queue it (it returns false), a keepalive `fetch` is tried.
 */
export function reportCrash(error: unknown): void {
  const body = JSON.stringify(toCrashReport(error, window.location.pathname));
  if (navigator.sendBeacon(CRASH_ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  fetch(CRASH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch((sendError: unknown) => {
    // A crash handler never fails itself (the rulebook's A6). Thrown from here, this failure would
    // reach the `unhandledrejection` listener and be reported again, without end.
    console.error("The crash report could not be sent.", sendError);
  });
}
