import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  Camera,
  HandHelping,
  Handshake,
  Inbox,
  LifeBuoy,
  ListChecks,
  LocateFixed,
  MapPin,
  MessageCircle,
  PackagePlus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/shared/ui/Button";

export const metadata: Metadata = {
  title: "Guide",
  description: "How to borrow, lend, post a request and stay safe on LendLoop.",
};

type Step = { icon: LucideIcon; title: string; body: ReactNode };

const SECTIONS: { id: string; title: string; intro: string; steps: Step[] }[] = [
  {
    id: "start",
    title: "Getting started",
    intro: "You can look around without an account. To lend or borrow, sign up with Google or your email.",
    steps: [
      { icon: UserPlus, title: "Create your account", body: <>Press <b>Get started</b> at the top. It takes under a minute, and your email is never shown to other neighbours.</> },
      { icon: Search, title: "Look around", body: <><b>Browse</b> shows every tool with photos and whether it&apos;s free right now. Filter by category, search by name, or press <b>Near me</b> to see the closest first.</> },
    ],
  },
  {
    id: "borrow",
    title: "Borrowing a tool",
    intro: "Find it, ask for your dates, collect it, bring it back.",
    steps: [
      { icon: Search, title: "Open the tool", body: <>Click any tool on <b>Browse</b> to see its photos, condition, description, dates it&apos;s already booked, and where to collect it on a map.</> },
      { icon: MapPin, title: "Check the distance", body: <>Press <b>Open in Google Maps</b> for the route and how long it takes to get there.</> },
      { icon: CalendarCheck, title: "Request your dates", body: <>Press <b>Borrow</b> and pick a start and end date. A loan can last up to 30 days and start up to 90 days ahead.</> },
      { icon: MessageCircle, title: "Ask a question first (optional)", body: <>Not sure it fits your job? Press <b>Message owner</b> in the tool&apos;s details to chat before you request.</> },
      { icon: Bell, title: "Wait for an answer", body: <>The owner approves or declines. You&apos;ll get a notification in the bell and an email. Track everything under <b>My requests</b>, and cancel while it&apos;s still pending.</> },
      { icon: RotateCcw, title: "Collect and return", body: <>Agree a pickup time in <b>Messages</b>. Bring the tool back clean and by the end date. The owner marks it returned, and you&apos;ll get a reminder if it&apos;s overdue.</> },
    ],
  },
  {
    id: "lend",
    title: "Lending a tool",
    intro: "List something you rarely use. You stay in control of every request.",
    steps: [
      { icon: PackagePlus, title: "List it", body: <>Press <b>List a tool</b>. Add a name, category, condition and a short, honest description: what&apos;s included and any quirks.</> },
      { icon: Camera, title: "Add photos", body: <>Up to 4 photos, 5 MB each. The first one is the cover; use <b>Make cover</b> to change it. Good photos get more requests.</> },
      { icon: LocateFixed, title: "Set a pickup spot (optional)", body: <>Search an address, press <b>Use my location</b>, or drop a pin. A nearby corner or your gate works fine. Signed-in neighbours see it; the public page never does.</> },
      { icon: Inbox, title: "Answer requests", body: <>New requests appear under <b>Incoming</b>, with a badge in the menu, a bell notification and an email. Approve or decline. Approving one declines any other request for the same dates.</> },
      { icon: RotateCcw, title: "Mark it returned", body: <>Once you have it back, press <b>Mark returned</b> on the loan. Anyone waiting for it is told it&apos;s free again.</> },
      { icon: ListChecks, title: "Keep listings up to date", body: <>Edit or delete a listing from <b>My listings</b>. You can&apos;t delete a tool while it&apos;s out on loan.</> },
    ],
  },
  {
    id: "wanted",
    title: "Can't find it? Post a request",
    intro: "The Wanted board is for tools nobody has listed yet.",
    steps: [
      { icon: HandHelping, title: "Post what you need", body: <>Open <b>Wanted</b> and press <b>Post a request</b>, or search on Browse and use <b>Post a request</b> when nothing turns up. Add details and a date if it helps.</> },
      { icon: MessageCircle, title: "Neighbours offer theirs", body: <>Anyone who has one presses <b>I have one</b>. That opens a chat with you, and you&apos;re notified straight away.</> },
      { icon: Bell, title: "Get told about new listings", body: <>If someone later lists a matching tool, you get a notification and an email. Close the request once you&apos;ve found one; requests close on their own after 30 days.</> },
      { icon: Handshake, title: "Help a neighbour", body: <>Check <b>Wanted</b> now and then. If you own something on it, a quick <b>I have one</b> makes someone&apos;s day.</> },
    ],
  },
  {
    id: "stay-in-touch",
    title: "Messages and notifications",
    intro: "Everything that needs your attention reaches you in the app and by email.",
    steps: [
      { icon: MessageCircle, title: "Messages", body: <>All your chats are under <b>Messages</b>. You can start one from a tool (<b>Message owner</b>), a loan card (<b>Message</b>) or a Wanted request (<b>I have one</b>).</> },
      { icon: Bell, title: "The bell", body: <>New requests, answers, returns, messages and matches show in the bell at the top. Click one to go straight to it.</> },
      { icon: Bell, title: "Notify me when it's back", body: <>Tool on loan? Open it and press <b>Notify me when it&apos;s back</b>. You&apos;ll hear the moment it&apos;s returned.</> },
      { icon: Inbox, title: "Emails without the flood", body: <>You get one email when a chat has something new, not one per message, the same way LinkedIn does it.</> },
    ],
  },
  {
    id: "assistant",
    title: "The LendLoop assistant",
    intro: "The ✨ button at the bottom right, once you're signed in.",
    steps: [
      { icon: Sparkles, title: "What it's good at", body: <>&ldquo;I need to hang shelves, what can I borrow?&rdquo;, &ldquo;Do I have requests waiting?&rdquo;, &ldquo;Help me write a listing for my mower&rdquo;, or a quick thank-you note to a neighbour.</> },
      { icon: ShieldCheck, title: "What it can't do", body: <>It can&apos;t create, approve or cancel anything, and it never sees anyone&apos;s email or address. It tells you which button to press instead.</> },
      { icon: LifeBuoy, title: "If you're struggling", body: <>If you mention wanting to hurt yourself or someone else, it stops and gives you emergency numbers and free helplines. Please use them; you don&apos;t have to go through it alone.</> },
    ],
  },
];

