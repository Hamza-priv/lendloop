"use client";

import { MapPin, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { CategoryTile } from "@/shared/lib/categories";
import { errorMessage } from "@/shared/lib/errors";
import { CATEGORY_LABELS, CONDITION_LABELS, formatDate } from "@/shared/lib/format";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Dialog } from "@/shared/ui/Dialog";
import { EmptyState } from "@/shared/ui/PageHeader";
import { ListSkeleton } from "@/shared/ui/Skeleton";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { type MyTool, useMyTools, useRemoveTool, useUpdateTool } from "./hooks";
import { ToolForm, toToolInput } from "./ToolForm";

function Listing({ tool }: { tool: MyTool }) {
  const update = useUpdateTool();
  const remove = useRemoveTool();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const ok = await confirm({
      title: `Delete "${tool.name}"?`,
      description: "It disappears from browse right away. Any pending requests for it are declined.",
      confirmLabel: "Delete listing",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await remove({ toolId: tool._id });
      toast.success("Listing deleted");
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {tool.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads from Convex storage
          <img src={tool.images[0].url} alt="" className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" />
        ) : (
          <CategoryTile category={tool.category} />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-zinc-950">{tool.name}</h3>
            <AvailabilityBadge availability={tool.availability} />
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            {CATEGORY_LABELS[tool.category]} · {CONDITION_LABELS[tool.condition]} condition
            {tool.upcoming.length > 0 &&
              ` · Next booking ${formatDate(tool.upcoming[0].startDate)}`}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="size-3.5" />
            {tool.location ? tool.location.label || "Pickup pin set" : "No pickup location. Edit to add one."}
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} loading={deleting}>
          {!deleting && <Trash2 />} Delete
        </Button>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit listing" size="lg">
        <ToolForm
          idPrefix={`edit-${tool._id}`}
          initial={{
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            description: tool.description,
            location: tool.location ?? null,
            images: tool.images,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await update({ toolId: tool._id, ...toToolInput(values) });
            toast.success("Listing updated");
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Dialog>
    </Card>
  );
}

export function MyListings() {
  const tools = useMyTools();
  if (tools === undefined) return <ListSkeleton />;
  if (tools.length === 0) {
    return (
      <EmptyState
        icon={<PackagePlus />}
        title="You haven't listed anything yet"
        action={
          <ButtonLink href="/tools/new">
            <Plus /> List your first tool
          </ButtonLink>
        }
      >
        Share something you rarely use. You approve every request.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      {tools.map((t) => (
        <Listing key={t._id} tool={t} />
      ))}
    </div>
  );
}
