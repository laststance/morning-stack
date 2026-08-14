import { defineConfig, devices } from "@playwright/test";

const e2eDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54329/morning_stack_e2e";
const E2E_TODAY_JST = "2030-01-15";
const e2ePort = Number(process.env.E2E_PORT ?? "3198");

/**
 * Playwright E2E test configuration for MorningStack.
 *
 * Splits logic, destructive local-DB setup, and browser coverage so seeded archive tests stay deterministic.
 * @returns Playwright configuration for CI Chromium/Pixel 5 and optional local tablet verification.
 * @example
 * pnpm test:e2e --project=logic --project=chromium
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
    baseURL: `http://localhost:${e2ePort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "logic",
      testMatch: /logic\/.*\.spec\.ts/,
    },
    {
      name: "database-setup",
      testMatch: /database\/setup\.spec\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["database-setup"],
      testIgnore: [/logic\//, /database\//],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      dependencies: ["database-setup"],
      testIgnore: [/logic\//, /database\//],
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "tablet",
      dependencies: ["database-setup"],
      testIgnore: [/logic\//, /database\//],
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent: devices["iPad (gen 7)"].userAgent,
      },
    },
  ],

  webServer: {
    command: `sh -c 'if command -v kill-port >/dev/null 2>&1; then kill-port ${e2ePort}; fi; pnpm exec next dev --turbopack --port ${e2ePort}'`,
    port: e2ePort,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      AUTH_SECRET: "e2e-test-secret-not-for-production-use",
      AUTH_TRUST_HOST: "true",
      DATABASE_URL: e2eDatabaseUrl,
      E2E_TODAY_JST,
      MORNINGSTACK_E2E: "true",
    },
  },
});
