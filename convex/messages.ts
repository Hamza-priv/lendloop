import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { domainError } from "./domain/errors";
import { getCurrentUser, requireUser } from "./lib/auth";
import { messagingService } from "./services/messagingService";
import { toolService } from "./services/toolService";

/** Opens (or reuses) a chat with a tool's owner. Returns the conversation id. */
export const startAboutTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const user = await requireUser(ctx);
    const tool = await toolService.getActiveTool(ctx.db, toolId);
    return messagingService.open(ctx, user, tool.ownerId, tool._id);
  },
});

/** Opens (or reuses) a chat with the other person on a loan. */
export const startAboutLoan = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan || (loan.borrowerId !== user._id && loan.lenderId !== user._id)) {
      throw domainError("NOT_FOUND", "Loan not found.");
    }
    const other = loan.borrowerId === user._id ? loan.lenderId : loan.borrowerId;
    return messagingService.open(ctx, user, other, loan.toolId);
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, { conversationId, body }) =>
    messagingService.send(ctx, await requireUser(ctx), conversationId, body),
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => messagingService.markRead(ctx, await requireUser(ctx), conversationId),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await messagingService.list(ctx.db, await requireUser(ctx));
    return Promise.all(
      rows.map(async (c) => ({
        ...c,
        tool: c.tool && { ...c.tool, imageUrl: c.tool.imageId ? await ctx.storage.getUrl(c.tool.imageId) : null },
      })),
    );
  },
});

export const thread = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const t = await messagingService.thread(ctx.db, await requireUser(ctx), conversationId);
    return { ...t, tool: t.tool && { ...t.tool, imageUrl: t.tool.imageId ? await ctx.storage.getUrl(t.tool.imageId) : null } };
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user ? messagingService.unreadCount(ctx.db, user) : 0;
  },
});
