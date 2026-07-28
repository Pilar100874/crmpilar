import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para testes E2E.
 * O dev server do Lovable já roda em http://localhost:8080 — não sobe webServer aqui.
 * Rode com: `bunx playwright test`
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
