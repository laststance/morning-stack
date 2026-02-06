import { test, expect } from "@playwright/test";
import { waitForPageReady, isMobileViewport, openMobileMenu } from "./fixtures";

test.describe("Navigation", () => {
  test("logo links to home page", async ({ page }) => {
    await page.goto("/about");
    await waitForPageReady(page);

    const logo = page.locator("header").getByText("MorningStack").first();
    await logo.click();

    await expect(page).toHaveURL("/");
  });

  test("login link navigates to login page", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      await mobileNav.getByText("Login").click();
    } else {
      const loginBtn = page.locator("header").getByText("Login").first();
      await loginBtn.click();
    }

    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Continue with GitHub")).toBeVisible();
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });

  test("about page loads correctly", async ({ page }) => {
    await page.goto("/about");
    await waitForPageReady(page);

    await expect(page.getByText(/MorningStack/i).first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("login page shows OAuth providers", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Continue with GitHub")).toBeVisible();
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(
      page.getByText("Sign in to save bookmarks"),
    ).toBeVisible();
  });

  test("bookmarks route redirects to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/bookmarks");

    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl");
  });

  test("settings route redirects to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/settings");

    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl");
  });
});

test.describe("Theme Toggle", () => {
  test("theme toggle button is visible", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
      // On mobile, theme toggle is text ("Light mode" / "Dark mode")
      const mobileNav = page.getByLabel("Mobile navigation");
      const themeBtn = mobileNav.getByText(/light mode|dark mode/i).first();
      await expect(themeBtn).toBeVisible();
    } else {
      const themeToggle = page.getByLabel(/switch to (light|dark) theme/i).first();
      await expect(themeToggle).toBeVisible();
    }
  });

  test("clicking theme toggle switches between dark and light", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const html = page.locator("html");

    // Get initial theme
    const initialClass = await html.getAttribute("class");
    const isDarkInitially = initialClass?.includes("dark") ?? false;

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      const themeBtn = mobileNav.getByText(/light mode|dark mode/i).first();
      await themeBtn.click();
    } else {
      const themeToggle = page.getByLabel(/switch to (light|dark) theme/i).first();
      await themeToggle.click();
    }

    // Wait for class change
    await page.waitForTimeout(300);
    const newClass = await html.getAttribute("class");
    const isDarkNow = newClass?.includes("dark") ?? false;

    // Theme should have toggled
    expect(isDarkNow).not.toBe(isDarkInitially);
  });
});
