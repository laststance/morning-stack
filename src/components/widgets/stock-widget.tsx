import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UnavailableWidgetState } from "@/components/widgets/unavailable-widget-state";
import { cn } from "@/lib/utils";
import type { StockData } from "@/lib/sources/stocks";

export interface StockWidgetProps {
  /** Array of stock index data. Empty array renders the unavailable state. */
  data: StockData[];
}

/**
 * Format a number as a locale-appropriate price string.
 *
 * JPY indices (Nikkei) use no decimals; USD indices show 2 decimals.
 */
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(price);
}

/**
 * Format the change percentage with a sign prefix and fixed 2 decimal places.
 */
function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Compact stock market widget listing major indices with price and change.
 *
 * Positive changes render green, negative render red, and zero renders
 * the muted text color. Uses shadcn/ui Card for consistent styling.
 */
export function StockWidget({ data }: StockWidgetProps) {
  if (data.length === 0) {
    return (
      <UnavailableWidgetState
        title="Markets unavailable"
        detail="No market snapshot for this edition."
      />
    );
  }

  return (
    <Card className="glass-panel border-ms-glass-border rounded-md">
      <CardHeader className="pt-3 pb-0">
        <CardTitle className="text-ms-text-muted font-mono text-[10px] font-medium uppercase">
          Markets
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <ul className="divide-ms-border divide-y" role="list">
          {data.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * A single stock index row within the widget.
 */
function StockRow({ stock }: { stock: StockData }) {
  const isPositive = stock.changePercent > 0;
  const isNegative = stock.changePercent < 0;

  return (
    <li className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <span className="text-ms-text-primary truncate text-sm font-medium">
        {stock.name}
      </span>

      <div className="flex shrink-0 flex-col items-end">
        <span className="text-ms-text-primary font-mono text-sm tabular-nums">
          {formatPrice(stock.price, stock.currency)}
        </span>
        <span
          className={cn(
            "font-mono text-xs font-medium tabular-nums",
            isPositive && "text-ms-positive",
            isNegative && "text-ms-negative",
            !isPositive && !isNegative && "text-ms-text-muted",
          )}
        >
          {isPositive ? "▲ " : isNegative ? "▼ " : ""}
          {formatChangePercent(stock.changePercent)}
        </span>
      </div>
    </li>
  );
}

/**
 * Skeleton placeholder for the stock widget shown during Suspense loading.
 */
export function StockWidgetSkeleton() {
  return (
    <Card className="border-ms-border bg-ms-bg-secondary">
      <CardHeader className="pt-4 pb-0">
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
