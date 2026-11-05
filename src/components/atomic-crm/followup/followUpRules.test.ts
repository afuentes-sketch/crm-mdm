import { describe, expect, it } from "vitest";

import type { Deal, DealActivity } from "../types";
import {
  addDays,
  countConsecutiveUnanswered,
  endOfMonth,
  endOfWeek,
  getFollowUpGroup,
  getReminders,
  planAfterAttempt,
  STAGE_FOLLOW_UP,
  STAGE_PAUSED,
  STAGE_PENDING_REVIEW,
} from "./followUpRules";

// Thursday
const TODAY = "2026-11-05";

const activity = (
  id: number,
  date: string,
  answered: boolean,
): DealActivity => ({
  id,
  deal_id: 1,
  date: `${date}T10:00:00.000Z`,
  channel: "call",
  answered,
});

const deal = (overrides: Partial<Deal> = {}): Deal => ({
  id: 1,
  name: "Conveyor line",
  company_id: 1,
  contact_ids: [],
  categories: [],
  stage: STAGE_FOLLOW_UP,
  description: "",
  amount: 0,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  expected_closing_date: "2026-12-01",
  sales_id: 2,
  index: 0,
  ...overrides,
});

const plan = (
  previousActivities: DealActivity[],
  answered: boolean,
  dealOverrides: Partial<Deal> = {},
) =>
  planAfterAttempt({
    deal: deal(dealOverrides),
    previousActivities,
    attempt: {
      answered,
      nextAction: "Send the quote",
      nextActionDate: "2026-11-10",
    },
    today: TODAY,
    retryActionLabel: "Try again",
  });

describe("date helpers", () => {
  it("computes week and month boundaries with weeks starting on Monday", () => {
    expect(endOfWeek(TODAY)).toBe("2026-11-08");
    expect(endOfWeek("2026-11-08")).toBe("2026-11-08");
    expect(endOfMonth(TODAY)).toBe("2026-11-30");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("countConsecutiveUnanswered", () => {
  it("counts unanswered attempts since the last answer, whatever the order", () => {
    const history = [
      activity(1, "2026-10-01", false),
      activity(2, "2026-10-08", true),
      activity(4, "2026-10-22", false),
      activity(3, "2026-10-15", false),
    ];

    expect(countConsecutiveUnanswered(history)).toBe(2);
  });

  it("ignores attempts made before the counter was reset", () => {
    const history = [
      activity(1, "2026-10-01", false),
      activity(2, "2026-10-08", false),
      activity(3, "2026-10-20", false),
    ];

    expect(
      countConsecutiveUnanswered(history, "2026-10-10T00:00:00.000Z"),
    ).toBe(1);
  });
});

describe("planAfterAttempt", () => {
  it("plans the next attempt one week later when the client does not answer", () => {
    const outcome = plan([], false);

    expect(outcome.unansweredCount).toBe(1);
    expect(outcome.sentToReview).toBe(false);
    expect(outcome.patch).toEqual({
      next_action: "Try again",
      next_action_date: "2026-11-12",
    });
  });

  it("sends the deal to review on the third unanswered attempt in a row", () => {
    const history = [
      activity(1, "2026-10-22", false),
      activity(2, "2026-10-29", false),
    ];

    const outcome = plan(history, false);

    expect(outcome.unansweredCount).toBe(3);
    expect(outcome.sentToReview).toBe(true);
    expect(outcome.patch).toEqual({
      stage: STAGE_PENDING_REVIEW,
      next_action: null,
      next_action_date: null,
    });
  });

  it("does not send to review again after Andres chose to keep trying", () => {
    const history = [
      activity(1, "2026-10-08", false),
      activity(2, "2026-10-15", false),
      activity(3, "2026-10-22", false),
    ];

    const outcome = plan(history, false, {
      attempts_reset_at: "2026-10-23T00:00:00.000Z",
    });

    expect(outcome.unansweredCount).toBe(1);
    expect(outcome.sentToReview).toBe(false);
  });

  it("resets the counter and keeps the chosen next action when the client answers", () => {
    const history = [
      activity(1, "2026-10-22", false),
      activity(2, "2026-10-29", false),
    ];

    const outcome = plan(history, true);

    expect(outcome.unansweredCount).toBe(0);
    expect(outcome.patch).toEqual({
      next_action: "Send the quote",
      next_action_date: "2026-11-10",
    });
  });

  it("applies the status chosen while registering an answered contact", () => {
    const outcome = planAfterAttempt({
      deal: deal({ stage: "pending-quote" }),
      previousActivities: [],
      attempt: { answered: true, stage: "quote-sent" },
      today: TODAY,
      retryActionLabel: "Try again",
    });

    expect(outcome.patch.stage).toBe("quote-sent");
  });

  it("ignores a closing status chosen while registering a contact", () => {
    const outcome = planAfterAttempt({
      deal: deal({ stage: "negotiation" }),
      previousActivities: [],
      attempt: { answered: true, stage: "won" },
      today: TODAY,
      retryActionLabel: "Try again",
    });

    expect(outcome.patch.stage).toBeUndefined();
  });

  it("brings a deal under review back to follow-up when the client answers", () => {
    const outcome = plan([], true, { stage: STAGE_PENDING_REVIEW });

    expect(outcome.patch.stage).toBe(STAGE_FOLLOW_UP);
  });
});

describe("getFollowUpGroup", () => {
  it.each([
    [{ next_action_date: "2026-11-04" }, "overdue"],
    [{ next_action_date: TODAY }, "this_week"],
    [{ next_action_date: "2026-11-08" }, "this_week"],
    [{ next_action_date: "2026-11-20" }, "this_month"],
    [{ next_action_date: "2026-12-02" }, "later"],
    [{ next_action_date: null }, "no_action"],
    [{ stage: STAGE_PENDING_REVIEW }, "review"],
    [{ stage: STAGE_PAUSED, resume_date: "2026-12-01" }, "paused"],
    [{ stage: STAGE_PAUSED, resume_date: TODAY }, "resume"],
    [{ stage: "won" }, "closed"],
    [{ archived_at: "2026-11-01T00:00:00.000Z" }, "closed"],
  ] as const)("classifies %o as %s", (overrides, expected) => {
    expect(getFollowUpGroup(deal(overrides), TODAY)).toBe(expected);
  });
});

describe("getReminders", () => {
  const deals = [
    deal({ id: 1, next_action_date: TODAY }),
    deal({ id: 2, next_action_date: "2026-11-01" }),
    deal({ id: 3, next_action_date: "2026-11-01", reminders_muted: true }),
    deal({ id: 4, next_action_date: TODAY, sales_id: 9 }),
    deal({ id: 5, stage: STAGE_PENDING_REVIEW, sales_id: 9 }),
    deal({ id: 6, stage: STAGE_PAUSED, resume_date: "2026-11-02" }),
    deal({ id: 7, next_action_date: "2026-11-06" }),
  ];

  it("reminds the salesperson of their due, overdue and resumed deals, unless muted", () => {
    const reminders = getReminders({
      deals,
      salesId: 2,
      isAdmin: false,
      today: TODAY,
    });

    expect(reminders.map((r) => [r.deal.id, r.kind])).toEqual([
      [1, "due"],
      [2, "overdue"],
      [6, "resume"],
    ]);
  });

  it("shows the deals waiting for review to administrators only", () => {
    const reminders = getReminders({
      deals,
      salesId: 1,
      isAdmin: true,
      today: TODAY,
    });

    expect(reminders.map((r) => [r.deal.id, r.kind])).toEqual([[5, "review"]]);
  });
});
