"use client";

import { BadgeCheck, BellRing, CalendarClock, Check, ChevronRight, MapPin, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStartAboutTool } from "@/features/messages/hooks";
import { errorMessage } from "@/shared/lib/errors";
import { useState } from "react";
import { distanceKm, formatDistance, type Coords } from "@/features/location/hooks";
import { LocationPanel } from "@/features/location/LocationPanel";
import { CategoryTile } from "@/shared/lib/categories";
import { CATEGORY_LABELS, CONDITION_LABELS, formatRange } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Dialog } from "@/shared/ui/Dialog";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { BorrowDialog } from "./BorrowDialog";
import { Gallery } from "./Gallery";
import { type BrowseTool, useWatchTool } from "./hooks";

type Props = { tool: BrowseTool; from?: Coords | null; defaultOpen?: boolean };

function Owner({ tool }: { tool: BrowseTool }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-600">
      <Avatar name={tool.owner.name} />
      <span className="truncate">{tool.isMine ? "You" : tool.owner.name}</span>
      {tool.owner.trustedLender && (
        <span title="Trusted Lender" className="text-brand-700">
          <BadgeCheck className="size-4" aria-label="Trusted Lender" />
        </span>
      )}
    </div>
  );
}

export function ToolCard({ tool, from, defaultOpen = false }: Props) {
  const [viewing, setViewing] = useState(defaultOpen);
  const router = useRouter();
  const startChat = useStartAboutTool();
  const watch = useWatchTool();
  const [opening, setOpening] = useState(false);
  const onLoan = tool.availability.state === "on_loan";

  async function messageOwner() {
    setOpening(true);
    try {
      const id = await startChat({ toolId: tool._id });
      router.push(`/messages?c=${id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setOpening(false);
    }
  }

  async function toggleWatch() {
    try {
      await watch({ toolId: tool._id, on: !tool.watching });
      toast.success(
        tool.watching ? "You won't be notified" : "We'll let you know",
        tool.watching ? undefined : { description: `You'll get a notification and an email when the ${tool.name} is back.` },
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  const [borrowing, setBorrowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const distance = from && tool.location ? distanceKm(from, tool.location) : null;

  const action = tool.isMine ? (
    <Badge>Your listing</Badge>
  ) : tool.myRequest || requested ? (
    <ButtonLink href="/requests" size="sm" variant="subtle">
      <Check /> {tool.myRequest?.status === "approved" ? "Approved" : "Requested"}
    </ButtonLink>
  ) : (
    <Button
      size="sm"
      onClick={() => {
        setViewing(false);
        setBorrowing(true);
      }}
    >
      Borrow
    </Button>
  );

  return (
    <Card className="group flex flex-col transition hover:border-zinc-300 hover:shadow-lift">
      <button
        type="button"
        onClick={() => setViewing(true)}
        className="flex flex-1 cursor-pointer flex-col rounded-t-xl p-5 pb-0 text-left"
        aria-label={`View details for ${tool.name}`}
      >
        {!tool.images[0] && (
          <div className="-mx-5 -mt-5 mb-4 flex aspect-[16/10] items-center justify-center rounded-t-xl bg-gradient-to-br from-zinc-50 to-zinc-100">
            <CategoryTile category={tool.category} size="lg" />
          </div>
        )}
        {tool.images[0] && (
          <div className="relative -mx-5 -mt-5 mb-4 aspect-[16/10] overflow-hidden rounded-t-xl bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- user uploads from Convex storage */}
            <img
              src={tool.images[0].url}
              alt={tool.name}
              loading="lazy"
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            {tool.images.length > 1 && (
              <span className="absolute right-2 bottom-2 rounded-md bg-zinc-900/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {tool.images.length} photos
              </span>
            )}
          </div>
        )}
        <div className="flex w-full items-start gap-3.5">
          <CategoryTile category={tool.category} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-zinc-950" title={tool.name}>
              {tool.name}
            </h3>
            <p className="text-sm text-zinc-500">
              {CATEGORY_LABELS[tool.category]} · {CONDITION_LABELS[tool.condition]} condition
            </p>
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <AvailabilityBadge availability={tool.availability} />
          {tool.watching && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <BellRing className="size-3.5" /> Watching
            </span>
          )}
          {tool.location && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="size-3.5" />
              {distance !== null ? formatDistance(distance) : "Pickup on map"}
            </span>
          )}
        </div>

        {tool.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600">{tool.description}</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400 italic">No description.</p>
        )}

        {tool.upcoming.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
            <CalendarClock className="mt-px size-3.5 shrink-0" />
            <span>Booked {tool.upcoming.map((r) => formatRange(r.startDate, r.endDate)).join(", ")}</span>
          </p>
        )}
      </button>

      <div className="px-5 pt-5 pb-5">
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <Owner tool={tool} />
          {action}
        </div>
      </div>

      <Dialog open={viewing} onClose={() => setViewing(false)} title={tool.name} size="lg">
        <div className="space-y-5">
          <Gallery images={tool.images} alt={tool.name} />
          <div className="flex items-start gap-3.5">
            <CategoryTile category={tool.category} size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-zinc-500">
                {CATEGORY_LABELS[tool.category]} · {CONDITION_LABELS[tool.condition]} condition
              </p>
              <AvailabilityBadge availability={tool.availability} />
            </div>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700">
            {tool.description || "The owner didn't add a description."}
          </p>

          {!tool.isMine && onLoan && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-900">
                {tool.watching
                  ? "We'll notify you in the app and by email when it's back."
                  : "On loan right now. Want to know the moment it's back?"}
              </p>
              <Button size="sm" variant={tool.watching ? "secondary" : "primary"} onClick={toggleWatch}>
                <BellRing /> {tool.watching ? "Stop notifying me" : "Notify me when it's back"}
              </Button>
            </div>
          )}

          {tool.upcoming.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <CalendarClock className="mt-0.5 size-4 shrink-0" />
              Already booked {tool.upcoming.map((r) => formatRange(r.startDate, r.endDate)).join(", ")}
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">Where to collect it</h3>
            <LocationPanel location={tool.location} from={from} mapClassName="h-60" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
            <Owner tool={tool} />
            <div className="flex items-center gap-2">
              {!tool.isMine && (
                <Button size="sm" variant="secondary" onClick={messageOwner} loading={opening}>
                  {!opening && <MessageCircle />} Message owner
                </Button>
              )}
              {action}
            </div>
          </div>
        </div>
      </Dialog>

      <BorrowDialog
        tool={tool}
        open={borrowing}
        onClose={() => setBorrowing(false)}
        onSuccess={() => {
          setBorrowing(false);
          setRequested(true);
        }}
      />
    </Card>
  );
}
