import { cacheGet, cacheSet } from "@/lib/cache";

// ─── OpenWeatherMap API types ───────────────────────────────────────

/** Shape of a weather condition entry from the OWM API. */
interface OWMWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

/** Relevant subset of the OWM current-weather API response. */
interface OWMCurrentResponse {
  name: string;
  main: { temp: number };
  weather: OWMWeatherEntry[];
}

// ─── Public types ───────────────────────────────────────────────────

/**
 * Normalized weather data for the weather widget.
 *
 * Extracted from the OpenWeatherMap "current weather" API and cached
 * in both Upstash Redis and the `weather_cache` Drizzle table.
 */
export interface WeatherData {
  /** City name as returned by the API (e.g. "Tokyo"). */
  city: string;
  /** Temperature in degrees Celsius. */
  temperatureCelsius: number;
  /** Short weather condition label (e.g. "Clear", "Rain"). */
  condition: string;
  /**
   * OWM icon code (e.g. "01d", "10n").
   *
   * Render via `https://openweathermap.org/img/wn/{icon}@2x.png`.
   */
  iconCode: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

const CACHE_KEY = "source:weather";

/** Cache duration: 30 minutes in seconds. */
const CACHE_TTL = 30 * 60;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Fetch current weather data for a given city.
 *
 * 1. Returns cached data if available (30-minute TTL).
 * 2. On cache miss, fetches from the OpenWeatherMap API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * Requires the `OPENWEATHERMAP_API_KEY` environment variable. When the key
 * is missing (e.g. during `next build`), the function returns `null`
 * without throwing.
 *
 * @param city - City name to query (defaults to `"Tokyo"`).
 * @returns {@link WeatherData} or `null` if data is unavailable.
 * @throws Never — returns `null` as a last resort.
 */
export async function fetchWeather(
  city: string = "Tokyo",
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.warn("[Weather] OPENWEATHERMAP_API_KEY not set — skipping fetch");
    return null;
  }

  // 1. Try cache first
  const cached = await cacheGet<WeatherData>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from API
  try {
    const url = `${OWM_BASE_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`OWM API responded with ${res.status}`);
    }

    const data: OWMCurrentResponse = await res.json();
    const weather = mapResponseToWeatherData(data);

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, weather, CACHE_TTL);

    return weather;
  } catch (error) {
    console.error("[Weather] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case a prior request populated it
    const stale = await cacheGet<WeatherData>(CACHE_KEY);
    if (stale) return stale;

    return null;
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Map the raw OpenWeatherMap response to the normalized {@link WeatherData} shape.
 */
function mapResponseToWeatherData(data: OWMCurrentResponse): WeatherData {
  const primary = data.weather[0];
  return {
    city: data.name,
    temperatureCelsius: Math.round(data.main.temp),
    condition: primary?.main ?? "Unknown",
    iconCode: primary?.icon ?? "01d",
  };
}
