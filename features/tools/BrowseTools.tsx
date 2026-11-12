"use client";

import { LocateFixed, Search, SearchX, X } from "lucide-react";
import { distanceKm, useGeolocation } from "@/features/location/hooks";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category } from "@/shared/lib/format";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Field";
import { EmptyState } from "@/shared/ui/PageHeader";
import { CardGridSkeleton } from "@/shared/ui/Skeleton";
import { CategoryFilter } from "./CategoryFilter";
import { useBrowseTools } from "./hooks";
import { ToolCard } from "./ToolCard";

export function BrowseTools() {
  const [category, setCategory] = useState<Category | undefined>();
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const tools = useBrowseTools(category);
  // Links from emails and notifications (/tools?tool=...) open that tool's details.
  const openId = useSearchParams().get("tool");
  const geo = useGeolocation();
  const here = geo.state.status === "ready" ? geo.state.coords : null;

  const visible = useMemo(() => {
    if (!tools) return undefined;
    const q = query.trim().toLowerCase();
    const list = tools.filter(
      (t) =>
        (!availableOnly || t.availability.state === "available") &&
        (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
    if (!here) return list;
    // Nearest first; tools without a location go last.
    const d = (t: (typeof list)[number]) => (t.location ? distanceKm(here, t.location) : Infinity);
    return [...list].sort((a, b) => d(a) - d(b));
  }, [tools, query, availableOnly, here]);

  const filtered = query.trim() !== "" || availableOnly || category !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search drills, ladders, tents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search tools"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 select-none">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="size-4 cursor-pointer rounded border-zinc-300 accent-brand-700"
          />
          Available now
        </label>
        {here ? (
          <Button variant="subtle" onClick={geo.reset} title="Stop sorting by distance">
            <LocateFixed /> Nearest first <X className="text-brand-700/60" />
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => geo.locate()} loading={geo.state.status === "locating"}>
            {geo.state.status !== "locating" && <LocateFixed />} Near me
          </Button>
        )}
      </div>
      {geo.state.status === "error" && (
        <p className="-mt-3 text-sm text-red-700" role="alert">
          {geo.state.message}
        </p>
      )}

      <CategoryFilter value={category} onChange={setCategory} />

      {visible === undefined ? (
        <CardGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={filtered ? "No tools match" : "Nothing listed yet"}
          action={
            filtered ? (
              <div className="flex flex-wrap justify-center gap-2">
              {query.trim() && (
                <ButtonLink href={`/wanted?new=${encodeURIComponent(query.trim())}`}>
                  Post a request for &ldquo;{query.trim()}&rdquo;
                </ButtonLink>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setAvailableOnly(false);
                  setCategory(undefined);
                }}
              >
                Clear filters
              </Button>
              </div>
            ) : undefined
          }
        >
          {filtered
            ? "Nobody has listed one yet. Post a request and neighbours who have one can offer it."
            : "When neighbours list tools, they'll appear here."}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {visible.length} {visible.length === 1 ? "tool" : "tools"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tool) => (
              <ToolCard key={tool._id} tool={tool} from={here} defaultOpen={tool._id === openId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
