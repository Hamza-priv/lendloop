"use client";

import { ArrowRight, BadgeCheck, CalendarDays, Check, MessageCircle, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStartAboutLoan } from "@/features/messages/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { formatDate, formatRange, type LoanStatus } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { LocationPanel } from "@/features/location/LocationPanel";
import { ActivityList } from "./ActivityList";
import { type LoanView, useLoanActions } from "./hooks";

const STATUS: Record<LoanStatus, { tone: Tone; label: string }> = {
  requested: { tone: "amber", label: "Pending" },
  approved: { tone: "green", label: "Approved" },
  declined: { tone: "red", label: "Declined" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  returned: { tone: "blue", label: "Returned" },
};

const ADMIN_VERB: Record<LoanStatus, string> = {
  requested: "asked to borrow from",
  approved: "is borrowing from",
  returned: "borrowed from",
  declined: "asked to borrow from",
  cancelled: "asked to borrow from",
};

type Props = { loan: LoanView; perspective: "borrower" | "lender" | "admin" };

export function LoanCard({ loan, perspective }: Props) {
  const actions = useLoanActions();
  const confirm = useConfirm();
  const router = useRouter();
  const startChat = useStartAboutLoan();
  const [busy, setBusy] = useState<string | null>(null);

  async function openChat() {
    setBusy("chat");
    try {
      router.push(`/messages?c=${await startChat({ loanId: loan._id })}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  }

  async function run(
    key: string,
    action: (args: { loanId: LoanView["_id"] }) => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    try {
      await action({ loanId: loan._id });
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    const ok = await confirm({
      title: "Decline this request?",
      description: `${loan.borrower.name} will be told the ${loan.tool.name} isn't available for these dates.`,
      confirmLabel: "Decline",
      cancelLabel: "Go back",
    });
    if (ok) await run("decline", actions.decline, "Request declined");
  }

  async function cancel() {
    const ok = await confirm({
      title: "Cancel your request?",
      description: `${loan.lender.name} will be notified.`,
      confirmLabel: "Cancel request",
      cancelLabel: "Keep request",
    });
    if (ok) await run("cancel", actions.cancel, "Request cancelled");
  }

  const status = STATUS[loan.status];
  const person =
    perspective === "borrower"
      ? { label: "Lent by", name: loan.lender.name, trusted: loan.lender.trustedLender }
      : perspective === "lender"
        ? { label: "Requested by", name: loan.borrower.name, trusted: false }
        : null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          {loan.tool.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads from Convex storage
            <img src={loan.tool.imageUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" />
          ) : (
            <CategoryTile category={loan.tool.category} />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-zinc-950">{loan.tool.name}</h3>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              {loan.overdue && (
                <Badge tone="red" dot>
                  Overdue
                </Badge>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-zinc-600">
              <CalendarDays className="size-3.5 text-zinc-400" />
              {formatRange(loan.startDate, loan.endDate)}
            </p>
            {person ? (
              <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                {person.label}
                <Avatar name={person.name} size="xs" />
                <span className="font-medium text-zinc-700">{person.name}</span>
                {person.trusted && <BadgeCheck className="size-3.5 text-brand-700" aria-label="Trusted Lender" />}
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
                <Avatar name={loan.borrower.name} size="xs" />
                <span className="font-medium text-zinc-700">{loan.borrower.name}</span>
                {ADMIN_VERB[loan.status]}
                <Avatar name={loan.lender.name} size="xs" />
                <span className="font-medium text-zinc-700">{loan.lender.name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          {perspective !== "admin" && (
            <Button size="sm" variant="ghost" onClick={openChat} loading={busy === "chat"} aria-label={`Message ${person?.name ?? ""}`}>
              {busy !== "chat" && <MessageCircle />} Message
            </Button>
          )}
          {perspective === "lender" && loan.status === "requested" && (
            <>
              <Button
                size="sm"
                variant="secondary"
                loading={busy === "decline"}
                disabled={busy !== null}
                onClick={decline}
              >
                {busy !== "decline" && <X />} Decline
              </Button>
              <Button
                size="sm"
                loading={busy === "approve"}
                disabled={busy !== null}
                onClick={() => run("approve", actions.approve, "Request approved")}
              >
                {busy !== "approve" && <Check />} Approve
              </Button>
            </>
          )}
          {perspective === "lender" && loan.status === "approved" && (
            <Button
              size="sm"
              variant="secondary"
              loading={busy === "return"}
              onClick={() => run("return", actions.markReturned, "Marked as returned")}
            >
              {busy !== "return" && <RotateCcw />} Mark returned
            </Button>
          )}
          {perspective === "borrower" && loan.status === "requested" && (
            <Button size="sm" variant="secondary" loading={busy === "cancel"} onClick={cancel}>
              Cancel request
            </Button>
          )}
          {perspective === "borrower" && loan.status === "approved" && !loan.overdue && (
            <span className="flex items-center gap-1 text-sm text-zinc-500">
              Return by {formatDate(loan.endDate)} <ArrowRight className="size-3.5" />
            </span>
          )}
        </div>
      </div>
      {perspective === "borrower" && loan.status === "approved" && (
        <div className="mt-4">
          <LocationPanel
            location={loan.tool.location}
            emptyText={`${loan.lender.name} didn't add a pickup location. Arrange collection with them directly.`}
            mapClassName="h-44"
          />
        </div>
      )}
      {loan.activity.length > 0 && (
        <div className="mt-4">
          <ActivityList activity={loan.activity} />
        </div>
      )}
    </Card>
  );
}

