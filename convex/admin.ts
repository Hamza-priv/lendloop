import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { withLoanImages } from "./lib/images";
import { automationErrorRepository } from "./repositories/automationErrorRepository";
import { outboxRepository } from "./repositories/outboxRepository";
import { userRepository } from "./repositories/userRepository";
import { loanService } from "./services/loanService";
import { outboxService } from "./services/outboxService";
import { toolService } from "./services/toolService";
import { userService } from "./services/userService";

export const allLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return withLoanImages(ctx.storage, await loanService.allForAdmin(ctx.db));
  },
});

export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await userRepository.list(ctx.db);
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      trustedLender: u.trustedLender,
    }));
  },
});

export const removeListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await toolService.getActiveTool(ctx.db, toolId);
    await toolService.removeAndDeclinePending(ctx, tool);
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    await userService.setTrustedLender(ctx, userId, trusted);
  },
});

/** Notifications that ran out of retries, plus failures reported by n8n's error workflow. */
export const automationHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [failedEvents, errors] = await Promise.all([
      outboxRepository.listFailed(ctx.db, 50),
      automationErrorRepository.listRecent(ctx.db, 50),
    ]);
    return {
      failedEvents: failedEvents.map((e) => ({
        _id: e._id,
        type: e.payload.type,
        toolName: e.payload.tool.name,
        attempts: e.attempts,
        lastError: e.lastError,
        createdAt: e._creationTime,
      })),
      errors,
    };
  },
});

export const retryEvent = mutation({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    await requireAdmin(ctx);
    await outboxService.retry(ctx, outboxId);
  },
});

/** Clears a reported n8n error once an admin has looked at it. */
export const dismissError = mutation({
  args: { errorId: v.id("automationErrors") },
  handler: async (ctx, { errorId }) => {
    await requireAdmin(ctx);
    await automationErrorRepository.remove(ctx.db, errorId);
  },
});
