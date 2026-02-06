import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Yahoo Finance API types ────────────────────────────────────────

/** Relevant fields from a single Yahoo Finance quote result. */
interface YFQuoteResult {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

/** Shape of the Yahoo Finance v8 quote response. */
interface YFQuoteResponse {
  quoteResponse: {
    result: YFQuoteResult[];
    error: unknown;
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

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Yahoo Finance v8 public quote endpoint.
 *
 * Accepts a comma-separated `symbols` parameter and returns batch
 * quote data without requiring an API key.
 */
const YF_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

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
 * 2. On cache miss, fetches from Yahoo Finance API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * Cache TTL is market-hours-aware:
 * - 15 minutes when JPX (Nikkei) or NYSE/NASDAQ is open.
 * - 6 hours when all markets are closed.
 *
 * @returns Array of {@link StockData}, or empty array if unavailable.
 * @throws Never — returns `[]` as a last resort.
 */
export async function fetchStockData(): Promise<StockData[]> {
  // 1. Try cache first
  const cached = await cacheGet<StockData[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from Yahoo Finance
  try {
    const symbols = INDEX_SYMBOLS.join(",");
    const url = `${YF_QUOTE_URL}?symbols=${symbols}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MorningStack/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API responded with ${res.status}`);
    }

    const data: YFQuoteResponse = await res.json();

    if (data.quoteResponse.error) {
      throw new Error(
        `Yahoo Finance API error: ${JSON.stringify(data.quoteResponse.error)}`,
      );
    }

    const stocks = data.quoteResponse.result.map(mapQuoteToStockData);
    const ttl = getMarketAwareTTL();

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, stocks, ttl);

    return stocks;
  } catch (error) {
    console.error("[Stocks] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case a prior request populated it
    const stale = await cacheGet<StockData[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Map a Yahoo Finance quote result to the normalized {@link StockData} shape.
 */
function mapQuoteToStockData(quote: YFQuoteResult): StockData {
  return {
    symbol: quote.symbol,
    name: SYMBOL_NAMES[quote.symbol] ?? quote.shortName ?? quote.symbol,
    price: quote.regularMarketPrice ?? 0,
    changeAmount: roundTo2(quote.regularMarketChange ?? 0),
    changePercent: roundTo2(quote.regularMarketChangePercent ?? 0),
    currency: quote.currency ?? "USD",
  };
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
 */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
