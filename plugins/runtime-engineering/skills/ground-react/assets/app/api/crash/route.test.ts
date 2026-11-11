// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { toCrashReport } from "../../../lib/crash-record";
import { POST } from "./route";

const URL_OF_ROUTE = "https://app.example.com/api/crash";

function post(body: string, headers: Readonly<Record<string, string>>): Request {
  return new Request(URL_OF_ROUTE, { method: "POST", body, headers });
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("a report from the app's own page is written as one redacted JSON line", async () => {
  const written = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const body = JSON.stringify(toCrashReport(new Error("boom"), "/items"));

  const response = await POST(post(body, { "sec-fetch-site": "same-origin" }));

  expect(response.status).toBe(204);
  expect(written).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(written.mock.calls[0]?.[0]))).toMatchObject({
    where: "browser",
    name: "Error",
    message: "boom",
    path: "/items",
  });
});

test("a post from another site is refused before its body is read", async () => {
  const written = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const body = JSON.stringify(toCrashReport(new Error("boom"), "/items"));

  for (const headers of [
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
    { origin: "https://evil.example.com", host: "app.example.com" },
    { "sec-fetch-site": "cross-site", origin: "https://app.example.com", host: "app.example.com" },
    {},
  ]) {
    const response = await POST(post(body, headers));
    expect(response.status).toBe(403);
  }
  expect(written).not.toHaveBeenCalled();
});

test("without Sec-Fetch-Site, an Origin that names this host is accepted", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const body = JSON.stringify(toCrashReport(new Error("boom"), "/items"));

  const direct = await POST(post(body, { origin: "https://app.example.com", host: "app.example.com" }));
  const proxied = await POST(
    post(body, { origin: "https://app.example.com", host: "10.0.0.7:3000", "x-forwarded-host": "app.example.com" }),
  );

  expect(direct.status).toBe(204);
  expect(proxied.status).toBe(204);
});

test("a body over the cap, a body that is not JSON and a wrong shape are each refused", async () => {
  const written = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const sameOrigin = { "sec-fetch-site": "same-origin" };

  expect((await POST(post("x".repeat(16_385), sameOrigin))).status).toBe(413);
  expect((await POST(post("not json", sameOrigin))).status).toBe(400);
  expect((await POST(post(JSON.stringify({ name: "Error" }), sameOrigin))).status).toBe(400);
  expect(written).not.toHaveBeenCalled();
});
