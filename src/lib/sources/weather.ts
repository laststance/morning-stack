import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Open-Meteo API types ───────────────────────────────────────────

/** Relevant subset of the Open-Meteo forecast API response. */
interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// ─── Public types ───────────────────────────────────────────────────

/** A single day's forecast entry. */
export interface ForecastDay {
  /** Date string in ISO format (e.g. "2026-03-24"). */
  date: string;
  /** Maximum temperature in °C. */
  tempMax: number;
  /** Minimum temperature in °C. */
  tempMin: number;
  /** Short weather condition label (e.g. "Clear", "Rain"). */
  condition: string;
  /** Emoji icon representing the weather condition. */
  icon: string;
}

/**
 * Normalized weather data for the weather widget.
 *
 * Fetched from the Open-Meteo forecast API (free, no API key required)
 * and cached in Upstash Redis with a 30-minute TTL.
 *
 * @example
 * {
 *   city: "Tokyo",
 *   temperatureCelsius: 18,
 *   condition: "Partly cloudy",
 *   iconCode: "⛅",
 *   humidity: 62,
 *   windSpeed: 12.5,
 *   forecast: [
 *     { date: "2026-03-24", tempMax: 20, tempMin: 12, condition: "Clear", icon: "☀️" },
 *   ],
 * }
 */
export interface WeatherData {
  /** City name (e.g. "Tokyo"). */
  city: string;
  /** Current temperature in degrees Celsius. */
  temperatureCelsius: number;
  /** Short weather condition label (e.g. "Clear", "Rain"). */
  condition: string;
  /** Emoji icon for the current weather condition. */
  iconCode: string;
  /** Relative humidity percentage (0–100). */
  humidity: number;
  /** Wind speed in km/h. */
  windSpeed: number;
  /** 3-day daily forecast. */
  forecast: ForecastDay[];
}

// ─── WMO Weather Code mapping ───────────────────────────────────────

/**
 * Maps a WMO weather interpretation code to a human-readable label and emoji icon.
 *
 * @param code - WMO weather code (0–99).
 * @param isDay - Whether it is currently daytime (affects sun/moon icon).
 * @returns Tuple of [condition label, emoji icon].
 * @example
 * wmoToCondition(0, true)   // => ["Clear sky", "☀️"]
 * wmoToCondition(61, true)  // => ["Light rain", "🌧️"]
 */
function wmoToCondition(code: number, isDay: boolean): [string, string] {
  const sunOrMoon = isDay ? "☀️" : "🌙";

  if (code === 0) return ["Clear sky", sunOrMoon];
  if (code <= 3) return ["Partly cloudy", isDay ? "⛅" : "☁️"];
  if (code <= 49) return ["Foggy", "🌫️"];
  if (code <= 59) return ["Drizzle", "🌦️"];
  if (code <= 65) return ["Rain", "🌧️"];
  if (code <= 69) return ["Freezing rain", "🌧️"];
  if (code <= 79) return ["Snow", "❄️"];
  if (code <= 84) return ["Rain showers", "🌦️"];
  if (code <= 89) return ["Snow showers", "🌨️"];
  if (code <= 99) return ["Thunderstorm", "⛈️"];

  return ["Unknown", "❓"];
}

// ─── Constants ──────────────────────────────────────────────────────

/** Open-Meteo forecast API base URL (free, no key). */
const API_BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** Tokyo coordinates. */
const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;

const CACHE_KEY = "source:weather";

/** Cache duration: 30 minutes in seconds. */
const CACHE_TTL = 30 * 60;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Fetch current weather + 3-day forecast for a given location.
 *
 * 1. Returns cached data if available (30-minute TTL).
 * 2. On cache miss, fetches from the Open-Meteo API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * No API key required — Open-Meteo is free and open-source.
 *
 * @param city - City display name (defaults to `"Tokyo"`).
 * @param lat - Latitude (defaults to Tokyo).
 * @param lon - Longitude (defaults to Tokyo).
 * @returns {@link WeatherData} or `null` if data is unavailable.
 * @example
 * const data = await fetchWeather();
 * // => { city: "Tokyo", temperatureCelsius: 18, humidity: 62, ... }
 */
export async function fetchWeather(
  city: string = "Tokyo",
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON,
): Promise<WeatherData | null> {
  // 1. Try cache first
  const cached = await cacheGet<WeatherData>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from Open-Meteo
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      forecast_days: "4",
      timezone: "Asia/Tokyo",
    });

    const res = await fetch(`${API_BASE_URL}?${params}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo API responded with ${res.status}`);
    }

    const data: OpenMeteoResponse = await res.json();
    const weather = mapResponseToWeatherData(data, city);

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
 * Map the raw Open-Meteo response to the normalized {@link WeatherData} shape.
 *
 * @param data - Raw API response.
 * @param city - City display name.
 * @returns Normalized weather data with current conditions and 3-day forecast.
 */
function mapResponseToWeatherData(
  data: OpenMeteoResponse,
  city: string,
): WeatherData {
  const { current, daily } = data;
  const isDay = current.is_day === 1;
  const [condition, icon] = wmoToCondition(current.weather_code, isDay);

  // Build 3-day forecast (skip today = index 0, take indices 1–3)
  const forecast: ForecastDay[] = daily.time.slice(1, 4).map((date, i) => {
    const idx = i + 1;
    const [dayCondition, dayIcon] = wmoToCondition(
      daily.weather_code[idx],
      true,
    );
    return {
      date,
      tempMax: Math.round(daily.temperature_2m_max[idx]),
      tempMin: Math.round(daily.temperature_2m_min[idx]),
      condition: dayCondition,
      icon: dayIcon,
    };
  });

  return {
    city,
    temperatureCelsius: Math.round(current.temperature_2m),
    condition,
    iconCode: icon,
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
    forecast,
  };
}
