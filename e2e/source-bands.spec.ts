import { expect, test } from "@playwright/test";

import { waitForPageReady } from "./fixtures";

test.describe("Source-owned editorial bands — desktop composition", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Desktop hover and grid assertions run in the desktop Chromium project.",
    );
  });

  test("pull request tabs keep touch targets and odd rows usable", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);
    const section = page.getByRole("region", { name: "Pull Requests" });
    const openTab = section.getByRole("tab", { name: "open" });
    const mergedTab = section.getByRole("tab", { name: "merged" });

    // Act
    const openTabBox = await openTab.boundingBox();
    const mergedTabBox = await mergedTab.boundingBox();
    const openGrid = section.locator(":scope > div.grid").first();
    const openCards = section.locator('[data-article-variant="pull-request"]');
    const lastOpenCardWrapper = openGrid.locator(":scope > div").last();
    await openCards.first().hover();
    const firstOpenCardActions = openCards
      .first()
      .locator("[data-article-actions]");

    // Assert
    await expect(openTab).toHaveAttribute("aria-selected", "true");
    expect(openTabBox?.height).toBeGreaterThanOrEqual(44);
    expect(mergedTabBox?.height).toBeGreaterThanOrEqual(44);
    await expect(openCards).toHaveCount(3);
    await expect(lastOpenCardWrapper).toHaveCSS("grid-column-end", "span 2");
    await expect(firstOpenCardActions).toBeVisible();
    await expect(firstOpenCardActions).toHaveCSS("opacity", "1");

    // Act
    await mergedTab.click();

    // Assert
    await expect(mergedTab).toHaveAttribute("aria-selected", "true");
    await expect(openTab).toHaveAttribute("aria-selected", "false");
    await expect(
      section.locator('[data-article-variant="pull-request"]'),
    ).toHaveCount(1);
    await expect(section).toContainText("Merge responsive source bands");
  });

  test("Bluesky stories render identity, engagement, copy, and shared actions", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);
    const socialSection = page.getByRole("region", { name: "Social Media" });
    const blueskyCards = socialSection.locator(
      '[data-article-variant="social-post"]',
    );
    const blueskyCard = blueskyCards.first();

    // Act
    await blueskyCard.hover();
    const actions = blueskyCard.locator("[data-article-actions]");

    // Assert
    await expect(
      socialSection.getByRole("heading", { name: "Bluesky" }),
    ).toBeVisible();
    await expect(blueskyCard).toContainText("Editorial Systems");
    await expect(blueskyCard).toContainText("@editorial.example");
    await expect(blueskyCard).toContainText(
      "A calmer news layout starts with clear hierarchy.",
    );
    await expect(blueskyCard).toContainText("1.3K");
    await expect(blueskyCard).toContainText("320");
    await expect(
      actions.getByRole("button", { name: "Bookmark article" }),
    ).toBeVisible();
    await expect(actions.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(
      actions.getByRole("button", { name: "Hide options" }),
    ).toBeVisible();
    await expect(actions).toHaveCSS("opacity", "1");
    await expect(blueskyCards).toHaveCount(3);
    const blueskyCardHeights = await blueskyCards.evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().height)),
    );
    expect(new Set(blueskyCardHeights).size).toBe(1);
  });

  test("generic source grids adapt between five-story and one-story editions", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);
    const currentTechSection = page.getByRole("region", { name: "Tech News" });
    const currentGrid = currentTechSection.locator(
      '[data-layout="article-grid"]',
    );

    // Act
    const currentColumns = await currentGrid.evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" "),
    );

    // Assert
    await expect(currentGrid).toHaveAttribute("data-article-count", "5");
    await expect(
      currentGrid.locator('[data-article-variant="standard"]'),
    ).toHaveCount(5);
    expect(currentColumns).toHaveLength(6);
    await expect(currentGrid.locator(":scope > div").nth(0)).toHaveCSS(
      "grid-column-end",
      "span 2",
    );
    await expect(currentGrid.locator(":scope > div").nth(3)).toHaveCSS(
      "grid-column-end",
      "span 3",
    );

    const redditGrid = page
      .getByRole("region", { name: "Reddit" })
      .locator('[data-layout="article-grid"]');
    const redditColumns = await redditGrid.evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" "),
    );
    await expect(redditGrid).toHaveAttribute("data-article-count", "4");
    expect(redditColumns).toHaveLength(2);

    // Act
    await page.goto("/?edition=evening");
    await waitForPageReady(page);
    const eveningGrid = page
      .getByRole("region", { name: "Tech News" })
      .locator('[data-layout="article-grid"]');

    // Assert
    await expect(eveningGrid).toHaveAttribute("data-article-count", "1");
    await expect(
      eveningGrid.locator('[data-article-variant="wide"]'),
    ).toHaveCount(1);
  });
});

test.describe("Source-owned editorial bands — responsive composition", () => {
  test("Hacker News and Bluesky adapt at each configured viewport without horizontal overflow", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);
    const viewportWidth = page.viewportSize()?.width;
    if (!viewportWidth) throw new Error("A configured viewport is required");
    const hackerNewsGrid = page
      .getByRole("region", { name: "Hacker News" })
      .locator(":scope > div.grid");
    const blueskyGrid = page
      .getByRole("region", { name: "Social Media" })
      .locator("div.grid")
      .first();

    // Act
    const hackerNewsColumns = await hackerNewsGrid.evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" "),
    );
    const blueskyColumns = await blueskyGrid.evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" "),
    );
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));

    // Assert
    expect(hackerNewsColumns).toHaveLength(viewportWidth >= 1024 ? 2 : 1);
    expect(blueskyColumns).toHaveLength(
      viewportWidth >= 768 ? 3 : viewportWidth >= 640 ? 2 : 1,
    );
    expect(widths.scroll).toBe(widths.client);
  });
});
