import { test, expect } from "@playwright/test";
import { waitForPageReady } from "./fixtures";

test.describe("Article Card Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("article cards link to external URLs with target _blank", async ({
    page,
  }) => {
    // Arrange
    const firstLink = page.locator('article a[target="_blank"]').first();

    // Act
    const href = await firstLink.getAttribute("href");

    // Assert
    await expect(firstLink).toHaveAttribute("target", "_blank");
    await expect(firstLink).toHaveAttribute("rel", /noopener/);
    expect(href).toBe("https://example.com/current-shared");
  });

  test("article card shows source badge", async ({ page }) => {
    // Arrange / Act
    const leadStory = page.getByRole("region", { name: "Featured story" });

    // Assert
    await expect(
      leadStory.getByText("Hacker News", { exact: true }),
    ).toBeVisible();
  });

  test("bookmark button is visible on article card hover", async ({ page }) => {
    // Arrange
    const firstArticle = page.locator("article").first();

    // Act
    await firstArticle.hover();

    // Assert
    await expect(firstArticle.getByLabel(/bookmark/i).first()).toBeVisible();
  });

  test("share button is visible on article card hover", async ({ page }) => {
    // Arrange
    const firstArticle = page.locator("article").first();

    // Act
    await firstArticle.hover();

    // Assert
    await expect(firstArticle.getByLabel(/share/i).first()).toBeVisible();
  });

  test("hide options button is visible on article card hover", async ({
    page,
  }) => {
    // Arrange
    const firstArticle = page.locator("article").first();

    // Act
    await firstArticle.hover();

    // Assert
    await expect(firstArticle.getByLabel(/hide/i).first()).toBeVisible();
  });

  test("lead and section headings form one text-only editorial outline", async ({
    page,
  }) => {
    // Arrange / Act
    const pageHeadings = page.locator("main h1");
    const sectionHeadings = page.locator("main h2");

    // Assert
    await expect(pageHeadings).toHaveCount(1);
    await expect(pageHeadings).toHaveText("Current shared story");
    await expect(
      sectionHeadings.filter({ hasText: /🐙|🔶|📌|🎬/u }),
    ).toHaveCount(0);
  });
});

test.describe("Article Action Consistency", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("five editorial card variants expose the same touch-safe actions", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);
    const variants = [
      "lead",
      "media-three-column",
      "compact",
      "ranked",
      "video-rail",
    ];

    // Act
    const actionSizes = [];
    for (const variant of variants) {
      const article = page
        .locator(`[data-article-variant="${variant}"]`)
        .first();
      const actions = article.locator("[data-article-actions] button");
      actionSizes.push({
        variant,
        count: await actions.count(),
        boxes: await Promise.all([
          actions.nth(0).boundingBox(),
          actions.nth(1).boundingBox(),
          actions.nth(2).boundingBox(),
        ]),
      });
    }

    // Assert
    expect(
      actionSizes.map(({ variant, count }) => ({ variant, count })),
    ).toEqual([
      { variant: "lead", count: 3 },
      { variant: "media-three-column", count: 3 },
      { variant: "compact", count: 3 },
      { variant: "ranked", count: 3 },
      { variant: "video-rail", count: 3 },
    ]);
    for (const { boxes } of actionSizes) {
      for (const box of boxes) {
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe("Bookmark Feature", () => {
  test("clicking bookmark without auth redirects to login", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);

    // Arrange
    const firstArticle = page.locator("article").first();
    await firstArticle.hover();
    const bookmarkButton = firstArticle.getByLabel(/bookmark/i).first();
    const navigationPromise = page.waitForURL(/\/login/, { timeout: 5000 });

    // Act
    await bookmarkButton.click();
    await navigationPromise;

    // Assert
    expect(page.url()).toContain("/login");
  });
});

test.describe("Hide Feature", () => {
  test("hide dropdown shows three options on click", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    // Arrange
    const firstArticle = page.locator("article").first();
    await firstArticle.hover();

    // Act
    await firstArticle.getByLabel("Hide options").first().click();

    // Assert
    await expect(page.getByText("Hide this article")).toBeVisible();
    await expect(page.getByText(/Hide from /)).toBeVisible();
    await expect(page.getByText(/Hide topic:/)).toBeVisible();
  });
});
