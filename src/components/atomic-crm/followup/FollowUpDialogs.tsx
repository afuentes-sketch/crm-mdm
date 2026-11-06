import {
  useGetIdentity,
  useLocaleState,
  useNotify,
  useTranslate,
} from "ra-core";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DEAL_CURRENCIES,
  getDealCurrency,
  type DealCurrency,
} from "../deals/dealCurrency";
import { formatISODateString } from "../deals/dealUtils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, DealActivityChannel } from "../types";
import {
  ChoiceButtons,
  FollowUpDialog,
  TextAreaField,
  TextField,
} from "./FollowUpDialog";
import {
  lostPatch,
  pausePatch,
  recordContactAttempt,
  wonPatch,
} from "./followUpActions";
import {
  addDays,
  isGuardedStage,
  STAGE_FOLLOW_UP,
  STAGE_TO_AUTHORIZE,
  STAGE_TO_QUOTE,
} from "./followUpRules";
import { useDealUpdater, useToday } from "./useFollowUpData";

export interface DealDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANNELS: DealActivityChannel[] = ["call", "whatsapp", "email", "visit"];

export const RegisterContactDialog = ({
  deal,
  open,
  onOpenChange,
}: DealDialogProps) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [locale = "en"] = useLocaleState();
  const { identity } = useGetIdentity();
  const { refresh, dataProvider } = useDealUpdater();
  const today = useToday();
  const [channel, setChannel] = useState<DealActivityChannel>();
  const [answered, setAnswered] = useState<"yes" | "no">();
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState(addDays(today, 7));
  // A deal on hold that answers goes back to follow-up by default
  const defaultStage = isGuardedStage(deal.stage)
    ? STAGE_FOLLOW_UP
    : deal.stage;
  const [stage, setStage] = useState(defaultStage);

  useEffect(() => {
    if (!open) return;
    setChannel(undefined);
    setAnswered(undefined);
    setNotes("");
    setNextAction("");
    setNextActionDate(addDays(today, 7));
    setStage(defaultStage);
  }, [open, today, defaultStage]);

  const onSave = async () => {
    if (!channel || !answered) return false;
    try {
      const outcome = await recordContactAttempt({
        dataProvider,
        deal,
        input: {
          channel,
          answered: answered === "yes",
          notes,
          nextAction,
          nextActionDate,
          stage,
        },
        salesId: identity?.id,
        today,
        retryActionLabel: translate("crm.followup.defaults.retry"),
      });
      await refresh();
      if (answered === "no" && outcome.patch.next_action_date) {
        notify(
          translate("crm.followup.messages.retry_planned", {
            date: formatISODateString(outcome.patch.next_action_date, locale),
          }),
          { type: "info" },
        );
      } else {
        notify(translate("crm.followup.messages.registered"), {
          type: "success",
        });
      }
      return true;
    } catch {
      notify(translate("crm.followup.messages.error"), { type: "error" });
      return false;
    }
  };

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.register_title")}
      description={deal.name}
      onSave={onSave}
      canSave={!!channel && !!answered && (answered === "no" || !!nextAction)}
    >
      <ChoiceButtons
        label={translate("crm.followup.fields.channel")}
        options={CHANNELS.map((value) => ({
          value,
          label: translate(`crm.followup.channels.${value}`),
        }))}
        value={channel}
        onChange={setChannel}
      />
      <ChoiceButtons
        label={translate("crm.followup.fields.answered")}
        options={[
          { value: "yes", label: translate("crm.followup.answered_yes") },
          { value: "no", label: translate("crm.followup.answered_no") },
        ]}
        value={answered}
        onChange={setAnswered}
      />
      <TextAreaField
        id="followup-notes"
        label={translate("crm.followup.fields.notes")}
        value={notes}
        onChange={setNotes}
      />
      {answered === "yes" ? (
        <>
          <StageSelect value={stage} onChange={setStage} />
          <TextField
            id="followup-next-action"
            label={translate("crm.followup.fields.next_action")}
            value={nextAction}
            onChange={setNextAction}
            required
          />
          <TextField
            id="followup-next-action-date"
            type="date"
            label={translate("crm.followup.fields.next_action_date")}
            value={nextActionDate}
            onChange={setNextActionDate}
            required
          />
        </>
      ) : null}
    </FollowUpDialog>
  );
};

/** Statuses the salesperson can pick; closing ones have their own buttons. */
const StageSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const translate = useTranslate();
  const { dealStages } = useConfigurationContext();
  const items = dealStages
    .filter((stage) => !isGuardedStage(stage.value))
    .map((stage) => ({ value: stage.value, label: stage.label }));
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="followup-stage" className="text-base">
        {translate("resources.deals.fields.stage")}
      </Label>
      <Select
        value={value}
        onValueChange={(newValue) => newValue && onChange(newValue)}
        items={items}
      >
        <SelectTrigger id="followup-stage" className="w-full h-12 text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="text-base"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const NextActionDialog = ({
  deal,
  open,
  onOpenChange,
}: DealDialogProps) => {
  const translate = useTranslate();
  const { save } = useDealUpdater();
  const today = useToday();
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState(today);

  useEffect(() => {
    if (!open) return;
    setNextAction(deal.next_action ?? "");
    setNextActionDate(deal.next_action_date ?? today);
  }, [open, deal, today]);

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.next_action_title")}
      description={deal.name}
      canSave={!!nextAction.trim() && !!nextActionDate}
      onSave={() =>
        save(
          deal,
          {
            next_action: nextAction.trim(),
            next_action_date: nextActionDate,
          },
          translate("crm.followup.messages.saved"),
        )
      }
    >
      <TextField
        id="next-action"
        label={translate("crm.followup.fields.next_action")}
        value={nextAction}
        onChange={setNextAction}
        required
      />
      <TextField
        id="next-action-date"
        type="date"
        label={translate("crm.followup.fields.next_action_date")}
        value={nextActionDate}
        onChange={setNextActionDate}
        required
      />
    </FollowUpDialog>
  );
};

