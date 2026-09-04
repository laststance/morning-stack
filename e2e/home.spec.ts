import { test, expect, type Page } from "@playwright/test";
import { waitForPageReady, isMobileViewport, openMobileMenu } from "./fixtures";

/**
 * Click an edition link in the visible desktop header or mobile menu.
 * @param page - The Playwright page under test.
 * @param label - The exact accessible link label to select.
 * @returns A resolved promise after the link click action completes.
 * @example
 * await clickEditionLink(page, "Evening");
 */
async function clickEditionLink(
  page: Page,
  label: "Morning" | "Evening",
): Promise<void> {
  if (isMobileViewport(page)) {
    await openMobileMenu(page);
    const mobileNav = page.getByLabel("Mobile navigation");
    await mobileNav.getByRole("link", { name: label, exact: true }).click();
    return;
  }

  await page
    .locator("header")
    .getByRole("link", { name: label, exact: true })
    .click();
}

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("loads with header, logo, and edition navigation links", async ({
    page,
  }) => {
    // Header is visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Logo text
    await expect(page.getByText("MorningStack").first()).toBeVisible();

    if (isMobileViewport(page)) {
      // On mobile, edition links are inside the hamburger menu.
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      const editionLinks = mobileNav.getByLabel("Edition selector");
      await expect(editionLinks).toBeVisible();
    } else {
      // On desktop, edition links have their own navigation landmark.
      const editionNavigation = page
        .getByRole("navigation", { name: "Edition selector" })
        .first();
      await expect(editionNavigation).toBeVisible();

      const morningLink = page
        .getByRole("link", { name: "Morning", exact: true })
        .first();
      const eveningLink = page
        .getByRole("link", { name: "Evening", exact: true })
        .first();
      await expect(morningLink).toBeVisible();
      await expect(eveningLink).toBeVisible();
    }
  });

  test("displays either edition content or no-edition fallback", async ({
    page,
  }) => {
    const hasContent = await page
      .getByText("No edition available")
      .isVisible()
      .catch(() => false);
    const hasSections = await page
      .locator("h2")
      .first()
      .isVisible()
      .catch(() => false);

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

test.describe("Edition link navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("one edition link represents the time-based or saved default", async ({
    page,
  }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
      const mobileNav = page.getByLabel("Mobile navigation");
      const currentEditionLink = mobileNav.locator('a[aria-current="page"]');
      await expect(currentEditionLink).toBeVisible();
      const linkText = await currentEditionLink.textContent();
      expect(linkText).toMatch(/Morning|Evening/);
    } else {
      const currentEditionLink = page
        .locator('header a[aria-current="page"]')
        .first();
      await expect(currentEditionLink).toBeVisible();
      const linkText = await currentEditionLink.textContent();
      expect(linkText).toMatch(/Morning|Evening/);
    }
  });

  test("clicking Evening updates the current navigation link", async ({
    page,
  }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    const eveningLink = page
      .getByRole("link", { name: "Evening", exact: true })
      .first();
    await eveningLink.click();

    if (isMobileViewport(page)) {
      // Menu closes on navigation; reopen to verify the committed route.
      await openMobileMenu(page);
    }

    const eveningLinkAfter = page
      .getByRole("link", { name: "Evening", exact: true })
      .first();
    await expect(eveningLinkAfter).toHaveAttribute("aria-current", "page");

    const morningLink = page
      .getByRole("link", { name: "Morning", exact: true })
      .first();
    await expect(morningLink).not.toHaveAttribute("aria-current", "page");
  });

  test("clicking Morning switches the current navigation link back", async ({
    page,
  }) => {
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    // Switch to evening first
    const eveningLink = page
      .getByRole("link", { name: "Evening", exact: true })
      .first();
    await eveningLink.click();

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    // Switch back to Morning.
    const morningLink = page
      .getByRole("link", { name: "Morning", exact: true })
      .first();
    await morningLink.click();

    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }

    const morningLinkAfter = page
      .getByRole("link", { name: "Morning", exact: true })
      .first();
    await expect(morningLinkAfter).toHaveAttribute("aria-current", "page");

    const eveningLinkAfter = page
      .getByRole("link", { name: "Evening", exact: true })
      .first();
    await expect(eveningLinkAfter).not.toHaveAttribute("aria-current", "page");
  });

  test("clicking edition links navigates to edition-specific URLs so server data refreshes", async ({
    page,
  }) => {
    // Arrange
    await expect(page.locator("header")).toBeVisible();

    // Act
    await clickEditionLink(page, "Evening");

    // Assert
    await expect(page).toHaveURL(/[?&]edition=evening(?:&|$)/);

    // Act
    await clickEditionLink(page, "Morning");

    // Assert
    await expect(page).toHaveURL(/[?&]edition=morning(?:&|$)/);
  });

  test("modifier-clicking an edition link opens its URL separately and keeps the current page", async ({
    context,
    page,
  }) => {
    // Arrange
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }
    const originalUrl = page.url();
    const eveningLink = page
      .getByRole("link", { name: "Evening", exact: true })
      .first();

    // Act
    const [openedPage] = await Promise.all([
      context.waitForEvent("page"),
      eveningLink.click({ modifiers: ["ControlOrMeta"] }),
    ]);
    await openedPage.waitForLoadState("domcontentloaded");

    // Assert
    expect(page.url()).toBe(originalUrl);
    await expect(openedPage).toHaveURL(/[?&]edition=evening(?:&|$)/);
    await openedPage.close();
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

    // Click Evening.
    await scope
      .getByRole("link", { name: "Evening", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/[?&]edition=evening(?:&|$)/);

    scope = await getNavScope();
    await expect(scope.getByText("Evening Edition").first()).toBeVisible();

    // Click Morning.
    await scope
      .getByRole("link", { name: "Morning", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/[?&]edition=morning(?:&|$)/);

    scope = await getNavScope();
    await expect(scope.getByText("Morning Edition").first()).toBeVisible();
  });
});
