import { desc } from "drizzle-orm";

import { cacheGet, cacheSet } from "@/lib/cache";
import { db, isRuntimeDatabaseConfigured } from "@/lib/db";
import { stockCache, weatherCache } from "@/lib/db/schema";
import type { StockData } from "@/lib/sources/stocks";
import type { WeatherData } from "@/lib/sources/weather";

/** Cached widget data shape shared by cron collection and home page rendering. */
export interface WidgetData {
  weather: WeatherData | null;
  stocks: StockData[];
}

/** Redis key used by the cron collector for latest edition widget data. */
export const WIDGET_CACHE_KEY = "edition:widgets";

/** Keep widget snapshots alive until the next twice-daily edition has time to publish. */
export const WIDGET_CACHE_TTL = 24 * 60 * 60;

/** Preferred stock display order for persisted cache reads. */
const STOCK_SYMBOL_ORDER = ["^N225", "^GSPC", "^IXIC"];

/**
 * Store widget snapshots in Redis and Supabase so widgets survive Redis misses.
 * @param widgetData - Weather and stocks fetched during cron or manual refresh.
 * @returns Resolves after best-effort persistence attempts finish.
 * @example
 * await saveWidgetSnapshots({ weather, stocks });
 */
export async function saveWidgetSnapshots(
  widgetData: WidgetData,
): Promise<void> {
  const tasks = [
    cacheSet(WIDGET_CACHE_KEY, widgetData, WIDGET_CACHE_TTL),
    saveWeatherSnapshot(widgetData.weather),
    saveStockSnapshots(widgetData.stocks),
  ];

  const results = await Promise.allSettled(tasks);

  // Widget data is nice-to-have; never fail the edition publish for cache writes.
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[Widgets] Snapshot persistence failed:", result.reason);
    }
  }
}

/**
 * Read widget data from Redis first, then fall back to the latest Supabase rows.
 * @returns Latest widget data, or empty unavailable values when no snapshot exists.
 * @example
 * const widgets = await getCachedOrPersistedWidgetData();
 */
export async function getCachedOrPersistedWidgetData(): Promise<WidgetData> {
  const cached = await cacheGet<WidgetData>(WIDGET_CACHE_KEY);
  if (cached) return cached;

  const persisted = await getPersistedWidgetSnapshots();

  // Repopulate Redis when possible so repeated page renders stay cheap.
  if (persisted.weather || persisted.stocks.length > 0) {
    void cacheSet(WIDGET_CACHE_KEY, persisted, WIDGET_CACHE_TTL);
  }

  return persisted;
}

/**
 * Store the latest weather snapshot in the existing Supabase cache table.
 * @param weather - Weather data from the source fetcher, or null on failure.
 * @returns Resolves when the row is inserted or when there is nothing to save.
 * @example
 * await saveWeatherSnapshot(weather);
 */
async function saveWeatherSnapshot(weather: WeatherData | null): Promise<void> {
  if (!isRuntimeDatabaseConfigured()) return;
  if (!weather) return;

  await db.insert(weatherCache).values({
    location: weather.city,
    data: weather,
    fetchedAt: new Date(),
  });
}

/**
 * Store one Supabase cache row for each stock index snapshot.
 * @param stocks - Stock index data from the source fetcher.
 * @returns Resolves when rows are inserted or when there is nothing to save.
 * @example
 * await saveStockSnapshots(stocks);
 */
async function saveStockSnapshots(stocks: StockData[]): Promise<void> {
  if (!isRuntimeDatabaseConfigured()) return;
  if (stocks.length === 0) return;

  await db.insert(stockCache).values(
    stocks.map((stock) => ({
      symbol: stock.symbol,
      data: stock,
      fetchedAt: new Date(),
    })),
  );
}

/**
 * Load the most recent weather row and most recent row per stock symbol.
 * @returns Widget data reconstructed from Supabase cache rows.
 * @example
 * const persisted = await getPersistedWidgetSnapshots();
 */
async function getPersistedWidgetSnapshots(): Promise<WidgetData> {
  if (!isRuntimeDatabaseConfigured()) {
    return { weather: null, stocks: [] };
  }

  try {
    const [weatherRows, stockRows] = await Promise.all([
      db
        .select({ data: weatherCache.data })
        .from(weatherCache)
        .orderBy(desc(weatherCache.fetchedAt))
        .limit(1),
      db
        .select({ symbol: stockCache.symbol, data: stockCache.data })
        .from(stockCache)
        .orderBy(desc(stockCache.fetchedAt))
        .limit(30),
    ]);

    const stocksBySymbol = new Map<string, StockData>();
    for (const row of stockRows) {
      // Rows are newest-first, so the first row per symbol is the latest snapshot.
      if (!stocksBySymbol.has(row.symbol)) {
        stocksBySymbol.set(row.symbol, row.data as StockData);
      }
    }

    return {
      weather: (weatherRows[0]?.data as WeatherData | undefined) ?? null,
      stocks: sortStocks(Array.from(stocksBySymbol.values())),
    };
  } catch (error) {
    console.error("[Widgets] Failed to load persisted snapshots:", error);
    return { weather: null, stocks: [] };
  }
}

/**
 * Sort stock snapshots into the expected widget display order.
 * @param stocks - Unordered stock snapshots loaded from persistence.
 * @returns Stocks ordered by Nikkei, S&P 500, then NASDAQ.
 * @example
 * sortStocks(stocks);
 */
function sortStocks(stocks: StockData[]): StockData[] {
  return stocks.toSorted((a, b) => {
    const aIndex = STOCK_SYMBOL_ORDER.indexOf(a.symbol);
    const bIndex = STOCK_SYMBOL_ORDER.indexOf(b.symbol);
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

    return normalizedA - normalizedB;
  });
}
