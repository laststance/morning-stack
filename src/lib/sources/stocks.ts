import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Yahoo Finance Chart API types ──────────────────────────────────

/** Relevant metadata from a single Yahoo Finance chart result. */
interface YFChartMeta {
  currency?: string;
  symbol: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  longName?: string;
  shortName?: string;
}

/** Shape of the Yahoo Finance v8 chart response for one index. */
interface YFChartResponse {
  chart: {
    result: Array<{
      meta: YFChartMeta;
      indicators: {
        quote: Array<{
          close?: Array<number | null>;
        }>;
      };
    }> | null;
    error: null | {
      code?: string;
      description?: string;
    };
  };
}

// ─── Public types ───────────────────────────────────────────────────

/**
 * Normalized stock index data for the stock market widget.
 *
 * Each entry represents a single market index with its current
 * price and change metrics.
 */
export interface StockData {
  /** Ticker symbol (e.g. "^N225", "^GSPC", "^IXIC"). */
  symbol: string;
  /** Human-readable index name (e.g. "Nikkei 225"). */
  name: string;
  /** Current index price. */
  price: number;
  /** Absolute change from previous close. */
  changeAmount: number;
  /** Percentage change from previous close. */
  changePercent: number;
  /** Currency of the index (e.g. "JPY", "USD"). */
  currency: string;
}

