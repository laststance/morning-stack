import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherData } from "@/lib/sources/weather";

export interface WeatherWidgetProps {
  /** Weather data to display. `null` renders the unavailable state. */
  data: WeatherData | null;
}

/**
 * Compact weather widget displaying current conditions and 3-day forecast.
 *
 * Shows emoji weather icon, temperature, humidity, wind speed,
 * city name, and a 3-day daily forecast row.
 *
 * @param data - Weather data from Open-Meteo, or null for unavailable state.
 * @example
 * <WeatherWidget data={weatherData} />
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

  return (
    <Card className="glass-panel rounded-md border-ms-glass-border">
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-ms-text-muted">
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* Current conditions */}
        <div className="flex items-center gap-3">
          <span className="-ml-1 shrink-0 text-4xl" role="img" aria-label={data.condition}>
            {data.iconCode}
          </span>

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

        {/* Humidity & Wind */}
        <div className="flex gap-4 text-xs text-ms-text-muted">
          <span className="flex items-center gap-1">
            <span role="img" aria-label="humidity">💧</span>
            {data.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <span role="img" aria-label="wind">💨</span>
            {data.windSpeed} km/h
          </span>
        </div>

        {/* 3-day forecast */}
        {data.forecast.length > 0 && (
          <div className="grid grid-cols-3 gap-2 border-t border-ms-glass-border pt-3">
            {data.forecast.map((day) => {
              const label = formatDayLabel(day.date);
              return (
                <div key={day.date} className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-mono uppercase text-ms-text-muted">
                    {label}
                  </span>
                  <span className="text-lg" role="img" aria-label={day.condition}>
                    {day.icon}
                  </span>
                  <div className="flex gap-1 text-[10px] font-mono tabular-nums">
                    <span className="text-ms-text-primary">{day.tempMax}°</span>
                    <span className="text-ms-text-muted">{day.tempMin}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format a date string into a short day label (e.g. "Mon", "Tue").
 *
 * @param dateStr - ISO date string (e.g. "2026-03-24").
 * @returns Short weekday name in English.
 * @example
 * formatDayLabel("2026-03-24") // => "Tue"
 */
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
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
      <CardContent className="space-y-3 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-ms-glass-border pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
