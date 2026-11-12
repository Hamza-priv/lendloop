// Internal functions behind the signed n8n endpoints in http.ts.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { automationService } from "./services/automationService";

export const overdueLoans = internalQuery({
  args: {},
  handler: (ctx) => automationService.overdueLoans(ctx.db),
});

export const recordReminder = internalMutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(),
    executionId: v.optional(v.string()),
  },
  handler: (ctx, input) => automationService.recordReminder(ctx, input),
});

export const recordError = internalMutation({
  args: {
    workflow: v.string(),
    node: v.optional(v.string()),
    message: v.string(),
    executionId: v.optional(v.string()),
  },
  handler: (ctx, input) => automationService.recordError(ctx, input),
});
