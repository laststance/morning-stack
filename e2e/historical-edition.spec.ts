import { expect, test, type Page } from "@playwright/test";

import { openMobileMenu, waitForPageReady } from "./fixtures";

const TODAY = "2030-01-15";
const YESTERDAY = "2030-01-14";
const EARLIEST_ARCHIVE_DATE = "2030-01-12";
const E2E_SESSION_TOKEN = "e2e-session-token";

test.describe("Historical edition navigation", () => {
  test("previous and next switch between article-only history and widget-rich today", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/?edition=morning");
    await waitForPageReady(page);

    // Assert current
    await expect(page.getByText("Current shared story").first()).toBeVisible();
    await expect(page.getByLabel("Stock ticker").first()).toBeVisible();
    await expect(page.getByText("Weather", { exact: true })).toBeVisible();
    await expect(page.getByText("Markets", { exact: true })).toBeVisible();

    // Act historical
    await page.getByRole("button", { name: /Previous day/ }).click();

    // Assert historical
    await expect(page).toHaveURL(`/?date=${YESTERDAY}&edition=morning`);
    await expect(
      page.getByText("Historical shared story").first(),
    ).toBeVisible();
    await expect(page.getByLabel("Stock ticker")).toHaveCount(0);
    await expect(page.getByText("Weather", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Markets", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Jan 14, 2030", { exact: true })).toHaveCount(
      1,
    );

    // Act current
    await page.getByRole("button", { name: /Next day/ }).click();

    // Assert current canonical URL
    await expect(page).toHaveURL("/?edition=morning");
    await expect(page.getByText("Current shared story").first()).toBeVisible();
  });

  test("switching Evening and Morning retains the selected historical date", async ({
    page,
  }) => {
    // Arrange
    await page.goto(`/?date=${YESTERDAY}&edition=morning`);
    await waitForPageReady(page);

    // Act
    await clickEditionLink(page, "Evening");

    // Assert
    await expect(page).toHaveURL(`/?date=${YESTERDAY}&edition=evening`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "No Evening edition for Jan 14, 2030",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Stock ticker")).toHaveCount(0);

    // Act
    await clickEditionLink(page, "Morning");

    // Assert
    await expect(page).toHaveURL("/?date=2030-01-14&edition=morning");
    await expect(
      page.getByText("Historical shared story").first(),
    ).toBeVisible();
  });

  test("date picker disables future dates and restores trigger focus after Escape", async ({
    page,
  }) => {
    // Arrange
    await page.goto(`/?date=${YESTERDAY}&edition=morning`);
    const dateTrigger = page.getByRole("button", {
      name: /Choose edition date/,
    });

    // Act
    await dateTrigger.click();
    const futureDate = page.getByRole("button", {
      name: "Wednesday, January 16th, 2030",
    });

    // Assert calendar bounds
    await expect(futureDate).toBeDisabled();

    // Act focus recovery
    await page.keyboard.press("Escape");

    // Assert focus recovery
    await expect(dateTrigger).toBeFocused();
  });

  test("date picker closes when the selected date is chosen again", async ({
    page,
  }) => {
    // Arrange
    await page.goto(`/?date=${YESTERDAY}&edition=morning`);
    const dateTrigger = page.getByRole("button", {
      name: /Choose edition date/,
    });
    await dateTrigger.click();

    // Act
    await page
      .getByRole("button", { name: "Monday, January 14th, 2030" })
      .click();

    // Assert
    await expect(dateTrigger).toHaveAttribute("aria-expanded", "false");
  });

  test("unknown older dates redirect to the shared lower bound without changing edition type", async ({
    page,
  }) => {
    // Arrange / Act
    await page.goto("/?date=2030-01-10&edition=evening");

    // Assert
    await expect(page).toHaveURL(
      `/?date=${EARLIEST_ARCHIVE_DATE}&edition=evening`,
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "No Evening edition for Jan 12, 2030",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Previous day,/ }),
    ).toBeDisabled();
    await expect(
      page
        .locator('[data-slot="empty"]')
        .getByRole("button", { name: "Previous day", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  });

  test("browser history restores canonical date and edition selections", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/?edition=morning");
    await page.getByRole("button", { name: /Previous day/ }).click();
    await expect(page).toHaveURL(`/?date=${YESTERDAY}&edition=morning`);

    // Act / Assert back
    await page.goBack();
    await expect(page).toHaveURL("/?edition=morning");
    await expect(page.getByText("Current shared story").first()).toBeVisible();

    // Act / Assert forward
    await page.goForward();
    await expect(page).toHaveURL(`/?date=${YESTERDAY}&edition=morning`);
    await expect(
      page.getByText("Historical shared story").first(),
    ).toBeVisible();
  });

  test("persisted article IDs keep same-source identities independent across editions", async ({
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
    await page.goto("/?edition=morning");
    const currentStory = page
      .locator("article")
      .filter({ hasText: "Current shared story" })
      .first();

    // Assert the seeded current persisted ID is bookmarked
    await expect(
      currentStory.getByRole("button", { name: "Remove bookmark" }),
    ).toBeVisible();

    // Act
    await page.getByRole("button", { name: /Previous day/ }).click();
    const historicalStory = page
      .locator("article")
      .filter({ hasText: "Historical shared story" })
      .first();

    // Assert the repeated external ID did not leak bookmark state
    await expect(
      historicalStory.getByRole("button", { name: "Bookmark article" }),
    ).toBeVisible();
  });

  test("date rail, touch actions, and article layout stay inside a 320px viewport", async ({
    page,
  }) => {
    // Arrange
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto(`/?date=${YESTERDAY}&edition=morning`);
    const historicalStory = page
      .locator('article[data-article-variant="lead"]:visible')
      .first();
    const bookmarkButton = historicalStory.getByRole("button", {
      name: "Bookmark",
    });
    const shareButton = historicalStory.getByRole("button", {
      name: "Share article",
    });
    const hideButton = historicalStory.getByRole("button", {
      name: "Hide options",
    });

    // Act
    const bookmarkBox = await bookmarkButton.boundingBox();
    const shareBox = await shareButton.boundingBox();
    const hideBox = await hideButton.boundingBox();
    await shareButton.click();
    const articleBox = await historicalStory.boundingBox();
    const expandedActionBoxes = await Promise.all(
      [
        "Bookmark article",
        "Share to X",
        "Share to Bluesky",
        "Copy link",
        "Close share menu",
        "Hide options",
      ].map((label) =>
        historicalStory.getByRole("button", { name: label }).boundingBox(),
      ),
    );
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));

    // Assert
    expect(widths).toEqual({ client: 320, scroll: 320 });
    expect(bookmarkBox?.width).toBeGreaterThanOrEqual(44);
    expect(bookmarkBox?.height).toBeGreaterThanOrEqual(44);
    expect(shareBox?.width).toBeGreaterThanOrEqual(44);
    expect(shareBox?.height).toBeGreaterThanOrEqual(44);
    expect(hideBox?.width).toBeGreaterThanOrEqual(44);
    expect(hideBox?.height).toBeGreaterThanOrEqual(44);
    expect(articleBox).not.toBeNull();
    for (const actionBox of expandedActionBoxes) {
      expect(actionBox).not.toBeNull();
      expect(actionBox!.x).toBeGreaterThanOrEqual(articleBox!.x);
      expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(
        articleBox!.x + articleBox!.width,
      );
      expect(actionBox!.y).toBeGreaterThanOrEqual(articleBox!.y);
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(
        articleBox!.y + articleBox!.height,
      );
    }
    await expect(
      historicalStory.getByRole("button", { name: "Share to X" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Edition date" }),
    ).toBeVisible();
  });
});

/**
 * Selects a visible header or mobile-menu edition link so the same observable spec runs across browser projects.
 * @param page - Playwright page at the Home route.
 * @param label - Exact accessible Morning or Evening link label.
 * @returns Resolves after the visible link receives the click.
 * @example
 * await clickEditionLink(page, "Evening")
 */
async function clickEditionLink(
  page: Page,
  label: "Morning" | "Evening",
): Promise<void> {
  const desktopLink = page
    .locator("header")
    .getByRole("link", { name: label, exact: true });
  if (await desktopLink.isVisible()) {
    await desktopLink.click();
    return;
  }

  await openMobileMenu(page);
  await page
    .locator('[aria-label="Mobile navigation"]:visible')
    .first()
    .getByRole("link", { name: label, exact: true })
    .click();
}
