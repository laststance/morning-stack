import { test, expect } from "@playwright/test";
import { waitForPageReady } from "./fixtures";

test.describe("Share Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
  });

  test("share button expands to show X, Bluesky, and Copy Link", async ({
    page,
  }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Click the share button to expand
      const shareBtn = firstArticle.getByLabel("Share article").first();
      await shareBtn.click();

      // Expanded: X, Bluesky, Copy Link buttons should appear
      await expect(
        firstArticle.getByLabel("Share to X").first(),
      ).toBeVisible({ timeout: 3000 });
      await expect(
        firstArticle.getByLabel("Share to Bluesky").first(),
      ).toBeVisible({ timeout: 3000 });
      await expect(
        firstArticle.getByLabel("Copy link").first(),
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test("copy link button copies URL to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Expand share menu
      const shareBtn = firstArticle.getByLabel("Share article").first();
      await shareBtn.click();

      // Click copy link
      const copyBtn = firstArticle.getByLabel("Copy link").first();
      await copyBtn.click();

      // Button should change to "Link copied" state
      await expect(
        firstArticle.getByLabel("Link copied").first(),
      ).toBeVisible({ timeout: 3000 });

      // Verify clipboard content
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboardText).toMatch(/^https?:\/\//);
    }
  });

  test("share to X opens new window with correct intent URL", async ({
    page,
  }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Expand share menu
      const shareBtn = firstArticle.getByLabel("Share article").first();
      await shareBtn.click();

      // Listen for popup
      const popupPromise = page.waitForEvent("popup", { timeout: 5000 });

      // Click share to X
      const xBtn = firstArticle.getByLabel("Share to X").first();
      await xBtn.click();

      const popup = await popupPromise;
      expect(popup.url()).toContain("twitter.com/intent/tweet");
    }
  });

  test("clicking outside share menu closes it", async ({ page }) => {
    const articles = page.locator("article");
    const count = await articles.count();

    if (count > 0) {
      const firstArticle = articles.first();
      await firstArticle.hover();

      // Expand share menu
      const shareBtn = firstArticle.getByLabel("Share article").first();
      await shareBtn.click();

      // Verify expanded
      await expect(
        firstArticle.getByLabel("Share to X").first(),
      ).toBeVisible({ timeout: 3000 });

      // Click outside (on page body)
      await page.locator("body").click({ position: { x: 10, y: 10 } });

      // Share targets should disappear (button reverts to "Share article")
      await expect(
        firstArticle.getByLabel("Share to X"),
      ).toBeHidden({ timeout: 3000 });
    }
  });
});
