import { BellRing, Leaf, Lock, ShieldCheck, Users, Workflow, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/shared/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description: "Why LendLoop exists, what we believe, and how it's built.",
};

const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Leaf, title: "Use less, share more", text: "The average drill is used for minutes in its whole life. Lending one saves money, space and the cost of making another." },
  { icon: Users, title: "Neighbours first", text: "Every loan is a small reason to say hello. LendLoop keeps the logistics easy so the friendly part can happen." },
  { icon: Lock, title: "Private by default", text: "Visitors see tool names only. Emails are never shown to anyone, and the assistant can't see them either." },
  { icon: ShieldCheck, title: "You stay in control", text: "Nothing leaves your shed without your approval, and every rule is checked on the server, not just in the app." },
];

const BUILD: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Rules enforced on the server",
    text: "Every permission (who can edit, approve, remove or see what) is checked in Convex functions. The interface only hides buttons for convenience.",
  },
  {
    icon: Workflow,
    title: "Automations that don't fail silently",
    text: "Request emails and daily overdue reminders run in n8n. Events go through a transactional outbox with retries, every webhook is HMAC-signed both ways, write-backs are idempotent, and failures surface on the admin page.",
  },
  {
    icon: BellRing,
    title: "Only the data each step needs",
    text: "Notifications carry a name, a tool and dates, nothing more. Public pages show names and categories, and the assistant's tools return only what the Browse page already shows.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-white">
        <div className="pointer-events-none absolute -top-40 -right-24 size-[460px] rounded-full bg-brand-100/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <p className="text-sm font-semibold text-brand-700">About LendLoop</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl">
            The tool you need is probably next door.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Most households own a drill, a ladder and a garden strimmer that sit unused nearly all year. LendLoop is a
            neighbourhood lending board: list what you rarely use, borrow what you need for a few days, and let the app
            handle requests, reminders and returns.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">What we believe</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <v.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-zinc-900">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">How it&apos;s built</h2>
          <p className="mt-2 text-zinc-600">
            Next.js and TypeScript on the front, Clerk for sign-in, Convex for data and server logic, and self-hosted n8n
            for automations. Three decisions shape it:
          </p>
          <ul className="mt-8 space-y-4">
            {BUILD.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <b.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-900">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Borrow what you need. Lend what you don&apos;t.</h2>
        <p className="mx-auto mt-2 max-w-lg text-zinc-600">New here? The guide walks you through your first loan in five minutes.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/guide">Read the guide</ButtonLink>
          <ButtonLink href="/tools" variant="secondary">
            Browse tools
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
