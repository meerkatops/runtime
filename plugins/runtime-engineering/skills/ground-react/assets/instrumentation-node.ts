import { toCrashRecord, toCrashReport } from "./lib/crash-record";
import { readAppVersion, writeCrashRecord } from "./lib/write-crash-record";

// Imported for its effect, once, by `register` on the Node.js runtime. The monitor records an
// uncaught exception and leaves Node's default in place: print the stack and exit non-zero.
process.on("uncaughtExceptionMonitor", (error) => {
  writeCrashRecord(toCrashRecord(toCrashReport(error, null), "server", new Date(), readAppVersion()));
});
