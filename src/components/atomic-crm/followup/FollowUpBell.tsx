import { Bell } from "lucide-react";
import { useGetIdentity, useTranslate } from "ra-core";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { FOLLOW_UP_PATH, getReminders, type Reminder } from "./followUpRules";
import { useFormatDate } from "./FollowUpParts";
import { useFollowUpDeals, useIsAdmin, useToday } from "./useFollowUpData";

const KIND_STYLES: Record<Reminder["kind"], string> = {
  overdue: "bg-red-500",
  due: "bg-amber-500",
  review: "bg-purple-500",
  resume: "bg-blue-500",
};

/** Reminders of the follow-up, inside the CRM only (no email, no push). */
export const FollowUpBell = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const today = useToday();
  const isAdmin = useIsAdmin();
  const { identity } = useGetIdentity();
  const { data: deals = [] } = useFollowUpDeals();

  const reminders = useMemo(
    () => getReminders({ deals, salesId: identity?.id, isAdmin, today }),
    [deals, identity?.id, isAdmin, today],
  );
  const count = reminders.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-10"
            aria-label={`${translate("crm.followup.bell.title")} (${count})`}
          />
        }
      >
        <Bell className="size-6" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
        <div className="px-2 py-1.5 text-base font-semibold">
          {translate("crm.followup.bell.title")}
        </div>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-3 py-4 text-base text-muted-foreground">
            {translate("crm.followup.bell.empty")}
          </div>
        ) : (
          reminders.map(({ deal, kind }) => (
            <DropdownMenuItem
              key={`${kind}-${deal.id}`}
              className="flex items-start gap-3 py-3"
              onClick={() => navigate(`${FOLLOW_UP_PATH}/${deal.id}`)}
            >
              <span
                className={cn(
                  "mt-1.5 size-3 shrink-0 rounded-full",
                  KIND_STYLES[kind],
                )}
              />
              <span className="flex flex-col">
                <span className="text-base font-medium">{deal.name}</span>
                <span className="text-sm text-muted-foreground">
                  {translate(`crm.followup.bell.${kind}`)}
                  {deal.next_action ? ` · ${deal.next_action}` : null}
                  {kind === "overdue" && deal.next_action_date
                    ? ` · ${formatDate(deal.next_action_date)}`
                    : null}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="py-3 text-base justify-center font-medium"
          onClick={() => navigate(FOLLOW_UP_PATH)}
        >
          {translate("crm.followup.bell.see_all")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
