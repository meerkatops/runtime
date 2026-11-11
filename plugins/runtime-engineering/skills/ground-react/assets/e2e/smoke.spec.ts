import { expect, test } from "@playwright/test";

test("the home page loads, counts a click, fits its width and logs no error", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  const response = await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "App name" })).toBeVisible();

  // The policy is on the page's own response, and the page's scripts and styles run under it.
  const policy = response?.headers()["content-security-policy"];
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("frame-ancestors 'none'");

  await page.getByRole("button", { name: "Add one" }).click();
  await expect(page.getByText("Items checked: 1")).toBeVisible();

  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowPx).toBe(0);
  expect(consoleErrors).toEqual([]);
});

test("the notice is read on the server, and a caller who is not signed in cannot change it", async ({ page }) => {
  await page.goto("/");
  const notice = page.getByText("Welcome. Change this notice in data/notice.json.");
  await expect(notice).toBeVisible();

  await page.getByRole("textbox", { name: "New notice" }).fill("Closed Friday");
  await page.getByRole("button", { name: "Change notice" }).click();

  await expect(page.getByText("Sign in to change the notice.")).toBeVisible();
  await page.reload();
  await expect(notice).toBeVisible();
});

test("the crash endpoint takes a report from the app's own page and refuses one from another site", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const status = await page.evaluate(async () => {
    const report = { name: "Error", message: "e2e", stack: null, cause: null, digest: null, path: "/" };
    const sent = await fetch("/api/crash", { method: "POST", body: JSON.stringify(report) });
    return sent.status;
  });
  expect(status).toBe(204);

  const crossSite = await request.post("/api/crash", {
    headers: { "Sec-Fetch-Site": "cross-site", Origin: "https://evil.example.com" },
    data: { name: "Error", message: "e2e", stack: null, cause: null, digest: null, path: "/" },
  });
  expect(crossSite.status()).toBe(403);
});

test.describe("for a person who asked for less motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a control's transition ends at once", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Add one" });
    const durationSeconds = await button.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
    expect(durationSeconds).toBeLessThan(0.001);
  });
});
