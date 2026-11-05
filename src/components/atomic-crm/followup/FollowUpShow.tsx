import {
  ArrowLeft,
  BellOff,
  BellRing,
  CalendarClock,
  CirclePause,
  CircleX,
  ExternalLink,
  FileText,
  MessageCircle,
  Phone,
  Trophy,
} from "lucide-react";
import {
  useGetIdentity,
  useGetList,
  useGetMany,
  useGetOne,
  useLocaleState,
  useTranslate,
} from "ra-core";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { MobileContent } from "../layout/MobileContent";
import MobileHeader from "../layout/MobileHeader";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Contact, Deal, DealActivity } from "../types";
import {
  LostDialog,
  NextActionDialog,
  PauseDialog,
  QuoteDialog,
  RegisterContactDialog,
  WonDialog,
} from "./FollowUpDialogs";
import { FollowUpHelpButton } from "./FollowUpHelpButton";
import { GROUP_STYLES, StageBadge, useFormatDate } from "./FollowUpParts";
import { keepTryingPatch, resumePatch } from "./followUpActions";
import {
  countConsecutiveUnanswered,
  FOLLOW_UP_PATH,
  getFollowUpGroup,
  isClosed,
  STAGE_LOST,
  STAGE_PAUSED,
  STAGE_PENDING_REVIEW,
  STAGE_WON,
} from "./followUpRules";
import {
  getSaleName,
  useDealUpdater,
  useIsAdmin,
  useSalesById,
  useToday,
} from "./useFollowUpData";

type DialogName = "register" | "next" | "pause" | "won" | "lost" | "quote";

/** Opening `?accion=ganada` (from the board) shows the matching dialog. */
const ACTION_PARAM: Record<string, DialogName> = {
  ganada: "won",
  perdida: "lost",
  pausa: "pause",
};

export const FollowUpShow = () => {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const translate = useTranslate();
  const { data: deal } = useGetOne<Deal>(
    "deals",
    { id: id! },
    { enabled: !!id },
  );

  const backLink = (
    <Button
      variant="ghost"
      size="lg"
      className="h-11 text-base"
      nativeButton={false}
      render={<Link to={FOLLOW_UP_PATH} />}
    >
      <ArrowLeft className="size-5" />
      {translate("crm.followup.actions.back")}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <MobileHeader>
          <Link
            to={FOLLOW_UP_PATH}
            className="flex items-center gap-2 text-xl font-semibold"
            aria-label={translate("crm.followup.actions.back")}
          >
            <ArrowLeft className="size-6" />
            {translate("crm.followup.title")}
          </Link>
        </MobileHeader>
        <MobileContent>
          {deal ? <FollowUpShowContent deal={deal} /> : null}
        </MobileContent>
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {backLink}
        <FollowUpHelpButton />
      </div>
      {deal ? <FollowUpShowContent deal={deal} /> : null}
    </div>
  );
};

