import { BellRing, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

const POINTS = [
  { icon: Users, text: "Borrow from people on your street" },
  { icon: BellRing, text: "Automatic request and overdue reminders" },
  { icon: ShieldCheck, text: "Your contact details stay private" },
];

/** Two-column layout for the Clerk sign-in and sign-up pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid flex-1 bg-zinc-50 lg:grid-cols-2 lg:gap-4 lg:p-4">
      <div className="relative hidden overflow-hidden rounded-3xl bg-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="size-9 bg-white/10 ring-1 ring-white/20" />
          <span className="text-lg font-semibold text-white">LendLoop</span>
        </div>
        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold tracking-tight text-white">
            The tool you need is probably next door.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-brand-100">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <p.icon className="size-4 text-white" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200/80">Borrow what you need. Lend what you don&apos;t.</p>
      </div>
      <div className="flex items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </main>
  );
}
