// In-app notifications (the bell) plus, where it makes sense, an email through
// the outbox. Every call runs inside the mutation that caused it, so the change
// and its notification are saved together or not at all.
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";

type Kind = Doc<"notifications">["kind"];

export const notificationService = {
  /**
   * Adds a notification. With a `groupKey`, an unread notification in the same
   * group is updated instead, so ten messages in one chat show as one entry.
   */
  async notify(
    ctx: MutationCtx,
    userId: Id<"users">,
    n: { kind: Kind; title: string; body: string; link: string; groupKey?: string },
  ) {
    if (n.groupKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user_group", (q) => q.eq("userId", userId).eq("groupKey", n.groupKey))
        .order("desc")
        .first();
      // Replace it, so the updated notification moves to the top of the list.
      if (existing && existing.readAt === undefined) await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("notifications", { userId, ...n });
  },

  async list(ctx: { db: DatabaseReader }, userId: Id<"users">, limit = 30) {
    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },

  async markAllRead(ctx: MutationCtx, userId: Id<"users">) {
    const now = Date.now();
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("readAt"), undefined))
      .collect();
    for (const n of unread) await ctx.db.patch(n._id, { readAt: now });
  },

  async markRead(ctx: MutationCtx, userId: Id<"users">, id: Id<"notifications">) {
    const n = await ctx.db.get(id);
    if (n && n.userId === userId && n.readAt === undefined) await ctx.db.patch(id, { readAt: Date.now() });
  },
};
