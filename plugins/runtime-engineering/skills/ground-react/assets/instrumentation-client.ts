import { reportCrash } from "./lib/report-crash";

// Runs in the browser before the app becomes interactive.
window.addEventListener("error", (event) => {
  // `error` is null for a script from another origin; the event's message is then all there is.
  const error: unknown = event.error ?? event.message;
  reportCrash(error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason: unknown = event.reason;
  reportCrash(reason);
});
