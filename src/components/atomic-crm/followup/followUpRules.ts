import type { Identifier } from "ra-core";

import type { Deal, DealActivity } from "../types";

/** Route of the follow-up list; a deal opens at `${FOLLOW_UP_PATH}/:id`. */
export const FOLLOW_UP_PATH = "/seguimiento";

// Sales statuses, in the order a deal goes through them. The values are stored
// in the database and must match the configured deal stages
// (see defaultConfiguration.ts).
export const STAGE_TO_QUOTE = "to-quote";
export const STAGE_TO_AUTHORIZE = "to-authorize";
export const STAGE_READY_TO_SEND = "ready-to-send";
export const STAGE_SENT = "sent";
export const STAGE_IN_FOLLOW_UP = "follow-up";
export const STAGE_PAUSED = "paused";
export const STAGE_WON = "won";
export const STAGE_LOST = "lost";

/** First status of a new deal. */
export const STAGE_NEW = STAGE_TO_QUOTE;
/** Status of a deal whose client has been contacted after the quote. */
export const STAGE_FOLLOW_UP = STAGE_IN_FOLLOW_UP;

/** Statuses that ask for details (resume date, purchase order, reason). */
export const GUARDED_STAGES = [STAGE_PAUSED, STAGE_WON, STAGE_LOST] as const;

export const CLOSED_STAGES = [STAGE_WON, STAGE_LOST] as const;

/** Days to wait before the next attempt when the client did not answer. */
export const RETRY_DELAY_DAYS = 7;

export type FollowUpGroup =
  | "to_quote"
  | "to_authorize"
  | "ready_to_send"
  | "resume"
  | "overdue"
  | "this_week"
  | "this_month"
  | "later"
  | "no_action"
  | "paused"
  | "closed";

/** Display order of the groups in the follow-up list. */
export const ACTIVE_GROUPS: FollowUpGroup[] = [
  "resume",
  "overdue",
  "this_week",
  "to_authorize",
  "ready_to_send",
  "to_quote",
  "this_month",
  "later",
  "no_action",
];

/** Internal steps before the quote reaches the client. */
const STEP_GROUPS: Partial<Record<string, FollowUpGroup>> = {
  [STAGE_TO_QUOTE]: "to_quote",
  [STAGE_TO_AUTHORIZE]: "to_authorize",
  [STAGE_READY_TO_SEND]: "ready_to_send",
};

