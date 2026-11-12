import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-zinc-200/80 bg-white shadow-card ${className}`} {...props} />;
}
