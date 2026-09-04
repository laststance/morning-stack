import { expect, test } from "@playwright/test";

const E2E_SESSION_TOKEN = "e2e-session-token";

test("Default Edition survives reload and sign-out while explicit Home URLs still win", async ({
  baseURL,
  context,
  page,
}) => {
  // Arrange
  if (!baseURL) throw new Error("Playwright baseURL is required for cookies");
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: E2E_SESSION_TOKEN,
      url: baseURL,
    },
  ]);
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Display" }).click();

  // Act
  await page.getByRole("button", { name: "Evening" }).click();
  await expect
    .poll(async () => {
      const savedCookie = (await context.cookies()).find(
        (cookie) => cookie.name === "morningstack-default-edition",
      );
      return savedCookie?.value;
    })
    .toBe("evening");

  // Assert the settled server action keeps the new selection before any reload.
  await expect(page.getByRole("button", { name: "Evening" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await page.getByRole("tab", { name: "Display" }).click();

  // Assert persisted Settings and implicit Home behavior.
  await expect(page.getByRole("button", { name: "Evening" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/");
  await expect(
    page.locator('header a[aria-current="page"]').first(),
  ).toContainText("Evening");

  // Act without the authenticated account cookie.
  await context.clearCookies({ name: "authjs.session-token" });
  await page.goto("/");

  // Assert the browser preference survives sign-out independently.
  await expect(
    page.locator('header a[aria-current="page"]').first(),
  ).toContainText("Evening");
  await expect
    .poll(async () => {
      const savedCookie = (await context.cookies()).find(
        (cookie) => cookie.name === "morningstack-default-edition",
      );
      return savedCookie?.value;
    })
    .toBe("evening");

  // Act with explicit URL selection.
  await page.goto("/?edition=morning");

  // Assert explicit URL precedence.
  await expect(
    page.locator('header a[aria-current="page"]').first(),
  ).toContainText("Morning");
});
