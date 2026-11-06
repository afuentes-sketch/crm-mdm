import { ResponsiveBar } from "@nivo/bar";
import { format, startOfMonth } from "date-fns";
import { TrendingUp } from "lucide-react";
import { useGetList, useLocaleState, useTranslate } from "ra-core";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import {
  DEFAULT_DEAL_CURRENCY,
  formatDealAmount,
  getDealCurrency,
  sumByCurrency,
  type DealCurrency,
} from "../deals/dealCurrency";
import { findDealLabel } from "../deals/dealUtils";
import { getDateFnsLocale } from "../misc/RelativeDate";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";

// Probability of closing, to weigh the expected revenue of open deals
const multiplier = {
  new: 0.1,
  "gathering-info": 0.2,
  "pending-quote": 0.3,
  "quote-ready": 0.4,
  "quote-sent": 0.5,
  negotiation: 0.7,
  "pending-review": 0.2,
  paused: 0.2,
};

const threeMonthsAgo = new Date(
  new Date().setMonth(new Date().getMonth() - 6),
).toISOString();

export const DealsChart = memo(() => {
  const translate = useTranslate();
  const { dealStages } = useConfigurationContext();
  const [locale = "en"] = useLocaleState();
  const wonLabel = findDealLabel(dealStages, "won") ?? "Won";
  const lostLabel = findDealLabel(dealStages, "lost") ?? "Lost";

  const { data, isPending } = useGetList<Deal>("deals", {
    pagination: { perPage: 100, page: 1 },
    sort: {
      field: "created_at",
      order: "ASC",
    },
    filter: {
      "created_at@gte": threeMonthsAgo,
    },
  });
  // Pesos and dollars are never added up: the chart shows one currency
  const currencies = useMemo(
    () => sumByCurrency(data ?? []).map(({ currency }) => currency),
    [data],
  );
  const [selectedCurrency, setSelectedCurrency] = useState<DealCurrency>();
  const currency: DealCurrency =
    selectedCurrency && currencies.includes(selectedCurrency)
      ? selectedCurrency
      : (currencies[0] ?? DEFAULT_DEAL_CURRENCY);

  const months = useMemo(() => {
    if (!data) return [];
    const currencyDeals = data.filter(
      (deal) => getDealCurrency(deal) === currency,
    );
    const dealsByMonth = currencyDeals.reduce((acc, deal) => {
      const month = startOfMonth(deal.created_at ?? new Date()).toISOString();
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(deal);
      return acc;
    }, {} as any);

    const amountByMonth = Object.keys(dealsByMonth).map((month) => {
      return {
        date: format(month, "MMM", { locale: getDateFnsLocale(locale) }),
        won: dealsByMonth[month]
          .filter((deal: Deal) => deal.stage === "won")
          .reduce((acc: number, deal: Deal) => {
            acc += deal.amount;
            return acc;
          }, 0),
        pending: dealsByMonth[month]
          .filter((deal: Deal) => !["won", "lost"].includes(deal.stage))
          .reduce((acc: number, deal: Deal) => {
            // @ts-expect-error - multiplier type issue
            acc += deal.amount * multiplier[deal.stage];
            return acc;
          }, 0),
        lost: dealsByMonth[month]
          .filter((deal: Deal) => deal.stage === "lost")
          .reduce((acc: number, deal: Deal) => {
            acc -= deal.amount;
            return acc;
          }, 0),
      };
    });

    return amountByMonth;
  }, [data, locale, currency]);

  if (isPending) return null; // FIXME return skeleton instead
  const range = months.reduce(
    (acc, month) => {
      acc.min = Math.min(acc.min, month.lost);
      acc.max = Math.max(acc.max, month.won + month.pending);
      return acc;
    },
    { min: 0, max: 0 },
  );
  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-4">
        <div className="mr-3 flex">
          <TrendingUp className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          {translate("crm.dashboard.deals_chart")}
        </h2>
        {currencies.length > 1 ? (
          <div className="flex gap-1" role="group">
            {currencies.map((code) => (
              <Button
                key={code}
                size="sm"
                variant={code === currency ? "default" : "outline"}
                aria-pressed={code === currency}
                onClick={() => setSelectedCurrency(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="h-[400px]">
        <ResponsiveBar
          data={months}
          indexBy="date"
          keys={["won", "pending", "lost"]}
          colors={["#61cdbb", "#97e3d5", "#e25c3b"]}
          margin={{ top: 30, right: 50, bottom: 30, left: 0 }}
          padding={0.3}
          valueScale={{
            type: "linear",
            min: range.min * 1.2,
            max: range.max * 1.2,
          }}
          indexScale={{ type: "band", round: true }}
          enableGridX={true}
          enableGridY={false}
          enableLabel={false}
          tooltip={({ value, indexValue }) => (
            <div className="p-2 bg-secondary rounded shadow inline-flex items-center gap-1 text-secondary-foreground">
              <strong>{indexValue}: </strong>&nbsp;{value > 0 ? "+" : ""}
              {formatDealAmount(value, currency, locale)}
            </div>
          )}
          axisTop={{
            tickSize: 0,
            tickPadding: 12,
            style: {
              ticks: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
              legend: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
            },
          }}
          axisBottom={{
            legendPosition: "middle",
            legendOffset: 50,
            tickSize: 0,
            tickPadding: 12,
            style: {
              ticks: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
              legend: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
            },
          }}
          axisLeft={null}
          axisRight={{
            format: (v: any) => `${Math.abs(v / 1000)}k`,
            tickValues: 8,
            style: {
              ticks: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
              legend: {
                text: {
                  fill: "var(--color-muted-foreground)",
                },
              },
            },
          }}
          markers={
            [
              {
                axis: "y",
                value: 0,
                lineStyle: { strokeOpacity: 0 },
                textStyle: { fill: "#2ebca6" },
                legend: wonLabel,
                legendPosition: "top-left",
                legendOrientation: "vertical",
              },
              {
                axis: "y",
                value: 0,
                lineStyle: {
                  stroke: "#f47560",
                  strokeWidth: 1,
                },
                textStyle: { fill: "#e25c3b" },
                legend: lostLabel,
                legendPosition: "bottom-left",
                legendOrientation: "vertical",
              },
            ] as any
          }
        />
      </div>
    </div>
  );
});
