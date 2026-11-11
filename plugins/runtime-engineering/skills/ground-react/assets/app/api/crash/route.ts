import { isCrashReport, MAX_REPORT_BYTES, toCrashRecord } from "../../../lib/crash-record";
import { readAppVersion, writeCrashRecord } from "../../../lib/write-crash-record";

/**
 * True when the browser says the post comes from this app's own pages. Next.js makes this check for a
 * Server Function; a Route Handler makes it itself. `Sec-Fetch-Site` decides where the browser sends
 * it; elsewhere `Origin` must name this host. A post that carries neither is refused.
 */
function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return origin !== null && host !== null && URL.canParse(origin) && new URL(origin).host === host;
}

/** Reads the body up to the cap; null when it is larger. The cap is checked before each chunk is kept. */
async function readCappedText(request: Request, maxBytes: number): Promise<string | null> {
  if (request.body === null) return "";
  const decoder = new TextDecoder();
  let text = "";
  let totalBytes = 0;
  for await (const chunk of request.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) return null;
    text += decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode();
}

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

// Receives a crash report from the browser and writes the crash record. The body is not ours: a post
// from another site is refused, the body is capped before it is read, and its shape is checked
// before it is used.
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const text = await readCappedText(request, MAX_REPORT_BYTES);
  if (text === null) return new Response(null, { status: 413 });
  const report = parseJson(text);
  if (!isCrashReport(report)) return new Response(null, { status: 400 });
  writeCrashRecord(toCrashRecord(report, "browser", new Date(), readAppVersion()));
  return new Response(null, { status: 204 });
}
