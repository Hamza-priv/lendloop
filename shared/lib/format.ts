import type { Doc } from "@/convex/_generated/dataModel";

export type Category = Doc<"tools">["category"];
export type Condition = Doc<"tools">["condition"];
export type LoanStatus = Doc<"loans">["status"];

// Record<Category, ...> makes TypeScript fail if a category is added to the schema but not here.
export const CATEGORY_LABELS: Record<Category, string> = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
export const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[];

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Nov 13 – Nov 15", or "Nov 13 (1 day)" when it starts and ends on the same day. */
export function formatRange(start: string, end: string) {
  return start === end ? `${formatDate(start)} (1 day)` : `${formatDate(start)} – ${formatDate(end)}`;
}

export function timeAgo(timestamp: number, now: number = Date.now()) {
  const minutes = Math.round((now - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
