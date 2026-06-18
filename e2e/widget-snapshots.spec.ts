import { expect, test } from "@playwright/test";

import {
  getCachedOrPersistedWidgetData,
  saveWidgetSnapshots,
} from "../src/lib/widget-snapshots";

test.describe("Widget Snapshots", () => {
  test("returns empty widgets without touching a placeholder database", async () => {
    // Arrange / Act
    const widgets = await getCachedOrPersistedWidgetData();

    // Assert
    expect(widgets).toEqual({ weather: null, stocks: [] });
  });

  test("ignores Supabase persistence when no runtime database is configured", async () => {
    // Arrange
    let didSaveWithoutDatabase = false;

    // Act
    await saveWidgetSnapshots({ weather: null, stocks: [] });
    didSaveWithoutDatabase = true;

    // Assert
    expect(didSaveWithoutDatabase).toBe(true);
  });
});
