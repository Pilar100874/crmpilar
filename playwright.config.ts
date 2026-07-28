import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para testes E2E.
 * O dev server do Lovable já roda em http://localhost:8080 — não sobe webServer aqui.
 * Rode com: `bunx playwright test`
 */
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  "/nix/store/nw961dvpvik5m19kbay4cg27wxgl3sdv-playwright-chromium-headless-shell/chrome-linux/headless_shell";

// Impede o Playwright de procurar builds versionados quando usamos o binário do nix.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH || process.env.PLAYWRIGHT_BROWSERS_PATH === "/") {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
}

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
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: CHROMIUM_PATH },
      },
    },
  ],
});

