import {
  Drill,
  Hammer,
  Package,
  Sprout,
  Tent,
  UtensilsCrossed,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./format";

// Record<Category, ...> fails to compile if a category is added to the schema but not here.
const STYLE: Record<Category, { icon: LucideIcon; tile: string }> = {
  power_tools: { icon: Drill, tile: "bg-orange-50 text-orange-600 ring-orange-100" },
  hand_tools: { icon: Hammer, tile: "bg-slate-100 text-slate-600 ring-slate-200" },
  garden: { icon: Sprout, tile: "bg-lime-50 text-lime-700 ring-lime-100" },
  kitchen: { icon: UtensilsCrossed, tile: "bg-rose-50 text-rose-600 ring-rose-100" },
  camping: { icon: Tent, tile: "bg-teal-50 text-teal-700 ring-teal-100" },
  cleaning: { icon: Sparkles, tile: "bg-sky-50 text-sky-600 ring-sky-100" },
  other: { icon: Package, tile: "bg-violet-50 text-violet-600 ring-violet-100" },
};

export function CategoryIcon({ category, className = "size-4" }: { category: Category; className?: string }) {
  const Icon = STYLE[category].icon;
  return <Icon className={className} aria-hidden />;
}

/** Coloured square with the category's icon, used as the visual for a tool. */
export function CategoryTile({ category, size = "md" }: { category: Category; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "size-9 rounded-lg" : size === "md" ? "size-11 rounded-xl" : "size-14 rounded-2xl";
  const icon = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";
  return (
    <span className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${dims} ${STYLE[category].tile}`}>
      <CategoryIcon category={category} className={icon} />
    </span>
  );
}
