import { describe, expect, it } from "vitest";

import {
  formatDealAmount,
  formatTotalsByCurrency,
  getDealCurrency,
  sumByCurrency,
} from "./dealCurrency";

describe("dealCurrency", () => {
  it("treats a deal without currency as pesos", () => {
    expect(getDealCurrency({ currency: null })).toBe("MXN");
    expect(getDealCurrency({ currency: "USD" })).toBe("USD");
  });

  it("never adds pesos and dollars together", () => {
    const deals = [
      { amount: 100000, currency: "MXN" },
      { amount: 5000, currency: "USD" },
      { amount: 150000, currency: null },
    ];

    expect(sumByCurrency(deals)).toEqual([
      { currency: "MXN", total: 250000 },
      { currency: "USD", total: 5000 },
    ]);
  });

  // Intl separates the code with a non-breaking space
  const normalize = (text: string) => text.replace(/\s/g, " ");

  it("shows the currency code next to each amount", () => {
    expect(normalize(formatDealAmount(12500, "USD", "en-US"))).toBe(
      "USD 12,500",
    );
    expect(
      normalize(
        formatTotalsByCurrency(
          [
            { amount: 250000, currency: "MXN" },
            { amount: 12000, currency: "USD" },
          ],
          "en-US",
        ),
      ),
    ).toBe("MXN 250K · USD 12K");
  });
});
