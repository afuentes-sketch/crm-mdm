import { useQueryClient } from "@tanstack/react-query";
import {
  useCanAccess,
  useDataProvider,
  useGetList,
  useNotify,
  useTranslate,
  type Identifier,
} from "ra-core";
import { useCallback, useMemo } from "react";

import type { Deal, DealActivity, Sale } from "../types";
import { toISODate } from "./followUpRules";

export const useToday = (): string => useMemo(() => toISODate(new Date()), []);

/** Administrators can list users; that is how the app tells them apart. */
export const useIsAdmin = (): boolean => {
  const { canAccess } = useCanAccess({ resource: "sales", action: "list" });
  return !!canAccess;
};

// A small team has a few hundred deals at most: loading them all keeps the
// follow-up groups and the bell exact without extra queries.
const MAX_DEALS = 1000;

export const useFollowUpDeals = () =>
  useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: MAX_DEALS },
    sort: { field: "next_action_date", order: "ASC" },
  });

export const useSalesById = (): Record<string, Sale> => {
  const { data } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "last_name", order: "ASC" },
  });
  return useMemo(
    () =>
      Object.fromEntries((data ?? []).map((sale) => [String(sale.id), sale])),
    [data],
  );
};

export const getSaleName = (sale?: Sale): string =>
  sale ? `${sale.first_name} ${sale.last_name}`.trim() : "";

/** Contact history of several deals, grouped by deal id, newest first. */
export const useActivitiesByDeal = (
  dealIds: Identifier[],
): Record<string, DealActivity[]> => {
  const { data } = useGetList<DealActivity>(
    "deal_activities",
    {
      filter: { "deal_id@in": `(${dealIds.join(",")})` },
      sort: { field: "date", order: "DESC" },
      pagination: { page: 1, perPage: 5000 },
    },
    { enabled: dealIds.length > 0 },
  );
  return useMemo(() => {
    const byDeal: Record<string, DealActivity[]> = {};
    for (const activity of data ?? []) {
      const key = String(activity.deal_id);
      byDeal[key] = [...(byDeal[key] ?? []), activity];
    }
    return byDeal;
  }, [data]);
};

/**
 * Saves follow-up fields on a deal, refreshes every list that shows deals or
 * their history, and tells the user how it went.
 */
export const useDealUpdater = () => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const translate = useTranslate();

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deals"] }),
      queryClient.invalidateQueries({ queryKey: ["deal_activities"] }),
    ]);
  }, [queryClient]);

  const save = useCallback(
    async (
      deal: Deal,
      patch: Partial<Deal>,
      successMessage: string,
    ): Promise<boolean> => {
      try {
        await dataProvider.update<Deal>("deals", {
          id: deal.id,
          data: { ...patch, updated_at: new Date().toISOString() },
          previousData: deal,
        });
        await refresh();
        notify(successMessage, { type: "success" });
        return true;
      } catch {
        notify(translate("crm.followup.messages.error"), { type: "error" });
        return false;
      }
    },
    [dataProvider, notify, refresh, translate],
  );

  return { save, refresh, dataProvider };
};
