import { expect, test } from "@playwright/test";

import { isMobileViewport, openMobileMenu, waitForPageReady } from "./fixtures";

const E2E_SESSION_TOKEN = "e2e-session-token";
const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT ?? "3199"}`;

test("authenticated readers see signed-in Header controls without a client session request", async ({
  context,
  page,
}) => {
  // Regression: ISSUE-001 — the Header showed Login while server-rendered article actions were authenticated.
  // Found by /qa on 2026-08-14
  // Report: .gstack/qa-reports/qa-report-localhost-2026-08-14.md

  // Arrange
  const authConsoleErrors: string[] = [];
  const clientSessionRequests: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("ClientFetchError")
    ) {
      authConsoleErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/session") {
      clientSessionRequests.push(request.url());
    }
  });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: E2E_SESSION_TOKEN,
      url: E2E_BASE_URL,
    },
  ]);

  // Act
  await page.goto("/?edition=morning");
  await waitForPageReady(page);
  if (isMobileViewport(page)) {
    await openMobileMenu(page);
  }

  // Act: leaving and returning to the tab must not reintroduce Auth.js client polling.
  const backgroundPage = await context.newPage();
  await backgroundPage.bringToFront();
  await page.bringToFront();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  // Assert
  await expect(page.getByRole("button", { name: /Sign out/ })).toBeVisible();
  await expect(
    page
      .locator("article")
      .filter({ hasText: "Current shared story" })
      .first()
      .getByRole("button", { name: "Remove bookmark" }),
  ).toBeVisible();
  expect(clientSessionRequests).toEqual([]);
  expect(authConsoleErrors).toEqual([]);

  await backgroundPage.close();
});
