"use client";

// Client component so the landing page itself stays static and prerenders.
import { Show } from "@clerk/nextjs";
import { ArrowRight, Plus } from "lucide-react";
import { ButtonLink } from "@/shared/ui/Button";

export function HeroActions({ variant = "hero" }: { variant?: "hero" | "band" }) {
  const primary = variant === "band" ? "secondary" : "primary";
  const secondary = variant === "band" ? "ghost" : "secondary";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <ButtonLink href="/sign-up" size="lg" variant={primary}>
          Get started — it&apos;s free <ArrowRight />
        </ButtonLink>
        <ButtonLink href="/sign-in" size="lg" variant={secondary}>
          Sign in to lend or borrow
        </ButtonLink>
      </Show>
      <Show when="signed-in">
        <ButtonLink href="/tools" size="lg" variant={primary}>
          Browse tools <ArrowRight />
        </ButtonLink>
        <ButtonLink href="/tools/new" size="lg" variant={secondary}>
          <Plus /> List a tool
        </ButtonLink>
      </Show>
    </div>
  );
}
