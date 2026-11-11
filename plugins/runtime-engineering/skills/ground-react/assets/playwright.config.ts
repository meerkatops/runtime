import { defineConfig, devices } from "@playwright/test";

// The flows get a server of their own on a port kept for them. A server already on that port is never
// reused, since it may be a dev server or an older build: Playwright stops with an error instead.
const E2E_PORT = 3217;
const baseURL = `http://localhost:${String(E2E_PORT)}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: process.env["CI"] !== undefined,
  reporter: "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // The narrowest width the app must hold (the rulebook's X13).
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  // `next start` serves the production build, so `npm run build` comes first.
  webServer: {
    command: `npm run start -- --port ${String(E2E_PORT)}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
