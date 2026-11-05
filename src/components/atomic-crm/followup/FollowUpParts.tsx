/* eslint-disable react-refresh/only-export-components */
import { useLocaleState, useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { findDealLabel, formatISODateString } from "../deals/dealUtils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { DealActivity } from "../types";
import type { FollowUpGroup } from "./followUpRules";

/** Color code of each group, also used as a left border on the cards. */
export const GROUP_STYLES: Record<FollowUpGroup, string> = {
  review: "border-l-purple-500",
  resume: "border-l-blue-500",
  overdue: "border-l-red-500",
  this_week: "border-l-amber-500",
  this_month: "border-l-sky-500",
  later: "border-l-slate-300",
  no_action: "border-l-slate-400",
  paused: "border-l-blue-300",
  closed: "border-l-slate-300",
};

export const GROUP_DOT: Record<FollowUpGroup, string> = {
  review: "bg-purple-500",
  resume: "bg-blue-500",
  overdue: "bg-red-500",
  this_week: "bg-amber-500",
  this_month: "bg-sky-500",
  later: "bg-slate-300",
  no_action: "bg-slate-400",
  paused: "bg-blue-300",
  closed: "bg-slate-300",
};

export const StageBadge = ({ stage }: { stage: string }) => {
  const { dealStages } = useConfigurationContext();
  return (
    <Badge variant="secondary" className="text-sm">
      {findDealLabel(dealStages, stage) ?? stage}
    </Badge>
  );
};

export const useFormatDate = () => {
  const [locale = "en"] = useLocaleState();
  return (isoDate?: string | null) =>
    isoDate ? formatISODateString(isoDate.slice(0, 10), locale) : "";
};

export const LastContactText = ({ activity }: { activity?: DealActivity }) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  if (!activity) {
    return (
      <span className="text-muted-foreground">
        {translate("crm.followup.no_contact_yet")}
      </span>
    );
  }
  return (
    <span>
      {formatDate(activity.date)} ·{" "}
      {translate(`crm.followup.channels.${activity.channel}`)} ·{" "}
      <span
        className={cn(
          activity.answered
            ? "text-green-700 dark:text-green-400"
            : "text-red-700 dark:text-red-400",
        )}
      >
        {translate(
          activity.answered
            ? "crm.followup.answered_yes"
            : "crm.followup.answered_no",
        )}
      </span>
    </span>
  );
};