/** Controls external cache use for production calls and isolated tests. */
export interface StockFetchOptions {
  /** Read/write Redis cache and use stale-cache fallback when true. */
  useCache?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Yahoo Finance v8 public chart endpoint.
 *
 * The quote endpoint now returns 401 for unauthenticated requests in many
 * environments, while the chart endpoint still returns public index metadata.
 */
const YF_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const CACHE_KEY = "source:stocks";

/** Target indices: Nikkei 225, S&P 500, NASDAQ Composite. */
const INDEX_SYMBOLS = ["^N225", "^GSPC", "^IXIC"] as const;

/** Friendly display names for each symbol. */
const SYMBOL_NAMES: Record<string, string> = {
  "^N225": "Nikkei 225",
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
};

/** Cache TTL during market hours: 15 minutes in seconds. */
const CACHE_TTL_MARKET_OPEN = 15 * 60;

/** Cache TTL when all markets are closed: 6 hours in seconds. */
const CACHE_TTL_MARKET_CLOSED = 6 * 60 * 60;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Fetch current stock index data for Nikkei 225, S&P 500, and NASDAQ.
 *
 * 1. Returns cached data if available.
 * 2. On cache miss, fetches from Yahoo Finance chart API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * Cache TTL is market-hours-aware:
 * - 15 minutes when JPX (Nikkei) or NYSE/NASDAQ is open.
 * - 6 hours when all markets are closed.
 *
 * @param options - Cache policy for callers that must isolate external state.
 * @returns Array of {@link StockData}, or empty array if unavailable.
 * @throws Never — returns `[]` as a last resort.
 * @example
 * await fetchStockData({ useCache: false });
 */
export async function fetchStockData(
  options: StockFetchOptions = {},
): Promise<StockData[]> {
  const { useCache = true } = options;

  // 1. Try cache first
  if (useCache) {
    const cached = await cacheGet<StockData[]>(CACHE_KEY);
    if (cached) return cached;
  }

  try {
    const stockResults = await Promise.allSettled(
      INDEX_SYMBOLS.map(fetchIndexChart),
    );
    const stocks = collectFulfilledStocks(stockResults);

    if (stocks.length === 0) {
      throw new Error("Yahoo Finance chart API returned no stock snapshots");
    }

    const ttl = getMarketAwareTTL();

    // Cache failures should not hide fresh market data.
    if (useCache) {
      void cacheSet(CACHE_KEY, stocks, ttl).catch((error: unknown) => {
        console.error("[Stocks] Cache write failed:", error);
      });
    }

    return stocks;
  } catch (error) {
    console.error("[Stocks] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case a prior request populated it
    if (useCache) {
      const stale = await cacheGet<StockData[]>(CACHE_KEY);
      if (stale) return stale;
    }

    return [];
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Keep successful index snapshots even when another Yahoo symbol fails.
 * @param results - Per-symbol chart fetch results in INDEX_SYMBOLS order.
 * @returns Successfully mapped stock snapshots.
 * @example
 * collectFulfilledStocks(results);
 */
function collectFulfilledStocks(
  results: PromiseSettledResult<StockData | null>[],
): StockData[] {
  const stocks: StockData[] = [];

  for (const [symbolIndex, result] of results.entries()) {
    if (result.status === "fulfilled") {
      if (result.value) stocks.push(result.value);
      continue;
    }

    // A single index should not hide the other market snapshots.
    console.error(
      `[Stocks] ${INDEX_SYMBOLS[symbolIndex]} chart fetch failed:`,
      result.reason,
    );
  }

  return stocks;
}

/**
 * Fetch one index through Yahoo Finance chart metadata.
 * @param symbol - Yahoo Finance index symbol.
 * @returns Normalized stock data, or null when the index cannot be mapped.
 * @example
 * await fetchIndexChart("^GSPC");
 */
async function fetchIndexChart(
  symbol: (typeof INDEX_SYMBOLS)[number],
): Promise<StockData | null> {
  const url = `${YF_CHART_URL}/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MorningStack/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance chart API responded with ${res.status}`);
  }

  const data: YFChartResponse = await res.json();

  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance chart API error: ${JSON.stringify(data.chart.error)}`,
    );
  }

  const result = data.chart.result?.[0];
  if (!result) return null;

  return mapChartToStockData(symbol, result.meta, result.indicators.quote[0]);
}

/**
 * Map Yahoo Finance chart metadata to the normalized {@link StockData} shape.
 * @param symbol - Requested Yahoo Finance index symbol.
 * @param meta - Chart metadata containing current and previous close prices.
 * @param quote - Quote arrays used as a fallback when metadata is incomplete.
 * @returns Normalized stock data for one index.
 * @example
 * mapChartToStockData("^GSPC", meta, quote);
 */
function mapChartToStockData(
  symbol: (typeof INDEX_SYMBOLS)[number],
  meta: YFChartMeta,
  quote?: { close?: Array<number | null> },
): StockData {
  const price = meta.regularMarketPrice ?? getLatestClose(quote?.close) ?? 0;
  const previousClose =
    meta.chartPreviousClose ?? getPreviousClose(quote?.close) ?? price;
  const changeAmount = price - previousClose;
  const changePercent =
    previousClose === 0 ? 0 : (changeAmount / previousClose) * 100;

  return {
    symbol,
    name: SYMBOL_NAMES[symbol] ?? meta.shortName ?? meta.longName ?? symbol,
    price: roundTo2(price),
    changeAmount: roundTo2(changeAmount),
    changePercent: roundTo2(changePercent),
    currency: meta.currency ?? "USD",
  };
}

/**
 * Return the latest numeric close from a Yahoo chart close array.
 * @param closes - Close values from the chart API.
 * @returns Latest valid close, or undefined when none exists.
 * @example
 * getLatestClose([100, null, 101]);
 */
function getLatestClose(closes?: Array<number | null>): number | undefined {
  if (!closes) return undefined;

  for (let index = closes.length - 1; index >= 0; index -= 1) {
    const close = closes[index];
    if (typeof close === "number") return close;
  }

  return undefined;
}

/**
 * Return the close immediately before the latest valid close.
 * @param closes - Close values from the chart API.
 * @returns Previous valid close, or undefined when none exists.
 * @example
 * getPreviousClose([100, 101]);
 */
function getPreviousClose(closes?: Array<number | null>): number | undefined {
  const validCloses = closes?.filter(
    (close): close is number => typeof close === "number",
  );

  if (!validCloses || validCloses.length < 2) return undefined;

  return validCloses[validCloses.length - 2];
}

/**
 * Determine cache TTL based on whether any covered market is currently open.
 *
 * - **JPX (Nikkei 225):** Mon–Fri 09:00–15:00 JST (UTC+9)
 * - **NYSE / NASDAQ (S&P 500, NASDAQ):** Mon–Fri 09:30–16:00 ET (UTC−5 / UTC−4 DST)
 *
 * Returns 15-minute TTL if any market is open, 6-hour TTL otherwise.
 */
function getMarketAwareTTL(): number {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTotalMinutes = utcHours * 60 + utcMinutes;

  // Weekend — all markets closed
  if (utcDay === 0 || utcDay === 6) return CACHE_TTL_MARKET_CLOSED;

  // JPX: 09:00–15:00 JST → 00:00–06:00 UTC
  const jpxOpen = 0 * 60; // 00:00 UTC
  const jpxClose = 6 * 60; // 06:00 UTC
  if (utcTotalMinutes >= jpxOpen && utcTotalMinutes < jpxClose) {
    return CACHE_TTL_MARKET_OPEN;
  }

  // NYSE/NASDAQ: 09:30–16:00 ET
  // EST (UTC-5): 14:30–21:00 UTC
  // EDT (UTC-4): 13:30–20:00 UTC
  // Use broader window to cover both DST and standard time
  const usMarketOpenEarliest = 13 * 60 + 30; // 13:30 UTC (EDT open)
  const usMarketCloseLatest = 21 * 60; // 21:00 UTC (EST close)
  if (
    utcTotalMinutes >= usMarketOpenEarliest &&
    utcTotalMinutes < usMarketCloseLatest
  ) {
    return CACHE_TTL_MARKET_OPEN;
  }

  return CACHE_TTL_MARKET_CLOSED;
}

/**
 * Round a number to 2 decimal places.
 * @param n - Number to round.
 * @returns Number rounded to two decimal places.
 * @example
 * roundTo2(1.234);
 */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
