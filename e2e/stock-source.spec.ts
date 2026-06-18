import { expect, test } from "@playwright/test";

import { fetchStockData } from "../src/lib/sources/stocks";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

test.describe("Stock Source", () => {
  test("normalizes Yahoo chart snapshots for the market widget", async () => {
    // Arrange
    const requestedSymbols: string[] = [];
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      const symbol = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      requestedSymbols.push(symbol);

      return new Response(JSON.stringify(buildYahooChartResponse(symbol)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    // Act
    const stocks = await fetchStockData({ useCache: false });

    // Assert
    expect(requestedSymbols).toEqual(["^N225", "^GSPC", "^IXIC"]);
    expect(stocks).toEqual([
      {
        symbol: "^N225",
        name: "Nikkei 225",
        price: 38600.5,
        changeAmount: 300.25,
        changePercent: 0.78,
        currency: "JPY",
      },
      {
        symbol: "^GSPC",
        name: "S&P 500",
        price: 6045.25,
        changeAmount: -24.75,
        changePercent: -0.41,
        currency: "USD",
      },
      {
        symbol: "^IXIC",
        name: "NASDAQ",
        price: 21111.46,
        changeAmount: 111.46,
        changePercent: 0.53,
        currency: "USD",
      },
    ]);
  });

  test("returns an empty market snapshot when Yahoo chart requests fail", async () => {
    // Arrange
    console.error = () => undefined;
    globalThis.fetch = async () =>
      new Response("Unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      });

    // Act
    const stocks = await fetchStockData({ useCache: false });

    // Assert
    expect(stocks).toEqual([]);
  });

  test("keeps successful market snapshots when one Yahoo symbol fails", async () => {
    // Arrange
    console.error = () => undefined;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      const symbol = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");

      if (symbol === "^IXIC") {
        return new Response("Unavailable", { status: 503 });
      }

      return new Response(JSON.stringify(buildYahooChartResponse(symbol)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    // Act
    const stocks = await fetchStockData({ useCache: false });

    // Assert
    expect(stocks.map((stock) => stock.symbol)).toEqual(["^N225", "^GSPC"]);
  });
});

/**
 * Builds symbol-specific Yahoo chart fixtures so fetchStockData exercises each branch.
 * @param symbol - Yahoo Finance symbol requested by the source fetcher.
 * @returns Minimal chart response shape used by the source mapper.
 * @example
 * buildYahooChartResponse("^GSPC");
 */
function buildYahooChartResponse(symbol: string) {
  if (symbol === "^N225") {
    return {
      chart: {
        result: [
          {
            meta: {
              currency: "JPY",
              symbol,
              regularMarketPrice: 38600.5,
              chartPreviousClose: 38300.25,
            },
            indicators: { quote: [{ close: [38300.25, 38600.5] }] },
          },
        ],
        error: null,
      },
    };
  }

  if (symbol === "^GSPC") {
    return {
      chart: {
        result: [
          {
            meta: {
              currency: "USD",
              symbol,
              regularMarketPrice: 6045.25,
              chartPreviousClose: 6070,
            },
            indicators: { quote: [{ close: [6070, 6045.25] }] },
          },
        ],
        error: null,
      },
    };
  }

  return {
    chart: {
      result: [
        {
          meta: {
            currency: "USD",
            symbol,
          },
          indicators: { quote: [{ close: [21000, null, 21111.456] }] },
        },
      ],
      error: null,
    },
  };
}
