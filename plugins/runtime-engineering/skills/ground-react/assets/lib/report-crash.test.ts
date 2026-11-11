import { afterEach, expect, test, vi } from "vitest";

import { reportCrash } from "./report-crash";

afterEach(() => {
  vi.unstubAllGlobals();
});

type SendBeacon = (url: string, data: Blob) => boolean;
type Fetch = (url: string, init: { readonly method: string; readonly keepalive: boolean; readonly body: string }) => Promise<Response>;

/** Replaces the browser's two ways to send, and returns the spies. */
function stubSending(beaconQueued: boolean, fetchResult: Promise<Response>) {
  const sendBeacon = vi.fn<SendBeacon>(() => beaconQueued);
  const fetch = vi.fn<Fetch>(() => fetchResult);
  vi.stubGlobal("navigator", { sendBeacon });
  vi.stubGlobal("fetch", fetch);
  return { sendBeacon, fetch };
}

test("a crash is sent with sendBeacon, redacted, and fetch is not used", async () => {
  const { sendBeacon, fetch } = stubSending(true, Promise.resolve(new Response(null, { status: 204 })));

  reportCrash(new Error("load failed for ?token=abc"));

  expect(fetch).not.toHaveBeenCalled();
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  const sent = sendBeacon.mock.calls[0];
  expect(sent?.[0]).toBe("/api/crash");
  expect(JSON.parse((await sent?.[1].text()) ?? "")).toMatchObject({ message: "load failed for ?token=[redacted]", path: "/" });
});

test("when sendBeacon refuses the report, a keepalive fetch sends the same body", () => {
  const { fetch } = stubSending(false, Promise.resolve(new Response(null, { status: 204 })));

  reportCrash(new Error("boom"));

  expect(fetch).toHaveBeenCalledTimes(1);
  const sent = fetch.mock.calls[0];
  expect(sent?.[0]).toBe("/api/crash");
  expect(sent?.[1]).toMatchObject({ method: "POST", keepalive: true });
  expect(JSON.parse(sent?.[1].body ?? "")).toMatchObject({ name: "Error", message: "boom" });
});

test("a failed fallback is logged, never thrown into the handler that would report it again", async () => {
  const sendError = new TypeError("Failed to fetch");
  stubSending(false, Promise.reject(sendError));
  const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

  reportCrash(new Error("boom"));
  await vi.waitFor(() => {
    expect(logged).toHaveBeenCalledWith("The crash report could not be sent.", sendError);
  });
  logged.mockRestore();
});
