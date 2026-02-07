import { cn } from "@/lib/utils";
import type { StockData } from "@/lib/sources/stocks";

export interface StockTickerProps {
  /** Stock data to display in the scrolling ticker. */
  data: StockData[];
}

/**
 * Format a number as a locale-appropriate price string.
 *
 * @param price - The numerical price value
 * @param currency - Currency code (e.g. "JPY", "USD")
 * @returns Formatted price string with appropriate decimal places
 * @example
 * formatPrice(38542, "JPY")  // => "38,542"
 * formatPrice(5021.45, "USD") // => "5,021.45"
 */
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(price);
}

/**
 * Horizontal scrolling stock ticker bar.
 *
 * Uses pure CSS animation to create an infinite marquee effect.
 * The content is duplicated to allow seamless wrapping. Renders
 * each stock with symbol, price, and colored change percentage.
 *
 * @param data - Array of stock data to display
 */
export function StockTicker({ data }: StockTickerProps) {
  if (data.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden border-b border-ms-glass-border bg-ms-bg-primary/90"
      aria-label="Stock ticker"
      role="marquee"
    >
      <div className="animate-ticker flex whitespace-nowrap">
        {/* Render twice for seamless loop */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-6 px-4 py-1.5">
            {data.map((stock) => (
              <TickerItem key={`${copy}-${stock.symbol}`} stock={stock} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A single stock entry in the ticker strip.
 */
function TickerItem({ stock }: { stock: StockData }) {
  const isPositive = stock.changePercent > 0;
  const isNegative = stock.changePercent < 0;
  const sign = isPositive ? "+" : "";
  const arrow = isPositive ? "▲" : isNegative ? "▼" : "";

  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
      <span className="font-medium text-ms-text-secondary">{stock.name}</span>
      <span className="text-ms-text-primary">
        {formatPrice(stock.price, stock.currency)}
      </span>
      <span
        className={cn(
          "font-medium",
          isPositive && "text-ms-positive",
          isNegative && "text-ms-negative",
          !isPositive && !isNegative && "text-ms-text-muted",
        )}
      >
        {arrow} {sign}{stock.changePercent.toFixed(2)}%
      </span>
    </span>
  );
}
