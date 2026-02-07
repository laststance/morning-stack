import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherData } from "@/lib/sources/weather";

export interface WeatherWidgetProps {
  /** Weather data to display. `null` renders the unavailable state. */
  data: WeatherData | null;
}

/**
 * Compact weather widget displaying current conditions for a city.
 *
 * Shows the OWM weather icon, temperature in Celsius, city name,
 * and a condition label. Uses shadcn/ui Card for consistent styling.
 */
export function WeatherWidget({ data }: WeatherWidgetProps) {
  if (!data) {
    return (
      <Card className="glass-panel rounded-md border-ms-glass-border">
        <CardContent className="py-4">
          <p className="text-center text-sm text-ms-text-muted">
            Weather data unavailable
          </p>
        </CardContent>
      </Card>
    );
  }

  const iconUrl = `https://openweathermap.org/img/wn/${data.iconCode}@2x.png`;

  return (
    <Card className="glass-panel rounded-md border-ms-glass-border">
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-ms-text-muted">
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-3">
          {/* OWM weather icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconUrl}
            alt={data.condition}
            width={56}
            height={56}
            className="-ml-2 shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-semibold tabular-nums text-ms-text-primary">
                {data.temperatureCelsius}°
              </span>
              <span className="text-sm text-ms-text-muted">C</span>
            </div>
            <p className="truncate text-sm text-ms-text-secondary">
              {data.condition}
            </p>
            <p className="truncate text-xs text-ms-text-muted">{data.city}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton placeholder for the weather widget shown during Suspense loading.
 */
export function WeatherWidgetSkeleton() {
  return (
    <Card className="glass-panel rounded-md border-ms-glass-border">
      <CardHeader className="pb-0 pt-4">
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
