import { expect, test, type Page } from "@playwright/test";

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

    // Assert current
    await expect(page.getByText("Current shared story").first()).toBeVisible();
    await expect(page.getByLabel("Stock ticker")).toBeVisible();
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

  test("edition tabs retain the selected historical date", async ({ page }) => {
    // Arrange
    await page.goto(`/?date=${YESTERDAY}&edition=morning`);

    // Act
    await clickEditionTab(page, /Evening/i);

    // Assert
    await expect(page).toHaveURL(`/?date=${YESTERDAY}&edition=evening`);
    await expect(
      page.getByText(`No Evening edition for Jan 14, 2030`),
    ).toBeVisible();
    await expect(page.getByLabel("Stock ticker")).toHaveCount(0);
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
      page.getByText("No Evening edition for Jan 12, 2030"),
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
      .getByRole("region", { name: "Hacker News" })
      .locator("article");
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
    await expect(
      historicalStory.getByRole("button", { name: "Share to X" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Edition date" }),
    ).toBeVisible();
  });
});

/**
 * Selects a visible header or mobile-menu edition tab so the same observable spec runs across browser projects.
 * @param page - Playwright page at the Home route.
 * @param label - Accessible Morning or Evening tab label.
 * @returns Resolves after the visible tab receives the click.
 * @example
 * await clickEditionTab(page, /Evening/i)
 */
async function clickEditionTab(page: Page, label: RegExp): Promise<void> {
  const desktopTab = page.locator("header").getByRole("tab", { name: label });
  if (await desktopTab.isVisible()) {
    await desktopTab.click();
    return;
  }

  await page.getByLabel("Open menu").click();
  await page
    .getByLabel("Mobile navigation")
    .getByRole("tab", { name: label })
    .click();
}
