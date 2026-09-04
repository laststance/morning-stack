import { expect, test } from "@playwright/test";

import { addDaysToCivilDate } from "@/lib/edition-date/add-days-to-civil-date";
import { parseCivilDate } from "@/lib/edition-date/parse-civil-date";
import { getArchiveBoundaryRedirectHref } from "@/lib/edition-navigation/get-archive-boundary-redirect-href";
import { resolveHomeSearchParams } from "@/lib/edition-navigation/resolve-home-search-params";
import { parseSavedEditionType } from "@/lib/edition-preference/parse-saved-edition-type";

test("strict civil dates reject malformed and impossible calendar values", () => {
  // Arrange
  const dateInputs = ["2026-08-13", "2026-02-30", "2026-8-13", "not-a-date"];

  // Act
  const parsedDates = dateInputs.map(parseCivilDate);

  // Assert
  expect(parsedDates).toEqual([
    { year: 2026, month: 8, day: 13 },
    null,
    null,
    null,
  ]);
});

test("strict civil dates preserve canonical years below one hundred", () => {
  // Arrange
  const canonicalEarlyDate = "0004-02-29";

  // Act
  const parsedDate = parseCivilDate(canonicalEarlyDate);

  // Assert
  expect(parsedDate).toEqual({ year: 4, month: 2, day: 29 });
});

test("one-day navigation crosses month and leap-year boundaries without timezone drift", () => {
  // Arrange
  const leapDay = "2028-02-29";

  // Act
  const previousDate = addDaysToCivilDate(leapDay, -1);
  const nextDate = addDaysToCivilDate(leapDay, 1);

  // Assert
  expect(previousDate).toBe("2028-02-28");
  expect(nextDate).toBe("2028-03-01");
});

test("home URLs canonicalize current, historical, malformed, future, and duplicate selections", () => {
  // Arrange
  const cases = [
    {
      params: {},
      expected: {
        requestedDate: "2030-01-15",
        requestedEditionType: "morning",
        isHistoricalSelection: false,
        allowLatestFallback: true,
        redirectHref: null,
      },
    },
    {
      params: { edition: "evening" },
      expected: {
        requestedDate: "2030-01-15",
        requestedEditionType: "evening",
        isHistoricalSelection: false,
        allowLatestFallback: false,
        redirectHref: null,
      },
    },
    {
      params: { date: "2030-01-14" },
      expected: {
        requestedDate: "2030-01-14",
        requestedEditionType: "morning",
        isHistoricalSelection: true,
        allowLatestFallback: false,
        redirectHref: "/?date=2030-01-14&edition=morning",
      },
    },
    {
      params: { date: "2030-01-15", edition: "evening" },
      expected: {
        requestedDate: "2030-01-15",
        requestedEditionType: "evening",
        isHistoricalSelection: false,
        allowLatestFallback: false,
        redirectHref: "/?edition=evening",
      },
    },
    {
      params: { date: "2030-01-16", edition: "evening" },
      expected: {
        requestedDate: "2030-01-15",
        requestedEditionType: "evening",
        isHistoricalSelection: false,
        allowLatestFallback: false,
        redirectHref: "/?edition=evening",
      },
    },
    {
      params: {
        date: ["2030-02-30", "2030-01-14"],
        edition: ["weekly", "evening", "morning"],
      },
      expected: {
        requestedDate: "2030-01-14",
        requestedEditionType: "evening",
        isHistoricalSelection: true,
        allowLatestFallback: false,
        redirectHref: "/?date=2030-01-14&edition=evening",
      },
    },
  ];

  // Act
  const results = cases.map(({ params }) =>
    resolveHomeSearchParams(params, "2030-01-15", "morning"),
  );

  // Assert
  expect(results).toEqual(cases.map(({ expected }) => expected));
});

test("explicit edition URLs override the saved default while an absent edition uses it", () => {
  // Arrange
  const savedDefaultEdition = parseSavedEditionType("evening");
  if (!savedDefaultEdition) throw new Error("Expected a valid saved edition");

  // Act
  const implicitSelection = resolveHomeSearchParams(
    {},
    "2030-01-15",
    savedDefaultEdition,
  );
  const explicitSelection = resolveHomeSearchParams(
    { edition: "morning" },
    "2030-01-15",
    savedDefaultEdition,
  );
  const historicalDateOnlySelection = resolveHomeSearchParams(
    { date: "2030-01-14" },
    "2030-01-15",
    savedDefaultEdition,
  );

  // Assert
  expect(implicitSelection.requestedEditionType).toBe("evening");
  expect(explicitSelection.requestedEditionType).toBe("morning");
  expect(historicalDateOnlySelection).toMatchObject({
    requestedDate: "2030-01-14",
    requestedEditionType: "evening",
    redirectHref: "/?date=2030-01-14&edition=evening",
  });
});

test("invalid browser preferences fall back instead of becoming edition state", () => {
  // Arrange
  const cookieValues = ["weekly", "", undefined];

  // Act
  const parsedValues = cookieValues.map(parseSavedEditionType);

  // Assert
  expect(parsedValues).toEqual([null, null, null]);
});

test("archive boundary redirects to the shared earliest date without changing edition type", () => {
  // Arrange
  const selection = resolveHomeSearchParams(
    { date: "2030-01-10", edition: "evening" },
    "2030-01-15",
    "morning",
  );

  // Act
  const redirectHref = getArchiveBoundaryRedirectHref(selection, "2030-01-12");

  // Assert
  expect(redirectHref).toBe("/?date=2030-01-12&edition=evening");
});
