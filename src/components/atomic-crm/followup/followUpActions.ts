import type { DataProvider, Identifier } from "ra-core";

import type { Deal, DealActivity, DealActivityChannel } from "../types";
import {
  planAfterAttempt,
  STAGE_FOLLOW_UP,
  STAGE_LOST,
  STAGE_PAUSED,
  STAGE_WON,
  type AttemptOutcome,
} from "./followUpRules";

export interface ContactAttemptInput {
  channel: DealActivityChannel;
  answered: boolean;
  notes?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  /** New status, applied only when the client answered. */
  stage?: string | null;
}

/**
 * Records a contact attempt in the history, then applies the follow-up rules
 * to the deal (next attempt in a week, review after three unanswered ones).
 */
export const recordContactAttempt = async ({
  dataProvider,
  deal,
  input,
  salesId,
  today,
  retryActionLabel,
}: {
  dataProvider: DataProvider;
  deal: Deal;
  input: ContactAttemptInput;
  salesId: Identifier | undefined;
  today: string;
  retryActionLabel: string;
}): Promise<AttemptOutcome> => {
  const { data: previousActivities } = await dataProvider.getList<DealActivity>(
    "deal_activities",
    {
      filter: { deal_id: deal.id },
      sort: { field: "date", order: "DESC" },
      pagination: { page: 1, perPage: 50 },
    },
  );

  await dataProvider.create<DealActivity>("deal_activities", {
    data: {
      deal_id: deal.id,
      sales_id: salesId,
      date: new Date().toISOString(),
      channel: input.channel,
      answered: input.answered,
      notes: input.notes?.trim() || null,
    },
  });

  const outcome = planAfterAttempt({
    deal,
    previousActivities,
    attempt: input,
    today,
    retryActionLabel,
  });

  await dataProvider.update<Deal>("deals", {
    id: deal.id,
    data: { ...outcome.patch, updated_at: new Date().toISOString() },
    previousData: deal,
  });

  return outcome;
};

// Patches for the other follow-up decisions. They only touch follow-up fields,
// so the rest of the deal is left as the user entered it.

export const pausePatch = (resumeDate: string): Partial<Deal> => ({
  stage: STAGE_PAUSED,
  resume_date: resumeDate,
  next_action: null,
  next_action_date: null,
});

export const resumePatch = ({
  today,
  actionLabel,
}: {
  today: string;
  actionLabel: string;
}): Partial<Deal> => ({
  stage: STAGE_FOLLOW_UP,
  resume_date: null,
  next_action: actionLabel,
  next_action_date: today,
  attempts_reset_at: new Date().toISOString(),
});

/** Andrés decides to keep trying after a review: the counter starts over. */
export const keepTryingPatch = ({
  today,
  actionLabel,
}: {
  today: string;
  actionLabel: string;
}): Partial<Deal> => ({
  stage: STAGE_FOLLOW_UP,
  next_action: actionLabel,
  next_action_date: today,
  attempts_reset_at: new Date().toISOString(),
});

export const wonPatch = ({
  poNumber,
  poDate,
  poUrl,
}: {
  poNumber: string;
  poDate: string;
  poUrl?: string | null;
}): Partial<Deal> => ({
  stage: STAGE_WON,
  po_number: poNumber.trim(),
  po_date: poDate,
  po_url: poUrl?.trim() || null,
  next_action: null,
  next_action_date: null,
});

export const lostPatch = (reason: string): Partial<Deal> => ({
  stage: STAGE_LOST,
  lost_reason: reason.trim(),
  next_action: null,
  next_action_date: null,
});
