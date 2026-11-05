import { useGetMany, useTranslate } from "ra-core";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { MobileContent } from "../layout/MobileContent";
import MobileHeader from "../layout/MobileHeader";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Deal, DealActivity } from "../types";
import { FollowUpHelpButton } from "./FollowUpHelpButton";
import {
  GROUP_DOT,
  GROUP_STYLES,
  LastContactText,
  StageBadge,
  useFormatDate,
} from "./FollowUpParts";
import {
  ACTIVE_GROUPS,
  FOLLOW_UP_PATH,
  countConsecutiveUnanswered,
  getFollowUpGroup,
  getLastActivity,
  type FollowUpGroup,
} from "./followUpRules";
import {
  getSaleName,
  useActivitiesByDeal,
  useFollowUpDeals,
  useSalesById,
  useToday,
} from "./useFollowUpData";

type Tab = "active" | "paused" | "closed";

const ALL = "all";

const TAB_GROUPS: Record<Tab, FollowUpGroup[]> = {
  active: ACTIVE_GROUPS,
  paused: ["paused"],
  closed: ["closed"],
};

export const FollowUpPage = () => {
  const isMobile = useIsMobile();
  const translate = useTranslate();
  const title = translate("crm.followup.title");

  if (isMobile) {
    return (
      <>
        <MobileHeader>
          <h1 className="text-xl font-semibold">{title}</h1>
        </MobileHeader>
        <MobileContent>
          <FollowUpContent />
        </MobileContent>
      </>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">
            {translate("crm.followup.subtitle")}
          </p>
        </div>
        <FollowUpHelpButton />
      </div>
      <FollowUpContent />
    </div>
  );
};

const FollowUpContent = () => {
  const translate = useTranslate();
  const isMobile = useIsMobile();
  const today = useToday();
  const { dealStages } = useConfigurationContext();
  const { data: deals = [], isPending } = useFollowUpDeals();
  const salesById = useSalesById();
  const [tab, setTab] = useState<Tab>("active");
  const [salesFilter, setSalesFilter] = useState<string>(ALL);
  const [stageFilter, setStageFilter] = useState<string>(ALL);
  const [companyFilter, setCompanyFilter] = useState<string>(ALL);

  const companyIds = useMemo(
    () => [...new Set(deals.map((deal) => deal.company_id).filter(Boolean))],
    [deals],
  );
  const { data: companies = [] } = useGetMany<Company>("companies", {
    ids: companyIds,
  });
  const companiesById = useMemo(
    () => Object.fromEntries(companies.map((c) => [String(c.id), c])),
    [companies],
  );

  const filteredDeals = useMemo(
    () =>
      deals.filter(
        (deal) =>
          (salesFilter === ALL || String(deal.sales_id) === salesFilter) &&
          (stageFilter === ALL || deal.stage === stageFilter) &&
          (companyFilter === ALL || String(deal.company_id) === companyFilter),
      ),
    [deals, salesFilter, stageFilter, companyFilter],
  );

  const groups = useMemo(() => {
    const byGroup = {} as Record<FollowUpGroup, Deal[]>;
    for (const deal of filteredDeals) {
      const group = getFollowUpGroup(deal, today);
      byGroup[group] = [...(byGroup[group] ?? []), deal];
    }
    return byGroup;
  }, [filteredDeals, today]);

  const visibleGroups = TAB_GROUPS[tab].filter(
    (group) => groups[group]?.length,
  );
  const visibleDealIds = visibleGroups.flatMap((group) =>
    groups[group].map((deal) => deal.id),
  );
  const activitiesByDeal = useActivitiesByDeal(visibleDealIds);

  const saleItems = Object.values(salesById).map((sale) => ({
    value: String(sale.id),
    label: getSaleName(sale),
  }));
  const companyItems = companies
    .map((company) => ({ value: String(company.id), label: company.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col gap-4">
      {isMobile ? <FollowUpHelpButton /> : null}
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="h-12 w-full sm:w-auto">
          {(["active", "paused", "closed"] as Tab[]).map((value) => (
            <TabsTrigger key={value} value={value} className="text-base px-4">
              {translate(`crm.followup.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FilterSelect
          value={salesFilter}
          onChange={setSalesFilter}
          allLabel={translate("crm.followup.filters.all_sales")}
          items={saleItems}
        />
        <FilterSelect
          value={stageFilter}
          onChange={setStageFilter}
          allLabel={translate("crm.followup.filters.all_stages")}
          items={dealStages.map((stage) => ({
            value: stage.value,
            label: stage.label,
          }))}
        />
        <FilterSelect
          value={companyFilter}
          onChange={setCompanyFilter}
          allLabel={translate("crm.followup.filters.all_companies")}
          items={companyItems}
        />
      </div>

      {isPending ? null : visibleGroups.length === 0 ? (
        <Card className="p-8 text-center text-lg text-muted-foreground">
          {translate("crm.followup.empty")}
        </Card>
      ) : (
        visibleGroups.map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className={cn("size-3 rounded-full", GROUP_DOT[group])} />
              {translate(`crm.followup.groups.${group}`)}
              <span className="text-muted-foreground font-normal">
                ({groups[group].length})
              </span>
            </h2>
            {groups[group].map((deal) => (
              <FollowUpRow
                key={deal.id}
                deal={deal}
                group={group}
                companyName={companiesById[String(deal.company_id)]?.name}
                ownerName={getSaleName(salesById[String(deal.sales_id)])}
                activities={activitiesByDeal[String(deal.id)] ?? []}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
};

const FilterSelect = ({
  value,
  onChange,
  allLabel,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  items: { value: string; label: string }[];
}) => {
  const allItems = [{ value: ALL, label: allLabel }, ...items];
  return (
    <Select
      value={value}
      onValueChange={(newValue) => onChange(newValue ?? ALL)}
      items={allItems}
    >
      <SelectTrigger className="w-full h-11 text-base" aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const FollowUpRow = ({
  deal,
  group,
  companyName,
  ownerName,
  activities,
}: {
  deal: Deal;
  group: FollowUpGroup;
  companyName?: string;
  ownerName: string;
  activities: DealActivity[];
}) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  const unanswered = countConsecutiveUnanswered(
    activities,
    deal.attempts_reset_at,
  );
  return (
    <Link
      to={`${FOLLOW_UP_PATH}/${deal.id}`}
      className="block no-underline text-inherit"
    >
      <Card
        className={cn(
          "p-4 gap-2 border-l-8 hover:bg-muted/50 transition-colors",
          GROUP_STYLES[group],
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">
              {companyName ?? deal.name}
            </div>
            <div className="text-base text-muted-foreground line-clamp-2">
              {companyName ? deal.name : null}
              {deal.description ? ` — ${deal.description}` : null}
            </div>
          </div>
          <StageBadge stage={deal.stage} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-base">
          <div>
            <span className="text-muted-foreground">
              {translate("crm.followup.fields.next_action")}:{" "}
            </span>
            {deal.next_action_date ? (
              <strong>
                {formatDate(deal.next_action_date)}
                {deal.next_action ? ` · ${deal.next_action}` : null}
              </strong>
            ) : deal.resume_date ? (
              <strong>
                {translate("crm.followup.paused_until", {
                  date: formatDate(deal.resume_date),
                })}
              </strong>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="text-muted-foreground">
              {translate("crm.followup.last_contact")}:{" "}
            </span>
            <LastContactText activity={getLastActivity(activities)} />
          </div>
          <div className="text-muted-foreground">
            {translate("resources.deals.fields.sales_id")}: {ownerName}
            {unanswered > 0 ? (
              <span className="block text-red-700 dark:text-red-400">
                {translate("crm.followup.unanswered", {
                  smart_count: unanswered,
                })}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
};
