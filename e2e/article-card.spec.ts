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
    // Find any article card link on the page
    const articleLinks = page.locator('article a[target="_blank"]');
    const count = await articleLinks.count();

    if (count > 0) {
      // Verify external links have correct attributes
      const firstLink = articleLinks.first();
      await expect(firstLink).toHaveAttribute("target", "_blank");
      await expect(firstLink).toHaveAttribute("rel", /noopener/);

      // Verify the href is a valid URL
      const href = await firstLink.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    } else {
      // No edition data — check fallback is showing
      await expect(page.getByText("No edition available")).toBeVisible();
    }
  });

  test("article card shows source badge", async ({ page }) => {
    // Article cards should have source badges with known source names
    const knownSources = [
      "Hacker News",
      "GitHub",
      "Reddit",
      "Tech News",
      "Hatena",
      "Bluesky",
      "YouTube",
      "World News",
      "Product Hunt",
    ];

    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      // At least one article card should have a recognizable source badge
      let foundSource = false;
      for (const source of knownSources) {
        const badge = page.locator("article").getByText(source, { exact: true }).first();
        if (await badge.isVisible().catch(() => false)) {
          foundSource = true;
          break;
        }
      }
      expect(foundSource).toBeTruthy();
    }
  });

  test("bookmark button is visible on article card hover", async ({
    page,
  }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      // Hover over the card to reveal action buttons
      await firstArticle.hover();

      // Look for bookmark button (Star icon with aria-label)
      const bookmarkBtn = firstArticle.getByLabel(/bookmark/i).first();
      await expect(bookmarkBtn).toBeVisible({ timeout: 3000 });
    }
  });

  test("share button is visible on article card hover", async ({ page }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Look for share button
      const shareBtn = firstArticle.getByLabel(/share/i).first();
      await expect(shareBtn).toBeVisible({ timeout: 3000 });
    }
  });

  test("hide options button is visible on article card hover", async ({
    page,
  }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Look for hide button
      const hideBtn = firstArticle.getByLabel(/hide/i).first();
      await expect(hideBtn).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Bookmark Feature", () => {
  test("clicking bookmark without auth redirects to login", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      const bookmarkBtn = firstArticle.getByLabel(/bookmark/i).first();

      // Set up navigation listener before clicking
      const navigationPromise = page.waitForURL(/\/login/, {
        timeout: 5000,
      });

      await bookmarkBtn.click();

      // Should redirect to login page
      await navigationPromise;
      expect(page.url()).toContain("/login");
    }
  });
});

test.describe("Hide Feature", () => {
  test("hide dropdown shows three options on click", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Click the hide button to open dropdown
      const hideBtn = firstArticle.getByLabel("Hide options").first();
      await hideBtn.click();

      // Dropdown should show three hide options
      await expect(page.getByText("Hide this article")).toBeVisible({
        timeout: 3000,
      });
      await expect(page.getByText(/Hide from /)).toBeVisible({
        timeout: 3000,
      });
      await expect(page.getByText(/Hide topic:/)).toBeVisible({
        timeout: 3000,
      });
    }
  });
});
