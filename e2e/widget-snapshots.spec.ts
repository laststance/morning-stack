import { expect, test } from "@playwright/test";

import {
  getCachedOrPersistedWidgetData,
  saveWidgetSnapshots,
} from "../src/lib/widget-snapshots";

test.describe("Widget Snapshots", () => {
  test("returns empty widgets when external reads are disabled", async () => {
    // Arrange
    const externalReadsDisabled = { useCache: false, useDatabase: false };

    // Act
    const widgets = await getCachedOrPersistedWidgetData({
      ...externalReadsDisabled,
    });

    // Assert
    expect(widgets).toEqual({ weather: null, stocks: [] });
  });

  test("completes when external writes are disabled", async () => {
    // Arrange
    const externalWritesDisabled = { useCache: false, useDatabase: false };

    // Act
    const saveResult = saveWidgetSnapshots(
      { weather: null, stocks: [] },
      { ...externalWritesDisabled },
    );

    // Assert
    await expect(saveResult).resolves.toBeUndefined();
  });
});