const FollowUpShowContent = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const today = useToday();
  const isAdmin = useIsAdmin();
  const isMobile = useIsMobile();
  const formatDate = useFormatDate();
  const salesById = useSalesById();
  const { save } = useDealUpdater();
  const { currency } = useConfigurationContext();
  const [locale = "en"] = useLocaleState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogName>();

  useEffect(() => {
    const action = searchParams.get("accion");
    if (action && ACTION_PARAM[action]) {
      setDialog(ACTION_PARAM[action]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: company } = useGetOne<Company>(
    "companies",
    { id: deal.company_id },
    { enabled: !!deal.company_id },
  );
  const { data: activities = [] } = useGetList<DealActivity>(
    "deal_activities",
    {
      filter: { deal_id: deal.id },
      sort: { field: "date", order: "DESC" },
      pagination: { page: 1, perPage: 500 },
    },
  );

  const group = getFollowUpGroup(deal, today);
  const closed = isClosed(deal);
  const unanswered = countConsecutiveUnanswered(
    activities,
    deal.attempts_reset_at,
  );
  const owner = getSaleName(salesById[String(deal.sales_id)]);
  const assigner = deal.assigned_by
    ? getSaleName(salesById[String(deal.assigned_by)])
    : null;

  const dialogProps = (name: DialogName) => ({
    deal,
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : undefined),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn("p-5 gap-3 border-l-8", GROUP_STYLES[group])}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">
              {company?.name ?? deal.name}
            </h1>
            {company ? (
              <p className="text-lg text-muted-foreground">{deal.name}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {deal.reminders_muted ? (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <BellOff className="size-4" />
                {translate("crm.followup.muted_badge")}
              </span>
            ) : null}
            <StageBadge stage={deal.stage} />
          </div>
        </div>
        {deal.description ? (
          <p className="text-base whitespace-pre-line">{deal.description}</p>
        ) : null}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-base">
          <InfoItem label={translate("resources.deals.fields.sales_id")}>
            {owner}
          </InfoItem>
          <InfoItem label={translate("crm.followup.origin.label")}>
            {assigner
              ? translate("crm.followup.origin.assigned", { name: assigner })
              : translate("crm.followup.origin.own", { name: owner })}
          </InfoItem>
          <InfoItem label={translate("crm.followup.fields.next_action")}>
            {deal.next_action_date ? (
              <strong>
                {formatDate(deal.next_action_date)}
                {deal.next_action ? ` · ${deal.next_action}` : null}
              </strong>
            ) : (
              "—"
            )}
          </InfoItem>
          {unanswered > 0 ? (
            <InfoItem label={translate("crm.followup.last_contact")}>
              <span className="text-red-700 dark:text-red-400">
                {translate("crm.followup.unanswered", {
                  smart_count: unanswered,
                })}
              </span>
            </InfoItem>
          ) : null}
          {deal.quote_url || deal.quote_number || deal.quote_amount != null ? (
            <InfoItem label={translate("crm.followup.actions.quote")}>
              {deal.quote_url ? (
                <a
                  href={deal.quote_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  {deal.quote_number || translate("crm.followup.actions.quote")}
                  <ExternalLink className="size-4" />
                </a>
              ) : (
                deal.quote_number
              )}
              {deal.quote_amount != null
                ? ` · ${deal.quote_amount.toLocaleString(locale, {
                    style: "currency",
                    currency,
                  })}`
                : null}
              {deal.quote_sent_date
                ? ` · ${formatDate(deal.quote_sent_date)}`
                : null}
            </InfoItem>
          ) : null}
        </dl>
      </Card>

      <StatusBanner deal={deal} />

      {deal.stage === STAGE_PENDING_REVIEW ? (
        <Card className="p-5 gap-3 border-purple-300 bg-purple-50 dark:bg-purple-950/30">
          <p className="text-base font-medium">
            {translate("crm.followup.review.banner")}
          </p>
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <BigButton
                icon={<Phone />}
                onClick={() =>
                  save(
                    deal,
                    keepTryingPatch({
                      today,
                      actionLabel: translate(
                        "crm.followup.defaults.keep_trying",
                      ),
                    }),
                    translate("crm.followup.messages.resumed"),
                  )
                }
              >
                {translate("crm.followup.actions.keep_trying")}
              </BigButton>
              <BigButton
                icon={<CirclePause />}
                variant="outline"
                onClick={() => setDialog("pause")}
              >
                {translate("crm.followup.actions.pause")}
              </BigButton>
              <BigButton
                icon={<CircleX />}
                variant="outline"
                onClick={() => setDialog("lost")}
              >
                {translate("crm.followup.actions.lost")}
              </BigButton>
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              {translate("crm.followup.review.waiting")}
            </p>
          )}
        </Card>
      ) : null}

      {deal.stage === STAGE_PAUSED ? (
        <BigButton
          icon={<Phone />}
          onClick={() =>
            save(
              deal,
              resumePatch({
                today,
                actionLabel: translate("crm.followup.defaults.resume"),
              }),
              translate("crm.followup.messages.resumed"),
            )
          }
        >
          {translate("crm.followup.actions.resume")}
        </BigButton>
      ) : null}

      {!closed ? (
        <div className="flex flex-col gap-2">
          <BigButton
            icon={<MessageCircle />}
            className="h-16 text-lg"
            onClick={() => setDialog("register")}
          >
            {translate("crm.followup.actions.register")}
          </BigButton>
          <div
            className={cn(
              "grid gap-2",
              isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3",
            )}
          >
            <BigButton
              icon={<CalendarClock />}
              variant="outline"
              onClick={() => setDialog("next")}
            >
              {translate("crm.followup.actions.next_action")}
            </BigButton>
            <BigButton
              icon={<FileText />}
              variant="outline"
              onClick={() => setDialog("quote")}
            >
              {translate("crm.followup.actions.quote")}
            </BigButton>
            <BigButton
              icon={<Trophy />}
              variant="outline"
              className="border-green-600 text-green-700 dark:text-green-400"
              onClick={() => setDialog("won")}
            >
              {translate("crm.followup.actions.won")}
            </BigButton>
            {deal.stage !== STAGE_PAUSED &&
            deal.stage !== STAGE_PENDING_REVIEW ? (
              <BigButton
                icon={<CirclePause />}
                variant="outline"
                onClick={() => setDialog("pause")}
              >
                {translate("crm.followup.actions.pause")}
              </BigButton>
            ) : null}
            {deal.stage !== STAGE_PENDING_REVIEW ? (
              <BigButton
                icon={<CircleX />}
                variant="outline"
                onClick={() => setDialog("lost")}
              >
                {translate("crm.followup.actions.lost")}
              </BigButton>
            ) : null}
            <BigButton
              icon={deal.reminders_muted ? <BellRing /> : <BellOff />}
              variant="ghost"
              onClick={() =>
                save(
                  deal,
                  { reminders_muted: !deal.reminders_muted },
                  translate(
                    deal.reminders_muted
                      ? "crm.followup.messages.unmuted"
                      : "crm.followup.messages.muted",
                  ),
                )
              }
            >
              {translate(
                deal.reminders_muted
                  ? "crm.followup.actions.unmute"
                  : "crm.followup.actions.mute",
              )}
            </BigButton>
          </div>
        </div>
      ) : null}

      <ContactsCard contactIds={deal.contact_ids ?? []} />
      <HistoryCard activities={activities} salesById={salesById} />

      <RegisterContactDialog {...dialogProps("register")} />
      <NextActionDialog {...dialogProps("next")} />
      <PauseDialog {...dialogProps("pause")} />
      <WonDialog {...dialogProps("won")} />
      <LostDialog {...dialogProps("lost")} />
      <QuoteDialog {...dialogProps("quote")} />
    </div>
  );
};

const InfoItem = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd>{children}</dd>
  </div>
);

const BigButton = ({
  icon,
  children,
  onClick,
  variant = "default",
  className,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) => (
  <Button
    variant={variant}
    size="lg"
    className={cn(
      "h-14 text-base justify-start gap-3 [&_svg]:size-5",
      className,
    )}
    onClick={onClick}
  >
    {icon}
    {children}
  </Button>
);

const StatusBanner = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  if (deal.stage === STAGE_WON) {
    return (
      <Card className="p-4 text-base border-green-300 bg-green-50 dark:bg-green-950/30">
        {translate("crm.followup.closed_won", {
          date: formatDate(deal.po_date),
          number: deal.po_number ?? "",
        })}
        {deal.po_url ? (
          <a
            href={deal.po_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline ml-2"
          >
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </Card>
    );
  }
  if (deal.stage === STAGE_LOST) {
    return (
      <Card className="p-4 text-base border-red-300 bg-red-50 dark:bg-red-950/30">
        {translate("crm.followup.closed_lost", {
          reason: deal.lost_reason ?? "",
        })}
      </Card>
    );
  }
  if (deal.stage === STAGE_PAUSED && deal.resume_date) {
    return (
      <Card className="p-4 text-base border-blue-300 bg-blue-50 dark:bg-blue-950/30">
        {translate("crm.followup.paused_until", {
          date: formatDate(deal.resume_date),
        })}
      </Card>
    );
  }
  return null;
};

type PhoneEntry = { number: string; type?: string };
type EmailEntry = { email: string; type?: string };

const ContactsCard = ({ contactIds }: { contactIds: Contact["id"][] }) => {
  const translate = useTranslate();
  const { data: contacts = [] } = useGetMany<Contact>("contacts", {
    ids: contactIds,
  });
  if (!contacts.length) return null;
  return (
    <Card className="p-5 gap-3">
      <h2 className="text-lg font-semibold">
        {translate("resources.deals.fields.contact_ids")}
      </h2>
      {contacts.map((contact) => (
        <div key={contact.id} className="flex flex-col gap-1 text-base">
          <Link
            to={`/contacts/${contact.id}/show`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {contact.first_name} {contact.last_name}
          </Link>
          <div className="flex flex-wrap gap-2">
            {((contact.phone_jsonb ?? []) as PhoneEntry[]).map((phone) => (
              <PhoneLinks key={phone.number} number={phone.number} />
            ))}
            {((contact.email_jsonb ?? []) as EmailEntry[]).map((email) => (
              <Button
                key={email.email}
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={`mailto:${email.email}`} />}
              >
                {email.email}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
};

/** Call and WhatsApp shortcuts; nothing is sent until the user does it. */
const PhoneLinks = ({ number }: { number: string }) => {
  const digits = number.replace(/[^\d+]/g, "");
  const whatsappDigits = digits.replace(/^\+/, "");
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={`tel:${digits}`} />}
      >
        <Phone className="size-4" />
        {number}
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a
            href={`https://wa.me/${whatsappDigits}`}
            target="_blank"
            rel="noreferrer"
          />
        }
      >
        <MessageCircle className="size-4" />
        WhatsApp
      </Button>
    </>
  );
};

const HistoryCard = ({
  activities,
  salesById,
}: {
  activities: DealActivity[];
  salesById: ReturnType<typeof useSalesById>;
}) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  const { identity } = useGetIdentity();
  return (
    <Card className="p-5 gap-3">
      <h2 className="text-lg font-semibold">
        {translate("crm.followup.history.title")}
      </h2>
      {activities.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {translate("crm.followup.history.empty")}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {activities.map((activity) => {
            const author =
              activity.sales_id === identity?.id
                ? translate("crm.common.me")
                : getSaleName(salesById[String(activity.sales_id)]);
            const time = new Date(activity.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li
                key={activity.id}
                className={cn(
                  "border-l-4 pl-3 text-base",
                  activity.answered ? "border-green-500" : "border-red-400",
                )}
              >
                <div className="font-medium">
                  {formatDate(activity.date)} {time} ·{" "}
                  {translate(`crm.followup.channels.${activity.channel}`)} ·{" "}
                  {translate(
                    activity.answered
                      ? "crm.followup.answered_yes"
                      : "crm.followup.answered_no",
                  )}
                </div>
                {activity.notes ? (
                  <p className="whitespace-pre-line">{activity.notes}</p>
                ) : null}
                <div className="text-sm text-muted-foreground">
                  {translate("crm.followup.history.by", { name: author })}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};
