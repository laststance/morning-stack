/**
 * Seed Redis cache with sample stock data for local development.
 *
 * Usage: npx tsx scripts/seed-stocks.ts
 *
 * Populates the "source:stocks" cache key with mock data for
 * Nikkei 225, S&P 500, and NASDAQ so the stock ticker and widget
 * render in development without hitting the Yahoo Finance API.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Redis } from "@upstash/redis";

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

// Initialize AFTER env vars are loaded
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const sampleStocks = [
  {
    symbol: "^N225",
    name: "Nikkei 225",
    price: 39_142.23,
    changeAmount: 284.56,
    changePercent: 0.73,
    currency: "JPY",
  },
  {
    symbol: "^GSPC",
    name: "S&P 500",
    price: 6_025.99,
    changeAmount: -18.42,
    changePercent: -0.31,
    currency: "USD",
  },
  {
    symbol: "^IXIC",
    name: "NASDAQ",
    price: 19_654.02,
    changeAmount: 127.88,
    changePercent: 0.65,
    currency: "USD",
  },
];

const sampleWeather = {
  city: "Tokyo",
  temperatureCelsius: 8,
  condition: "Partly Cloudy",
  iconCode: "02d",
};

async function main() {
  const TTL = 6 * 60 * 60; // 6 hours

  await Promise.all([
    redis.set("source:stocks", sampleStocks, { ex: TTL }),
    redis.set("widget:data", { weather: sampleWeather, stocks: sampleStocks }, { ex: TTL }),
  ]);

  console.log("✅ Seeded Redis with sample stock and weather data");
  console.log("   Stocks:", sampleStocks.map((s) => `${s.name} ${s.price}`).join(", "));
  console.log("   Weather:", `${sampleWeather.city} ${sampleWeather.temperatureCelsius}°C ${sampleWeather.condition}`);
  console.log(`   TTL: ${TTL / 3600} hours`);
}

main().catch((err) => {
  console.error("❌ Failed to seed Redis:", err);
  process.exit(1);
});
