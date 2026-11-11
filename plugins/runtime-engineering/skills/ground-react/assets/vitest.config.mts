import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Every test beside its subject, in any source folder. The flows in e2e/ are `.spec.ts`, Playwright's.
    include: ["**/*.test.{ts,tsx}"],
  },
});
