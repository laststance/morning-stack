import { Suspense } from "react";
import { StockTicker } from "@/components/layout/stock-ticker";
import { cacheGet } from "@/lib/cache";
import type { StockData } from "@/lib/sources/stocks";

/** Sample data used when Redis is unavailable (local development). */
const DEV_FALLBACK_STOCKS: StockData[] = [
  { symbol: "^N225", name: "Nikkei 225", price: 39_142.23, changeAmount: 284.56, changePercent: 0.73, currency: "JPY" },
  { symbol: "^GSPC", name: "S&P 500", price: 6_025.99, changeAmount: -18.42, changePercent: -0.31, currency: "USD" },
  { symbol: "^IXIC", name: "NASDAQ", price: 19_654.02, changeAmount: 127.88, changePercent: 0.65, currency: "USD" },
];

/**
 * Fetch stock data from the Redis cache for the ticker.
 *
 * Uses the same cache key as the stock widget.
 * Falls back to sample data in development when Redis is unavailable.
 */
async function getTickerStocks(): Promise<StockData[]> {
  try {
    const cached = await cacheGet<StockData[]>("source:stocks");
    if (cached) return cached;
  } catch {
    // Redis unavailable — fall through to fallback
  }
  return process.env.NODE_ENV === "development" ? DEV_FALLBACK_STOCKS : [];
}

/**
 * Async Server Component that renders the stock ticker from cached data.
 */
async function TickerContent() {
  const stocks = await getTickerStocks();
  return <StockTicker data={stocks} />;
}

/**
 * Suspense wrapper for the stock ticker.
 *
 * Renders nothing during loading (the ticker is supplementary,
 * not essential for page structure).
 */
export function TickerWrapper() {
  return (
    <Suspense fallback={null}>
      <TickerContent />
    </Suspense>
  );
}
