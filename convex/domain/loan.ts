// Pure loan rules: no database access, easy to unit test.
import type { Doc } from "../_generated/dataModel";
import { domainError } from "./errors";

export type LoanStatus = Doc<"loans">["status"];
export type LoanEventType = Extract<Doc<"outbox">["payload"], { loan: unknown }>["type"];

export const MAX_LOAN_DAYS = 30;
export const MAX_DAYS_AHEAD = 90;

const TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  requested: ["approved", "declined", "cancelled"],
  approved: ["returned"],
  declined: [],
  cancelled: [],
  returned: [],
};

export function assertTransition(from: LoanStatus, to: LoanStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw domainError("CONFLICT", `A ${from} loan cannot be marked ${to}.`);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayUtc(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function isValidDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validateDateRange(startDate: string, endDate: string, today: string) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw domainError("INVALID_INPUT", "Dates must be in YYYY-MM-DD format.");
  }
  if (startDate < today) {
    throw domainError("INVALID_INPUT", "The loan cannot start in the past.");
  }
  if (endDate < startDate) {
    throw domainError("INVALID_INPUT", "The end date must be on or after the start date.");
  }
  if (daysBetween(startDate, endDate) + 1 > MAX_LOAN_DAYS) {
    throw domainError("INVALID_INPUT", `A loan can last at most ${MAX_LOAN_DAYS} days.`);
  }
  if (daysBetween(today, startDate) > MAX_DAYS_AHEAD) {
    throw domainError("INVALID_INPUT", `Loans can be booked at most ${MAX_DAYS_AHEAD} days ahead.`);
  }
}

/** Both ranges are inclusive. */
export function rangesOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function isOverdue(loan: Pick<Doc<"loans">, "status" | "endDate">, today: string) {
  return loan.status === "approved" && loan.endDate < today;
}

/** An approved, unreturned loan that has started means the tool is out right now. */
export function isActiveOnDate(loan: Pick<Doc<"loans">, "status" | "startDate">, today: string) {
  return loan.status === "approved" && loan.startDate <= today;
}

export const EVENT_FOR_STATUS: Record<LoanStatus, LoanEventType> = {
  requested: "loan.requested",
  approved: "loan.approved",
  declined: "loan.declined",
  cancelled: "loan.cancelled",
  returned: "loan.returned",
};

/** Who needs to hear about this change: the other party to the action. */
export function recipientRole(type: LoanEventType): "lender" | "borrower" {
  return type === "loan.requested" || type === "loan.cancelled" ? "lender" : "borrower";
}

/** One reminder per loan per day. */
export function reminderKey(loanId: string, asOf: string) {
  return `${loanId}:${asOf}`;
}
