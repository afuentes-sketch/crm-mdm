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

  it("shows each amount as a price followed by its currency", () => {
    expect(normalize(formatDealAmount(12500, "USD", "en-US"))).toBe(
      "$12,500 USD",
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
    ).toBe("$250K MXN · $12K USD");
  });
});
