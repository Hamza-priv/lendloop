import type { ReactNode } from "react";

export type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "violet";

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-zinc-100 text-zinc-700 ring-zinc-200", dot: "bg-zinc-400" },
  green: { pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  blue: { pill: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  violet: { pill: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
};

type Props = { tone?: Tone; dot?: boolean; icon?: ReactNode; children: ReactNode };

export function Badge({ tone = "neutral", dot = false, icon, children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3 ${tones[tone].pill}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${tones[tone].dot}`} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}
