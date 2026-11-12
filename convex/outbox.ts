// Background delivery of outbox events to the n8n webhook. Internal only:
// none of these can be called from the browser.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { signBody } from "./lib/hmac";
import { requireEnv } from "./lib/env";
import { outboxService } from "./services/outboxService";

const DELIVERY_TIMEOUT_MS = 10_000;

export const claim = internalMutation({
  args: { outboxId: v.id("outbox") },
  handler: (ctx, { outboxId }) => outboxService.claim(ctx, outboxId, Date.now()),
});

export const complete = internalMutation({
  args: {
    outboxId: v.id("outbox"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: (ctx, { outboxId, ok, error }) =>
    outboxService.complete(
      ctx,
      outboxId,
      ok ? { ok: true } : { ok: false, error: (error ?? "unknown error").slice(0, 500) },
      Date.now(),
    ),
});

export const sweep = internalMutation({
  args: {},
  handler: (ctx) => outboxService.sweep(ctx, Date.now()),
});

export const deliver = internalAction({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }): Promise<void> => {
    const payload = await ctx.runMutation(internal.outbox.claim, { outboxId });
    if (!payload) return; // already sent, or another delivery holds it

    let error: string | undefined;
    try {
      const url = requireEnv("N8N_LOAN_EVENTS_WEBHOOK_URL");
      const secret = requireEnv("WEBHOOK_SECRET_TO_N8N");
      const body = JSON.stringify(payload);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-event-id": payload.eventId,
          ...(await signBody(secret, body)),
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      if (!response.ok) error = `n8n responded ${response.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    await ctx.runMutation(internal.outbox.complete, {
      outboxId,
      ok: error === undefined,
      error,
    });
  },
});
