import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { notificationService } from "./services/notificationService";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await notificationService.list(ctx, user._id);
    return rows.map((n) => ({
      _id: n._id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt !== undefined,
      at: n._creationTime,
    }));
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => notificationService.markAllRead(ctx, (await requireUser(ctx))._id),
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) =>
    notificationService.markRead(ctx, (await requireUser(ctx))._id, notificationId),
});
