"use client";

import { LayoutGrid } from "lucide-react";
import { CategoryIcon } from "@/shared/lib/categories";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/shared/lib/format";

type Props = { value?: Category; onChange: (value?: Category) => void };

export function CategoryFilter({ value, onChange }: Props) {
  const pill = (active: boolean) =>
    `inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
    }`;

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      role="group"
      aria-label="Filter by category"
    >
      <button type="button" className={pill(value === undefined)} onClick={() => onChange(undefined)} aria-pressed={value === undefined}>
        <LayoutGrid className="size-3.5" /> All
      </button>
      {CATEGORIES.map((c) => (
        <button type="button" key={c} className={pill(value === c)} onClick={() => onChange(c)} aria-pressed={value === c}>
          <CategoryIcon category={c} className="size-3.5" />
          {CATEGORY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}
