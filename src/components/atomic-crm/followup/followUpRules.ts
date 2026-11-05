import type { Identifier } from "ra-core";

import type { Deal, DealActivity } from "../types";

/** Route of the follow-up list; a deal opens at `${FOLLOW_UP_PATH}/:id`. */
export const FOLLOW_UP_PATH = "/seguimiento";

// Stage values with a follow-up meaning. They are stored in the database, so
// they must match the configured deal stages (see defaultConfiguration.ts).
export const STAGE_NEW = "new";
export const STAGE_FOLLOW_UP = "negotiation";
export const STAGE_PENDING_REVIEW = "pending-review";
export const STAGE_PAUSED = "paused";
export const STAGE_WON = "won";
export const STAGE_LOST = "lost";

/** Stages that can only be reached through a dedicated dialog. */
export const GUARDED_STAGES = [
  STAGE_PENDING_REVIEW,
  STAGE_PAUSED,
  STAGE_WON,
  STAGE_LOST,
] as const;

export const CLOSED_STAGES = [STAGE_WON, STAGE_LOST] as const;

/** Days to wait before the next attempt when the client did not answer. */
export const RETRY_DELAY_DAYS = 7;

/** Unanswered attempts in a row that send the deal to review. */
export const MAX_UNANSWERED_ATTEMPTS = 3;

export type FollowUpGroup =
  | "review"
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
  "review",
  "resume",
  "overdue",
  "this_week",
  "this_month",
  "later",
  "no_action",
];

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
  sentToReview: boolean;
}

/**
 * What happens to a deal once a contact attempt is recorded.
 * - Client answered: the counter resets and the user's next action is kept.
 * - No answer: the next attempt is planned one week later.
 * - Third unanswered attempt in a row: the deal goes to review and its
 *   reminders stop until Andrés decides what to do.
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
    const isOnHold =
      deal.stage === STAGE_PENDING_REVIEW || deal.stage === STAGE_PAUSED;
    // The status can change in the same step. Statuses with their own rules
    // (review, pause, won, lost) keep their dedicated dialogs.
    const chosenStage =
      attempt.stage && !isGuardedStage(attempt.stage) ? attempt.stage : null;
    // An answer brings a deal on hold back to the follow-up
    const stage = chosenStage ?? (isOnHold ? STAGE_FOLLOW_UP : null);
    return {
      patch: {
        next_action: attempt.nextAction?.trim() || null,
        next_action_date: attempt.nextActionDate || null,
        ...(stage && stage !== deal.stage ? { stage } : {}),
        ...(isOnHold ? { resume_date: null } : {}),
      },
      unansweredCount: 0,
      sentToReview: false,
    };
  }

  const unansweredCount =
    countConsecutiveUnanswered(previousActivities, deal.attempts_reset_at) + 1;
  if (unansweredCount >= MAX_UNANSWERED_ATTEMPTS) {
    return {
      patch: {
        stage: STAGE_PENDING_REVIEW,
        next_action: null,
        next_action_date: null,
      },
      unansweredCount,
      sentToReview: true,
    };
  }

  return {
    patch: {
      next_action: retryActionLabel,
      next_action_date: addDays(today, RETRY_DELAY_DAYS),
    },
    unansweredCount,
    sentToReview: false,
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
  if (deal.stage === STAGE_PENDING_REVIEW) return "review";
  if (!deal.next_action_date) return "no_action";
  if (deal.next_action_date < today) return "overdue";
  if (deal.next_action_date <= endOfWeek(today)) return "this_week";
  if (deal.next_action_date <= endOfMonth(today)) return "this_month";
  return "later";
};

export interface Reminder {
  deal: Deal;
  kind: "due" | "overdue" | "review" | "resume";
}

/**
 * Reminders shown in the bell. The person in charge is reminded of the deals
 * whose next action is due today or earlier (unless reminders are muted) and of
 * paused deals to resume. Administrators also see the deals waiting for review.
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
    if (group === "review") {
      if (isAdmin) reminders.push({ deal, kind: "review" });
      continue;
    }
    if (deal.sales_id !== salesId || deal.reminders_muted) continue;
    if (group === "resume") {
      reminders.push({ deal, kind: "resume" });
    } else if (group === "overdue") {
      reminders.push({ deal, kind: "overdue" });
    } else if (deal.next_action_date === today && group === "this_week") {
      reminders.push({ deal, kind: "due" });
    }
  }
  return reminders;
};
