import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UnavailableWidgetState } from "@/components/widgets/unavailable-widget-state";
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
      <UnavailableWidgetState
        title="Weather unavailable"
        detail="No weather snapshot for this edition."
      />
    );
  }

  return (
    <Card className="glass-panel border-ms-glass-border rounded-md">
      <CardHeader className="pt-4 pb-0">
        <CardTitle className="text-ms-text-muted font-mono text-[10px] font-medium uppercase">
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* Current conditions */}
        <div className="flex items-center gap-3">
          <span
            className="-ml-1 shrink-0 text-4xl"
            role="img"
            aria-label={data.condition}
          >
            {data.iconCode}
          </span>

          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-ms-text-primary font-mono text-3xl font-semibold tabular-nums">
                {data.temperatureCelsius}°
              </span>
              <span className="text-ms-text-muted text-sm">C</span>
            </div>
            <p className="text-ms-text-secondary truncate text-sm">
              {data.condition}
            </p>
            <p className="text-ms-text-muted truncate text-xs">{data.city}</p>
          </div>
        </div>

        {/* Humidity & Wind */}
        <div className="text-ms-text-muted flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span role="img" aria-label="humidity">
              💧
            </span>
            {data.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <span role="img" aria-label="wind">
              💨
            </span>
            {data.windSpeed} km/h
          </span>
        </div>

        {/* 3-day forecast */}
        {data.forecast.length > 0 && (
          <div className="border-ms-glass-border grid grid-cols-3 gap-2 border-t pt-3">
            {data.forecast.map((day) => {
              const label = formatDayLabel(day.date);
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="text-ms-text-muted font-mono text-[10px] uppercase">
                    {label}
                  </span>
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={day.condition}
                  >
                    {day.icon}
                  </span>
                  <div className="flex gap-1 font-mono text-[10px] tabular-nums">
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
    <Card className="glass-panel border-ms-glass-border rounded-md">
      <CardHeader className="pt-4 pb-0">
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
        <div className="border-ms-glass-border grid grid-cols-3 gap-2 border-t pt-3">
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
