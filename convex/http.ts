// HTTP endpoints called by n8n. Every request must be signed with
// WEBHOOK_SECRET_FROM_N8N (see lib/hmac.ts) or it is rejected before any work.
import { httpRouter } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { httpAction, type ActionCtx } from "./_generated/server";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./lib/hmac";
import { requireEnv } from "./lib/env";

const MAX_BODY_BYTES = 16_384;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Verifies the signature on the raw body, then hands the parsed JSON to `handle`. */
function signed(handle: (ctx: ActionCtx, body: Record<string, unknown>) => Promise<Response>) {
  return httpAction(async (ctx, request) => {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "body too large" });

    const check = await verifySignature(
      requireEnv("WEBHOOK_SECRET_FROM_N8N"),
      raw,
      request.headers.get(TIMESTAMP_HEADER),
      request.headers.get(SIGNATURE_HEADER),
    );
    if (!check.ok) return json(401, { error: "invalid signature" });

    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(400, { error: "invalid JSON" });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return json(400, { error: "body must be a JSON object" });
    }
    try {
      return await handle(ctx, body as Record<string, unknown>);
    } catch (e) {
      // Argument validation errors (e.g. a malformed loanId) end up here.
      console.error("n8n endpoint failed", e);
      return json(400, { error: "request rejected" });
    }
  });
}

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

const http = httpRouter();

http.route({
  path: "/n8n/overdue-loans",
  method: "POST",
  handler: signed(async (ctx) => json(200, await ctx.runQuery(internal.automation.overdueLoans, {}))),
});

http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const loanId = str(body.loanId);
    const idempotencyKey = str(body.idempotencyKey);
    const status = body.status === "sent" || body.status === "failed" ? body.status : undefined;
    const channel = str(body.channel);
    if (!loanId || !idempotencyKey || !status || !channel) {
      return json(400, { error: "loanId, idempotencyKey, status and channel are required" });
    }
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      loanId: loanId as Id<"loans">,
      idempotencyKey,
      status,
      channel,
      executionId: str(body.executionId),
    });
    return "error" in result ? json(400, result) : json(200, result);
  }),
});

http.route({
  path: "/n8n/errors",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const workflow = str(body.workflow);
    const message = str(body.message);
    if (!workflow || !message) return json(400, { error: "workflow and message are required" });
    await ctx.runMutation(internal.automation.recordError, {
      workflow,
      message,
      node: str(body.node),
      executionId: str(body.executionId),
    });
    return json(200, { recorded: true });
  }),
});

export default http;
