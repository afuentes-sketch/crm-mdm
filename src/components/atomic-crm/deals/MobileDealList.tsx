import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useGetIdentity,
  useGetMany,
  useLocaleState,
  useTranslate,
} from "ra-core";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { LastContactText, useFormatDate } from "../followup/FollowUpParts";
import {
  CLOSED_STAGES,
  FOLLOW_UP_PATH,
  getLastActivity,
} from "../followup/followUpRules";
import {
  getSaleName,
  useActivitiesByDeal,
  useFollowUpDeals,
  useIsAdmin,
  useSalesById,
} from "../followup/useFollowUpData";
import { MobileContent } from "../layout/MobileContent";
import MobileHeader from "../layout/MobileHeader";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Deal, DealActivity } from "../types";
import {
  formatDealAmount,
  formatTotalsByCurrency,
  getDealCurrency,
} from "./dealCurrency";

export const MOBILE_DEALS_PATH = "/oportunidades";

const ALL = "all";

/**
 * The deal board on a phone: one collapsible section per status instead of
 * columns, and for each deal how the salesperson is doing with the client
 * (last contact, next action).
 */
export const MobileDealList = () => {
  const translate = useTranslate();
  return (
    <>
      <MobileHeader showRefresh>
        <h1 className="text-xl font-semibold">
          {translate("resources.deals.name", { smart_count: 2 })}
        </h1>
      </MobileHeader>
      <MobileContent>
        <MobileDealListContent />
      </MobileContent>
    </>
  );
};

export const MobileDealListContent = () => {
  const translate = useTranslate();
  const [locale = "en"] = useLocaleState();
  const { identity } = useGetIdentity();
  const isAdmin = useIsAdmin();
  const { dealStages } = useConfigurationContext();
  const { data: deals = [], isPending } = useFollowUpDeals();
  const salesById = useSalesById();
  // Administrators start on everyone's deals; a salesperson on their own
  const [owner, setOwner] = useState<string>();
  const ownerFilter = owner ?? (isAdmin ? ALL : String(identity?.id ?? ALL));

  const visibleDeals = useMemo(
    () =>
      deals.filter(
        (deal) =>
          !deal.archived_at &&
          (ownerFilter === ALL || String(deal.sales_id) === ownerFilter),
      ),
    [deals, ownerFilter],
  );

  const companyIds = useMemo(
    () => [...new Set(visibleDeals.map((deal) => deal.company_id))],
    [visibleDeals],
  );
  const { data: companies = [] } = useGetMany<Company>("companies", {
    ids: companyIds,
  });
  const companiesById = useMemo(
    () => Object.fromEntries(companies.map((c) => [String(c.id), c])),
    [companies],
  );
  const activitiesByDeal = useActivitiesByDeal(
    visibleDeals.map((deal) => deal.id),
  );

  const ownerItems = [
    { value: ALL, label: translate("crm.followup.filters.all_sales") },
    ...Object.values(salesById).map((sale) => ({
      value: String(sale.id),
      label: getSaleName(sale),
    })),
  ];

  if (isPending) return null;

  return (
    <div className="flex flex-col gap-3">
      <Select
        value={ownerFilter}
        onValueChange={(value) => setOwner(value ?? ALL)}
        items={ownerItems}
      >
        <SelectTrigger
          className="w-full h-11 text-base"
          aria-label={translate("resources.deals.fields.sales_id")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ownerItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dealStages.map((stage) => (
        <StageSection
          key={stage.value}
          label={stage.label}
          deals={visibleDeals.filter((deal) => deal.stage === stage.value)}
          // Closed deals stay folded so the work in progress comes first
          defaultOpen={
            !(CLOSED_STAGES as readonly string[]).includes(stage.value)
          }
          locale={locale}
          companiesById={companiesById}
          activitiesByDeal={activitiesByDeal}
          ownerNameOf={(deal) => getSaleName(salesById[String(deal.sales_id)])}
          showOwner={ownerFilter === ALL}
        />
      ))}
    </div>
  );
};

const StageSection = ({
  label,
  deals,
  defaultOpen,
  locale,
  companiesById,
  activitiesByDeal,
  ownerNameOf,
  showOwner,
}: {
  label: string;
  deals: Deal[];
  defaultOpen: boolean;
  locale: string;
  companiesById: Record<string, Company>;
  activitiesByDeal: Record<string, DealActivity[]>;
  ownerNameOf: (deal: Deal) => string;
  showOwner: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen && deals.length > 0);
  const isEmpty = deals.length === 0;
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <button
        type="button"
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-left",
          isEmpty ? "text-muted-foreground" : "",
        )}
        onClick={() => setOpen((value) => !value)}
        disabled={isEmpty}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-5 shrink-0" />
        ) : (
          <ChevronRight className="size-5 shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold">
            {label}{" "}
            <span className="font-normal text-muted-foreground">
              ({deals.length})
            </span>
          </span>
          {!isEmpty ? (
            <span className="block text-xs text-muted-foreground">
              {formatTotalsByCurrency(deals, locale)}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <ul className="border-t divide-y">
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              locale={locale}
              company={companiesById[String(deal.company_id)]}
              activities={activitiesByDeal[String(deal.id)] ?? []}
              ownerName={showOwner ? ownerNameOf(deal) : null}
            />
          ))}
        </ul>
      ) : null}
    </Card>
  );
};

const DealRow = ({
  deal,
  locale,
  company,
  activities,
  ownerName,
}: {
  deal: Deal;
  locale: string;
  company?: Company;
  activities: DealActivity[];
  ownerName: string | null;
}) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  return (
    <li>
      <Link
        to={`${FOLLOW_UP_PATH}/${deal.id}`}
        className="flex gap-3 px-4 py-3 no-underline text-inherit active:bg-muted"
      >
        {company ? (
          <CompanyAvatar record={company} width={20} height={20} />
        ) : null}
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold break-words">
              {deal.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDealAmount(deal.amount, getDealCurrency(deal), locale, {
                compact: true,
              })}
            </span>
          </span>
          {company ? (
            <span className="text-sm text-muted-foreground">
              {company.name}
            </span>
          ) : null}
          <span className="text-sm">
            <span className="text-muted-foreground">
              {translate("crm.followup.last_contact")}:{" "}
            </span>
            <LastContactText activity={getLastActivity(activities)} />
          </span>
          {deal.next_action_date ? (
            <span className="text-sm">
              <span className="text-muted-foreground">
                {translate("crm.followup.fields.next_action")}:{" "}
              </span>
              {formatDate(deal.next_action_date)}
              {deal.next_action ? ` · ${deal.next_action}` : null}
            </span>
          ) : null}
          {ownerName ? (
            <span className="text-xs text-muted-foreground">
              {translate("resources.deals.fields.sales_id")}: {ownerName}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
};
