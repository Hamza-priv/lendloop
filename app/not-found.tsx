import { Compass } from "lucide-react";
import { ButtonLink } from "@/shared/ui/Button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
        <Compass className="size-6" />
      </span>
      <p className="mt-6 font-mono text-sm text-zinc-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">This page wandered off</h1>
      <p className="mt-2 max-w-sm text-zinc-500">It may have been moved or never existed. Let&apos;s get you back.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/tools" variant="secondary">Browse tools</ButtonLink>
      </div>
    </main>
  );
}
