import { test, expect } from "@playwright/test";
import { waitForPageReady } from "./fixtures";

const EXPECTED_EDITORIAL_SECTION_ORDER = [
  "Featured story",
  "GitHub Trending",
  "Daily widgets",
  "Supporting headlines",
  "Tech News",
  "Hacker News",
  "Reddit",
  "Social Media",
  "Pull Requests",
  "Hatena Bookmark",
];

test.describe("Responsive Layout — Mobile (<640px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("shows hamburger menu on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    // Hamburger button should be visible on mobile
    const hamburger = page.getByLabel(/open menu|close menu/i).first();
    await expect(hamburger).toBeVisible();

    // Desktop nav icons should be hidden
    const desktopBookmark = page.locator("header .hidden.sm\\:flex").first();
    await expect(desktopBookmark).toBeHidden();
  });

  test("hamburger opens mobile navigation", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const hamburger = page.getByLabel("Open menu");
    await hamburger.click();

    // Mobile nav should appear
    const mobileNav = page.getByLabel("Mobile navigation");
    await expect(mobileNav).toBeVisible();

    // Mobile nav should contain links
    await expect(mobileNav.getByText("Bookmarks")).toBeVisible();
    await expect(mobileNav.getByText("Settings")).toBeVisible();
  });

  test("mobile edition links work in hamburger menu", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const hamburger = page.getByLabel("Open menu");
    await hamburger.click();

    // Edition navigation stays link-based inside the mobile menu.
    const mobileNav = page.getByLabel("Mobile navigation");
    const eveningLink = mobileNav.getByRole("link", {
      name: "Evening",
      exact: true,
    });
    await expect(eveningLink).toBeVisible();

    await eveningLink.click();

    // Menu should close after tab click
    await expect(mobileNav).toBeHidden({ timeout: 3000 });
  });

  test("main content is single column on mobile", async ({ page }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const main = page.locator("main");
    const mainBox = await main.boundingBox();
    const sectionNames = await page
      .locator(
        'main section[aria-label], main aside[aria-label="Daily widgets"]',
      )
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-label")),
      );

    // Assert
    expect(mainBox?.width).toBe(375);
    expect(sectionNames).toEqual(EXPECTED_EDITORIAL_SECTION_ORDER);
    await expect(page.locator('[data-layout="video-rail"]')).toHaveCSS(
      "overflow-x",
      "auto",
    );
  });
});

test.describe("Responsive Layout — Tablet (768px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("shows desktop header navigation on tablet", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    // Desktop edition links use a navigation landmark.
    const editionNavigation = page
      .getByRole("navigation", { name: "Edition selector" })
      .first();
    await expect(editionNavigation).toBeVisible();

    // Hamburger should be hidden
    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeHidden();
  });

  test("source sections span the reading width and stack in editorial order", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const githubBand = page.getByRole("region", {
      name: "GitHub Trending",
    });
    const hatenaBand = page.getByRole("region", { name: "Hatena Bookmark" });
    const youtubeRail = page.locator('[data-layout="video-rail"]');
    const githubBox = await githubBand.boundingBox();
    const hatenaBox = await hatenaBand.boundingBox();
    const githubColumns = await githubBand
      .locator("div.grid")
      .first()
      .evaluate((grid) =>
        getComputedStyle(grid).gridTemplateColumns.split(" "),
      );
    const youtubeColumns = await youtubeRail.evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" "),
    );
    const sectionNames = await page
      .locator(
        'main section[aria-label], main aside[aria-label="Daily widgets"]',
      )
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-label")),
      );

    // Assert
    expect(sectionNames).toEqual(EXPECTED_EDITORIAL_SECTION_ORDER);
    expect(githubBox).not.toBeNull();
    expect(hatenaBox).not.toBeNull();
    expect(githubBox?.width).toBeGreaterThanOrEqual(700);
    expect(hatenaBox?.width).toBeGreaterThanOrEqual(700);
    expect(hatenaBox?.y).toBeGreaterThanOrEqual(
      (githubBox?.y ?? 0) + (githubBox?.height ?? 0),
    );
    expect(githubColumns).toHaveLength(3);
    expect(youtubeColumns).toHaveLength(3);
  });
});