// Dates are handled as "YYYY-MM-DD" strings in the user's local time, which is
// how the date inputs and the `date` columns store them.
export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISODate = (value: string): Date => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (isoDate: string, days: number): string => {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

/** Sunday that ends the week (weeks start on Monday) of the given date. */
export const endOfWeek = (isoDate: string): string => {
  const date = parseISODate(isoDate);
  const daysUntilSunday = (7 - date.getDay()) % 7;
  return addDays(isoDate, daysUntilSunday);
};

export const endOfMonth = (isoDate: string): string => {
  const date = parseISODate(isoDate);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

export const isClosed = (deal: Pick<Deal, "stage">): boolean =>
  (CLOSED_STAGES as readonly string[]).includes(deal.stage);

export const isGuardedStage = (stage: string): boolean =>
  (GUARDED_STAGES as readonly string[]).includes(stage);

/** Activities newest first, whatever order they come in. */
export const sortActivities = (activities: DealActivity[]): DealActivity[] =>
  [...activities].sort((a, b) => b.date.localeCompare(a.date));

/**
 * Unanswered attempts since the last time the client answered. Derived from
 * the history so the counter can never drift from what was recorded.
 */
export const countConsecutiveUnanswered = (
  activities: DealActivity[],
  resetAt?: string | null,
): number => {
  let count = 0;
  for (const activity of sortActivities(activities)) {
    if (activity.answered) break;
    if (resetAt && new Date(activity.date) <= new Date(resetAt)) break;
    count += 1;
  }
  return count;
};

export const getLastActivity = (
  activities: DealActivity[],
): DealActivity | undefined => sortActivities(activities)[0];

export interface AttemptInput {
  answered: boolean;
  /** Next action chosen by the user (only used when the client answered). */
  nextAction?: string | null;
  nextActionDate?: string | null;
  /** New status chosen by the user (only used when the client answered). */
  stage?: string | null;
}

export interface AttemptOutcome {
  /** Fields to save on the deal after recording the attempt. */
  patch: Partial<Deal>;
  /** Unanswered attempts in a row, this one included. */
  unansweredCount: number;
}

/**
 * What happens to a deal once a contact attempt is recorded.
 * - A sent quote moves to "in follow-up" with its first contact, answered or
 *   not: something was done since sending it.
 * - Client answered: the counter resets, the user's next action and status
 *   are kept, and a paused deal goes back to follow-up.
 * - No answer: the next attempt is planned one week later.
 */
export const planAfterAttempt = ({
  deal,
  previousActivities,
  attempt,
  today,
  retryActionLabel,
}: {
  deal: Pick<Deal, "stage" | "attempts_reset_at">;
  previousActivities: DealActivity[];
  attempt: AttemptInput;
  today: string;
  retryActionLabel: string;
}): AttemptOutcome => {
  if (attempt.answered) {
    const isPaused = deal.stage === STAGE_PAUSED;
    // The status can change in the same step. Pause, won and lost keep
    // their dedicated dialogs.
    const chosenStage =
      attempt.stage && !isGuardedStage(attempt.stage) ? attempt.stage : null;
    const stage =
      chosenStage ??
      (isPaused || deal.stage === STAGE_SENT ? STAGE_FOLLOW_UP : null);
    return {
      patch: {
        next_action: attempt.nextAction?.trim() || null,
        next_action_date: attempt.nextActionDate || null,
        ...(stage && stage !== deal.stage ? { stage } : {}),
        ...(isPaused ? { resume_date: null } : {}),
      },
      unansweredCount: 0,
    };
  }

  return {
    patch: {
      next_action: retryActionLabel,
      next_action_date: addDays(today, RETRY_DELAY_DAYS),
      ...(deal.stage === STAGE_SENT ? { stage: STAGE_FOLLOW_UP } : {}),
    },
    unansweredCount:
      countConsecutiveUnanswered(previousActivities, deal.attempts_reset_at) +
      1,
  };
};

/** Group of a deal in the follow-up list, by priority. */
export const getFollowUpGroup = (
  deal: Pick<
    Deal,
    "stage" | "next_action_date" | "resume_date" | "archived_at"
  >,
  today: string,
): FollowUpGroup => {
  if (isClosed(deal) || deal.archived_at) return "closed";
  if (deal.stage === STAGE_PAUSED) {
    return deal.resume_date && deal.resume_date <= today ? "resume" : "paused";
  }
  const step = STEP_GROUPS[deal.stage];
  if (step) return step;
  // Sent or in follow-up: grouped by the date of the next contact
  if (!deal.next_action_date) return "no_action";
  if (deal.next_action_date < today) return "overdue";
  if (deal.next_action_date <= endOfWeek(today)) return "this_week";
  if (deal.next_action_date <= endOfMonth(today)) return "this_month";
  return "later";
};

export interface Reminder {
  deal: Deal;
  kind: "due" | "overdue" | "resume" | "authorize" | "send";
}

/**
 * Reminders shown in the bell.
 * - Administrators: the quotes waiting for their authorization.
 * - The person in charge (unless muted): quotes ready to send, follow-ups due
 *   today or overdue, and paused deals whose resume date has come.
 */
export const getReminders = ({
  deals,
  salesId,
  isAdmin,
  today,
}: {
  deals: Deal[];
  salesId: Identifier | undefined;
  isAdmin: boolean;
  today: string;
}): Reminder[] => {
  const reminders: Reminder[] = [];
  for (const deal of deals) {
    const group = getFollowUpGroup(deal, today);
    if (group === "to_authorize") {
      if (isAdmin) reminders.push({ deal, kind: "authorize" });
      continue;
    }
    if (deal.sales_id !== salesId || deal.reminders_muted) continue;
    if (group === "ready_to_send") {
      reminders.push({ deal, kind: "send" });
    } else if (group === "resume") {
      reminders.push({ deal, kind: "resume" });
    } else if (group === "overdue") {
      reminders.push({ deal, kind: "overdue" });
    } else if (deal.next_action_date === today && group === "this_week") {
      reminders.push({ deal, kind: "due" });
    }
  }
  return reminders;
};
