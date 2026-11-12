import { AlarmClock, Bell, CircleAlert, Clock } from "lucide-react";
import { timeAgo } from "@/shared/lib/format";
import type { LoanView } from "./hooks";

const LABELS: Record<string, string> = {
  requested: "Request notification",
  approved: "Approval notification",
  declined: "Decline notification",
  cancelled: "Cancellation notification",
  returned: "Return notification",
};

function describe(a: LoanView["activity"][number]) {
  const what = a.kind === "reminder" ? "Overdue reminder" : (LABELS[a.label] ?? "Notification");
  if (a.status === "sent") return `${what} sent ${timeAgo(a.at)}`;
  if (a.status === "failed") return `${what} failed ${timeAgo(a.at)}`;
  return `${what} queued ${timeAgo(a.at)}`;
}

/** Recent automation activity on a loan, e.g. "Overdue reminder sent 2 days ago". */
export function ActivityList({ activity }: { activity: LoanView["activity"] }) {
  if (activity.length === 0) return null;
  return (
    <ul className="space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
      {activity.slice(0, 3).map((a, i) => {
        const failed = a.status === "failed";
        const Icon = failed ? CircleAlert : a.kind === "reminder" ? AlarmClock : a.status === "sent" ? Bell : Clock;
        return (
          <li key={i} className={`flex items-start gap-2 ${failed ? "text-red-700" : ""}`}>
            <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              {describe(a)}
              {a.error && <span className="text-red-600/80"> · {a.error}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