const SAFETY = [
  "Check the tool together at pickup: does it work, is anything missing, is the battery charged?",
  "Meet at the pickup spot or a public place. Share your address only when you're comfortable.",
  "Keep chats in LendLoop until you've agreed a pickup. Never send money or bank details.",
  "Follow the tool's safety basics: gloves and eye protection for power and garden tools.",
  "Return it clean, on time, and with everything it came with. Message the owner early if you're running late.",
  "Something wrong? Tell the owner in Messages. If it's serious, an admin can remove listings.",
];

const FAQ: { q: string; a: ReactNode }[] = [
  { q: "Does it cost anything?", a: "No. LendLoop is free for neighbours to lend and borrow." },
  { q: "How long can I borrow something?", a: "Up to 30 days per loan, starting at most 90 days from today." },
  { q: "What does the green check next to a name mean?", a: "An admin has marked that neighbour a Trusted Lender: someone reliable who lends often." },
  { q: "Who can see my pickup location?", a: "Only signed-in neighbours, so they can judge the distance before asking. Visitors to the public page see tool names and categories, nothing else." },
  { q: "Who can see my email?", a: "Nobody. Notifications are emailed to you by LendLoop; your address is never shown to other users or to the assistant." },
  { q: "What if I don't get an answer?", a: "Owners get a notification and an email for every request. If it's urgent, send a message, or look for another listing with Near me." },
];

export default function GuidePage() {
  return (
    <main className="flex-1">
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold text-brand-700">Guide</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">How LendLoop works</h1>
          <p className="mt-3 max-w-2xl text-lg text-zinc-600">
            Everything you need to borrow, lend and help neighbours, step by step. Takes about five minutes to read.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label="On this page">
          <ul className="sticky top-24 space-y-1 text-sm">
            {[...SECTIONS.map((s) => ({ id: s.id, title: s.title })), { id: "safety", title: "Staying safe" }, { id: "faq", title: "Questions" }].map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-16">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{section.title}</h2>
              <p className="mt-1.5 text-zinc-600">{section.intro}</p>
              <ol className="mt-6 space-y-3">
                {section.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-card sm:p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <step.icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900">
                        <span className="mr-2 font-mono text-sm text-zinc-300">{String(i + 1).padStart(2, "0")}</span>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600 [&_b]:font-medium [&_b]:text-zinc-900">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section id="safety" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Staying safe</h2>
            <p className="mt-1.5 text-zinc-600">A few habits that keep lending friendly.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {SAFETY.map((tip) => (
                <li key={tip} className="flex gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 text-sm leading-relaxed text-zinc-700 shadow-card">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Questions</h2>
            <div className="mt-6 divide-y divide-zinc-200/80 rounded-xl border border-zinc-200/80 bg-white shadow-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-900">
                    {f.q}
                    <span className="text-zinc-400 transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="flex flex-col items-start gap-4 rounded-2xl bg-brand-900 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold text-white">
                <BadgeCheck className="size-5" /> Ready to start?
              </p>
              <p className="mt-1 text-brand-100">Browse what&apos;s nearby, or list something you rarely use.</p>
            </div>
            <div className="flex gap-2">
              <ButtonLink href="/tools" variant="secondary">
                Browse tools
              </ButtonLink>
              <Link href="/about" className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-white hover:bg-white/10">
                About LendLoop
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
