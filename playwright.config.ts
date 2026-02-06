import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for MorningStack.
 *
 * Uses the Next.js dev server on port 3000 with Turbopack.
 * Tests run in headless Chromium by default. The webServer
 * config auto-starts `pnpm dev` before tests if needed.
 *
 * Environment: Auth.js requires AUTH_SECRET to function.
 * The webServer.env provides a dummy secret so the app can
 * start without real OAuth credentials.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "tablet",
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent: devices["iPad (gen 7)"].userAgent,
      },
    },
  ],

  webServer: {
    command: "pnpm dev --port 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      AUTH_SECRET: "e2e-test-secret-not-for-production-use",
      AUTH_TRUST_HOST: "true",
    },
  },
});
