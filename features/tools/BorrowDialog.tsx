"use client";

import { CalendarClock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { formatDate, formatRange, todayIso } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { Field, FormError, Input } from "@/shared/ui/Field";
import type { BrowseTool } from "./hooks";
import { useRequestLoan } from "./hooks";

const MAX_DAYS = 30;

function daysBetween(start: string, end: string) {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

type Props = { tool: BrowseTool; open: boolean; onClose: () => void; onSuccess: () => void };

export function BorrowDialog({ tool, open, onClose, onSuccess }: Props) {
  const requestLoan = useRequestLoan();
  const today = todayIso();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestLoan({ toolId: tool._id, startDate, endDate });
      toast.success("Request sent", { description: `${tool.owner.name} will be notified about ${tool.name}.` });
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Request to borrow">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <CategoryTile category={tool.category} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{tool.name}</p>
            <p className="text-xs text-zinc-500">Lent by {tool.owner.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From" htmlFor={`from-${tool._id}`}>
            <Input
              id={`from-${tool._id}`}
              type="date"
              required
              min={today}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
            />
          </Field>
          <Field label="Until" htmlFor={`until-${tool._id}`}>
            <Input
              id={`until-${tool._id}`}
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        <p className={`text-sm ${days > MAX_DAYS ? "text-red-700" : "text-zinc-500"}`}>
          {days > 0
            ? `${days} ${days === 1 ? "day" : "days"}, returning ${formatDate(endDate)}.`
            : "Pick your dates."}{" "}
          Up to {MAX_DAYS} days per loan.
        </p>

        {tool.upcoming.length > 0 && (
          <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <CalendarClock className="mt-0.5 size-4 shrink-0" />
            <span>
              Already booked {tool.upcoming.map((r) => formatRange(r.startDate, r.endDate)).join(", ")}
            </span>
          </div>
        )}

        <FormError>{error}</FormError>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={days === 0 || days > MAX_DAYS}>
            Send request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