export const PauseDialog = ({ deal, open, onOpenChange }: DealDialogProps) => {
  const translate = useTranslate();
  const { save } = useDealUpdater();
  const today = useToday();
  const [resumeDate, setResumeDate] = useState(addDays(today, 30));

  useEffect(() => {
    if (open) setResumeDate(addDays(today, 30));
  }, [open, today]);

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.pause_title")}
      description={translate("crm.followup.dialogs.pause_help")}
      saveLabel={translate("crm.followup.actions.pause")}
      canSave={!!resumeDate && resumeDate > today}
      onSave={() =>
        save(
          deal,
          pausePatch(resumeDate),
          translate("crm.followup.messages.paused"),
        )
      }
    >
      <TextField
        id="resume-date"
        type="date"
        label={translate("crm.followup.fields.resume_date")}
        value={resumeDate}
        onChange={setResumeDate}
        required
      />
    </FollowUpDialog>
  );
};

export const WonDialog = ({ deal, open, onOpenChange }: DealDialogProps) => {
  const translate = useTranslate();
  const { save } = useDealUpdater();
  const today = useToday();
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(today);
  const [poUrl, setPoUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setPoNumber(deal.po_number ?? "");
    setPoDate(deal.po_date ?? today);
    setPoUrl(deal.po_url ?? "");
  }, [open, deal, today]);

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.won_title")}
      description={translate("crm.followup.dialogs.won_help")}
      saveLabel={translate("crm.followup.actions.won")}
      canSave={!!poNumber.trim() && !!poDate}
      onSave={() =>
        save(
          deal,
          wonPatch({ poNumber, poDate, poUrl }),
          translate("crm.followup.messages.won"),
        )
      }
    >
      <TextField
        id="po-number"
        label={translate("crm.followup.fields.po_number")}
        value={poNumber}
        onChange={setPoNumber}
        required
      />
      <TextField
        id="po-date"
        type="date"
        label={translate("crm.followup.fields.po_date")}
        value={poDate}
        onChange={setPoDate}
        required
      />
      <TextField
        id="po-url"
        type="url"
        label={translate("crm.followup.fields.po_url")}
        value={poUrl}
        onChange={setPoUrl}
      />
    </FollowUpDialog>
  );
};

export const LostDialog = ({ deal, open, onOpenChange }: DealDialogProps) => {
  const translate = useTranslate();
  const { save } = useDealUpdater();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason(deal.lost_reason ?? "");
  }, [open, deal]);

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.lost_title")}
      description={translate("crm.followup.dialogs.lost_help")}
      saveLabel={translate("crm.followup.actions.lost")}
      canSave={!!reason.trim()}
      onSave={() =>
        save(deal, lostPatch(reason), translate("crm.followup.messages.lost"))
      }
    >
      <TextAreaField
        id="lost-reason"
        label={translate("crm.followup.fields.lost_reason")}
        value={reason}
        onChange={setReason}
        required
      />
    </FollowUpDialog>
  );
};

export const QuoteDialog = ({ deal, open, onOpenChange }: DealDialogProps) => {
  const translate = useTranslate();
  const { save } = useDealUpdater();
  const [quoteUrl, setQuoteUrl] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteSentDate, setQuoteSentDate] = useState("");
  const [currency, setCurrency] = useState<DealCurrency>(getDealCurrency(deal));

  useEffect(() => {
    if (!open) return;
    setCurrency(getDealCurrency(deal));
    setQuoteUrl(deal.quote_url ?? "");
    setQuoteNumber(deal.quote_number ?? "");
    setQuoteAmount(deal.quote_amount != null ? String(deal.quote_amount) : "");
    setQuoteSentDate(deal.quote_sent_date ?? "");
  }, [open, deal]);

  return (
    <FollowUpDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("crm.followup.dialogs.quote_title")}
      description={deal.name}
      onSave={() =>
        save(
          deal,
          {
            quote_url: quoteUrl.trim() || null,
            quote_number: quoteNumber.trim() || null,
            quote_amount: quoteAmount === "" ? null : Math.round(+quoteAmount),
            // One capture: the current quote is the deal's amount
            ...(quoteAmount === "" ? {} : { amount: Math.round(+quoteAmount) }),
            currency,
            quote_sent_date: quoteSentDate || null,
            // Registering the price of a deal to quote sends it to authorization
            ...(deal.stage === STAGE_TO_QUOTE && quoteAmount !== ""
              ? { stage: STAGE_TO_AUTHORIZE }
              : {}),
          },
          translate("crm.followup.messages.saved"),
        )
      }
    >
      <TextField
        id="quote-url"
        type="url"
        label={translate("crm.followup.fields.quote_url")}
        value={quoteUrl}
        onChange={setQuoteUrl}
      />
      <TextField
        id="quote-number"
        label={translate("crm.followup.fields.quote_number")}
        value={quoteNumber}
        onChange={setQuoteNumber}
      />
      <ChoiceButtons
        label={translate("resources.deals.fields.currency")}
        options={DEAL_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={currency}
        onChange={setCurrency}
      />
      <TextField
        id="quote-amount"
        type="number"
        label={translate("crm.followup.fields.quote_amount")}
        value={quoteAmount}
        onChange={setQuoteAmount}
      />
      <TextField
        id="quote-sent-date"
        type="date"
        label={translate("crm.followup.fields.quote_sent_date")}
        value={quoteSentDate}
        onChange={setQuoteSentDate}
      />
    </FollowUpDialog>
  );
};
