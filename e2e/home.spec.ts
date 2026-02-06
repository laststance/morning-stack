import { test, expect } from "@playwright/test";
import { waitForPageReady, isMobileViewport, openMobileMenu } from "./fixtures";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("loads with header, logo, and edition tabs", async ({ page }) => {
    // Header is visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Logo text
    await expect(page.getByText("MorningStack").first()).toBeVisible();

    if (isMobileViewport(page)) {
      // On mobile, tabs are inside hamburger menu
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      const tablist = mobileNav.getByRole("tablist", { name: "Edition selector" });
      await expect(tablist).toBeVisible();
    } else {
      // On desktop, tabs are in the header
      const tablist = page.getByRole("tablist", { name: "Edition selector" }).first();
      await expect(tablist).toBeVisible();

      const morningTab = page.getByRole("tab", { name: /Morning/i }).first();
      const eveningTab = page.getByRole("tab", { name: /Evening/i }).first();
      await expect(morningTab).toBeVisible();
      await expect(eveningTab).toBeVisible();
    }
  });

  test("displays either edition content or no-edition fallback", async ({
    page,
  }) => {
    const hasContent = await page.getByText("No edition available").isVisible().catch(() => false);
    const hasSections = await page.locator("h2").first().isVisible().catch(() => false);

    // One of them must be true — the page successfully rendered
    expect(hasContent || hasSections).toBeTruthy();
  });

  test("has correct page title and metadata", async ({ page }) => {
    await expect(page).toHaveTitle(/MorningStack/);
  });

  test("shows login button when not authenticated", async ({ page }) => {
    if (isMobileViewport(page)) {
      // On mobile, Login is inside hamburger menu
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      await expect(mobileNav.getByText("Login")).toBeVisible();
    } else {
      const loginButton = page.locator("header").getByText("Login").first();
      await expect(loginButton).toBeVisible();
    }
  });
});

test.describe("Edition Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("morning tab is active by default or evening based on time", async ({
    page,
  }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      const selectedTab = mobileNav.locator('[role="tab"][aria-selected="true"]');
      await expect(selectedTab).toBeVisible();
      const tabText = await selectedTab.textContent();
      expect(tabText).toMatch(/Morning|Evening/);
    } else {
      const selectedTab = page.locator('[role="tab"][aria-selected="true"]').first();
      await expect(selectedTab).toBeVisible();
      const tabText = await selectedTab.textContent();
      expect(tabText).toMatch(/Morning|Evening/);
    }
  });

  test("clicking evening tab changes active state", async ({ page }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    const eveningTab = page.getByRole("tab", { name: /Evening/i }).first();
    await eveningTab.click();

    if (isMobileViewport(page)) {
      // Menu closes on tab click; reopen to verify
      await openMobileMenu(page);
    }

    const eveningTabAfter = page.getByRole("tab", { name: /Evening/i }).first();
    await expect(eveningTabAfter).toHaveAttribute("aria-selected", "true");

    const morningTab = page.getByRole("tab", { name: /Morning/i }).first();
    await expect(morningTab).toHaveAttribute("aria-selected", "false");
  });

  test("clicking morning tab switches back", async ({ page }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    // Switch to evening first
    const eveningTab = page.getByRole("tab", { name: /Evening/i }).first();
    await eveningTab.click();

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    // Switch back to morning
    const morningTab = page.getByRole("tab", { name: /Morning/i }).first();
    await morningTab.click();

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    const morningTabAfter = page.getByRole("tab", { name: /Morning/i }).first();
    await expect(morningTabAfter).toHaveAttribute("aria-selected", "true");

    const eveningTabAfter = page.getByRole("tab", { name: /Evening/i }).first();
    await expect(eveningTabAfter).toHaveAttribute("aria-selected", "false");
  });

  test("edition date updates in header subtitle", async ({ page }) => {
    /**
     * Scope queries to the visible navigation section.
     * On mobile, the edition date lives inside the hamburger menu.
     * On desktop, it's in the header center section.
     */
    const getNavScope = async () => {
      if (isMobileViewport(page)) {
        await openMobileMenu(page);
        return page.getByLabel("Mobile navigation");
      }
      return page.locator("header");
    };

    let scope = await getNavScope();
    await expect(scope.getByText(/Edition/i).first()).toBeVisible();

    // Click evening tab
    await scope.getByRole("tab", { name: /Evening/i }).first().click();

    // On mobile, tab click closes the menu — need to wait then reopen
    if (isMobileViewport(page)) {
      await page.waitForTimeout(300);
    }

    scope = await getNavScope();
    await expect(scope.getByText("Evening Edition").first()).toBeVisible();

    // Click morning tab
    await scope.getByRole("tab", { name: /Morning/i }).first().click();

    if (isMobileViewport(page)) {
      await page.waitForTimeout(300);
    }

    scope = await getNavScope();
    await expect(scope.getByText("Morning Edition").first()).toBeVisible();
  });
});