test.describe("Responsive Layout — Desktop (1280px)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("shows full desktop navigation", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    // Edition navigation is visible.
    const editionNavigation = page
      .getByRole("navigation", { name: "Edition selector" })
      .first();
    await expect(editionNavigation).toBeVisible();

    // Bookmarks and Settings icon buttons visible
    await expect(page.getByLabel("Bookmarks").first()).toBeVisible();
    await expect(page.getByLabel("Settings").first()).toBeVisible();

    // Login button visible (not authenticated)
    await expect(
      page.locator("header").getByText("Login").first(),
    ).toBeVisible();
  });

  test("hamburger menu is hidden on desktop", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeHidden();
  });

  test("editorial bands keep independent full-width layouts", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const editorialFlow = page.locator('[data-layout="editorial-flow"]');
    const githubBand = editorialFlow.getByRole("region", {
      name: "GitHub Trending",
    });
    const hatenaBand = editorialFlow.getByRole("region", {
      name: "Hatena Bookmark",
    });
    const githubBox = await githubBand.boundingBox();
    const hatenaBox = await hatenaBand.boundingBox();

    // Assert
    await expect(editorialFlow).toBeVisible();
    await expect(githubBand).toHaveAttribute("data-layout", "editorial-band");
    await expect(hatenaBand).toHaveAttribute("data-layout", "editorial-band");
    expect(githubBox?.width).toBeGreaterThanOrEqual(1160);
    expect(hatenaBox?.width).toBeGreaterThanOrEqual(1160);
    expect(hatenaBox?.y).toBeGreaterThanOrEqual(
      (githubBox?.y ?? 0) + (githubBox?.height ?? 0),
    );
  });

  test("featured Hacker News and GitHub cards explain their larger footprint", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const featuredStory = page.getByRole("region", {
      name: "Featured story",
    });
    const githubBand = page.getByRole("region", {
      name: "GitHub Trending",
    });
    const githubImages = githubBand.locator(
      '[data-article-variant="media-three-column"] img',
    );

    // Assert
    await expect(featuredStory.locator("[data-article-summary]")).toHaveText(
      "Featured Hacker News discussion submitted by current. The community has added 41 comments so far.",
    );
    await expect(
      githubBand.locator("[data-article-summary]").first(),
    ).toHaveText(
      "A focused TypeScript toolkit for assembling fast developer briefings.",
    );
    await expect(githubImages).toHaveCount(3);
    await expect(githubImages.nth(0)).toHaveAttribute("loading", "eager");
    await expect(githubImages.nth(1)).toHaveAttribute("loading", "lazy");
    await expect(githubImages.nth(2)).toHaveAttribute("loading", "lazy");
  });

  test("keeps one editorial order while source-specific compositions absorb five stories", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const sectionNames = await page
      .locator(
        'main section[aria-label], main aside[aria-label="Daily widgets"]',
      )
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-label")),
      );
    const githubBand = page.getByRole("region", { name: "GitHub Trending" });
    const hatenaBand = page.getByRole("region", { name: "Hatena Bookmark" });

    // Assert
    expect(sectionNames.slice(0, 4)).toEqual([
      "Featured story",
      "GitHub Trending",
      "Daily widgets",
      "Supporting headlines",
    ]);
    const headlineUrls = await page
      .locator("[data-article-headline]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(new Set(headlineUrls).size).toBe(headlineUrls.length);
    await expect(
      githubBand.locator('[data-article-variant="media-three-column"]'),
    ).toHaveCount(3);
    await expect(
      githubBand.locator('[data-article-variant="compact"]'),
    ).toHaveCount(2);
    await expect(
      hatenaBand.locator('[data-article-variant="media-two-column"]'),
    ).toHaveCount(2);
    await expect(
      hatenaBand.locator('[data-article-variant="compact"]'),
    ).toHaveCount(3);
  });
});

test.describe("Responsive Layout — Wide (1440px+)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("content is constrained to max-width", async ({ page }) => {
    // Arrange
    await page.goto("/");
    await waitForPageReady(page);

    // Act
    const main = page.locator("main");
    const mainBox = await main.boundingBox();

    // Assert
    expect(mainBox?.width).toBe(1240);
  });
});

test.describe("Touch Target Compliance", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile hamburger button meets 44x44px minimum", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const hamburger = page.getByLabel(/open menu/i);
    const box = await hamburger.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("mobile nav links meet 44px height minimum", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);

    const hamburger = page.getByLabel("Open menu");
    await hamburger.click();

    const mobileNav = page.getByLabel("Mobile navigation");
    await expect(mobileNav).toBeVisible();

    // Check bookmarks link height
    const bookmarksLink = mobileNav.getByText("Bookmarks");
    const box = await bookmarksLink.boundingBox();

    expect(box).toBeTruthy();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
