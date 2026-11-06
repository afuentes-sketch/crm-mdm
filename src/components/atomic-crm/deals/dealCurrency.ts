import type { Deal } from "../types";

/** Currencies MDM quotes in. Each deal is in one of them. */
export const DEAL_CURRENCIES = ["MXN", "USD"] as const;
export type DealCurrency = (typeof DEAL_CURRENCIES)[number];

export const DEFAULT_DEAL_CURRENCY: DealCurrency = "MXN";

export const DEAL_CURRENCY_CHOICES = DEAL_CURRENCIES.map((code) => ({
  id: code,
  name: code,
}));

export const getDealCurrency = (deal: Pick<Deal, "currency">): DealCurrency =>
  deal.currency === "USD" ? "USD" : DEFAULT_DEAL_CURRENCY;

/**
 * Formats an amount as a price followed by its currency, so pesos and dollars
 * can never be mistaken for each other ("$12,500 MXN" vs "$12,500 USD").
 */
export const formatDealAmount = (
  amount: number,
  currency: string,
  locale: string,
  { compact = false }: { compact?: boolean } = {},
): string => {
  // MDM is in Mexico: Spanish amounts use the Mexican format ($1,400.50)
  const formatLocale = locale.startsWith("es") ? "es-MX" : locale;
  const price = amount.toLocaleString(formatLocale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }),
  });
  return `${price} ${currency}`;
};

/**
 * Totals per currency: amounts in pesos and dollars are never added together.
 * Currencies come in the DEAL_CURRENCIES order; empty ones are left out.
 */
export const sumByCurrency = (
  deals: Pick<Deal, "amount" | "currency">[],
): { currency: DealCurrency; total: number }[] => {
  const totals = new Map<DealCurrency, number>();
  for (const deal of deals) {
    const currency = getDealCurrency(deal);
    totals.set(currency, (totals.get(currency) ?? 0) + (deal.amount ?? 0));
  }
  return DEAL_CURRENCIES.filter((currency) => totals.has(currency)).map(
    (currency) => ({ currency, total: totals.get(currency)! }),
  );
};

export const formatTotalsByCurrency = (
  deals: Pick<Deal, "amount" | "currency">[],
  locale: string,
): string => {
  const totals = sumByCurrency(deals);
  if (totals.length === 0) {
    return formatDealAmount(0, DEFAULT_DEAL_CURRENCY, locale, {
      compact: true,
    });
  }
  return totals
    .map(({ currency, total }) =>
      formatDealAmount(total, currency, locale, { compact: true }),
    )
    .join(" · ");
};
