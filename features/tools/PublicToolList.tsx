"use client";

import { PackageOpen } from "lucide-react";
import { CategoryTile } from "@/shared/lib/categories";
import { CATEGORY_LABELS } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton";
import { usePublicTools } from "./hooks";

/** Signed-out view: tool name and category only, never owner details. */
export function PublicToolList() {
  const tools = usePublicTools();

  if (tools === undefined) {
    return (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading tools">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-4">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (tools.length === 0) {
    return (
      <EmptyState icon={<PackageOpen />} title="Nothing listed yet">
        Be the first neighbour to share a tool.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li
          key={tool._id}
          className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <CategoryTile category={tool.category} />
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{tool.name}</p>
            <p className="text-sm text-zinc-500">{CATEGORY_LABELS[tool.category]}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
