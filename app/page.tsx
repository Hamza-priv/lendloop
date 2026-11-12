import { BellRing, CalendarCheck, Handshake, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { HeroActions } from "@/features/auth/HeroActions";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicToolList } from "@/features/tools/PublicToolList";
import { CategoryTile } from "@/shared/lib/categories";

const STEPS = [
  { icon: Search, title: "Find it nearby", text: "Browse what neighbours are lending and check when it's free." },
  { icon: CalendarCheck, title: "Request your dates", text: "Pick a date range. The owner approves or declines in one tap." },
  { icon: Handshake, title: "Borrow and return", text: "Collect it, use it, bring it back. Reminders keep everyone on time." },
];

const FEATURES = [
  { icon: BellRing, title: "Automatic reminders", text: "Lenders hear about new requests right away, and borrowers get a nudge when something is overdue." },
  { icon: UserRoundCheck, title: "Trusted Lenders", text: "Admins mark reliable neighbours with a badge, so you know who you're borrowing from." },
  { icon: ShieldCheck, title: "Private by default", text: "Visitors only see tool names. Contact details are never shown on the public page." },
];

function HeroVisual() {
  const cards = [
    { category: "power_tools" as const, name: "Cordless drill", meta: "Available", tone: "bg-emerald-500", pos: "top-0 left-6 rotate-[-4deg]" },
    { category: "garden" as const, name: "Hedge trimmer", meta: "Back on Fri", tone: "bg-amber-500", pos: "top-28 right-0 rotate-[3deg]" },
    { category: "camping" as const, name: "Two-person tent", meta: "Available", tone: "bg-emerald-500", pos: "top-56 left-0 rotate-[-2deg]" },
  ];
  return (
    <div className="relative mx-auto hidden h-[340px] w-full max-w-sm lg:block" aria-hidden>
      {cards.map((c) => (
        <div
          key={c.name}
          className={`absolute w-64 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-lift ${c.pos}`}
        >
          <div className="flex items-center gap-3">
            <CategoryTile category={c.category} />
            <div>
              <p className="font-medium text-zinc-900">{c.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className={`size-1.5 rounded-full ${c.tone}`} /> {c.meta}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -top-40 right-0 size-[520px] rounded-full bg-brand-100/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
              <span className="size-1.5 rounded-full bg-brand-600" /> Your neighbourhood&apos;s shared shed
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl lg:text-6xl">
              Borrow what you need.
              <span className="block text-brand-700">Lend what you don&apos;t.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-zinc-600">
              LendLoop helps neighbours share drills, ladders, tents and more. No buying things you&apos;ll use once,
              no cluttered garages.
            </p>
            <div className="mt-8">
              <HeroActions />
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="how">
        <p className="text-sm font-semibold text-brand-700">How it works</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 id="how" className="text-3xl font-semibold tracking-tight text-zinc-950">
            Three steps, no awkward knocking
          </h2>
          <ButtonLink href="/guide" variant="secondary">
            Read the full guide
          </ButtonLink>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="size-5" />
                </span>
                <span className="font-mono text-sm text-zinc-300">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold text-zinc-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-zinc-200/80 bg-white" aria-labelledby="available">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-700">Ready to borrow</p>
              <h2 id="available" className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                Available in the neighbourhood
              </h2>
            </div>
            <p className="text-sm text-zinc-500">Sign in to see availability and request dates.</p>
          </div>
          <PublicToolList />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <f.icon className="size-6 text-brand-700" />
              <h3 className="mt-4 font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-20 overflow-hidden rounded-3xl bg-brand-900 px-8 py-14 text-center sm:px-16">
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
          <h2 className="relative text-3xl font-semibold tracking-tight text-white">Got a tool gathering dust?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-brand-100">
            List it in under a minute. You stay in control of every request.
          </p>
          <div className="relative mt-8 flex justify-center [&_a:last-child]:text-white [&_a:last-child]:hover:bg-white/10">
            <HeroActions variant="band" />
          </div>
        </div>
      </section>
    </main>
  );
}
