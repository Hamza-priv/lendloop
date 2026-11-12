// "Notify me when available": a user watches a tool that is on loan; when the
// loan is marked returned, every watcher gets an in-app notification and an
// email, and the watch is removed (one notification per watch).
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import { notificationService } from "./notificationService";
import { outboxService } from "./outboxService";

export const watchService = {
  async set(ctx: MutationCtx, user: Doc<"users">, tool: Doc<"tools">, on: boolean) {
    if (tool.ownerId === user._id) throw domainError("INVALID_INPUT", "This is your own tool.");
    const existing = await ctx.db
      .query("watches")
      .withIndex("by_user_tool", (q) => q.eq("userId", user._id).eq("toolId", tool._id))
      .unique();
    if (on && !existing) await ctx.db.insert("watches", { userId: user._id, toolId: tool._id });
    if (!on && existing) await ctx.db.delete(existing._id);
  },

  /** Tool ids this user is watching. */
  async watchedBy(db: DatabaseReader, userId: Id<"users">) {
    const rows = await db.query("watches").withIndex("by_user_tool", (q) => q.eq("userId", userId)).collect();
    return new Set(rows.map((w) => w.toolId));
  },

  async notifyAvailable(ctx: MutationCtx, tool: Doc<"tools">) {
    const watchers = await ctx.db.query("watches").withIndex("by_tool", (q) => q.eq("toolId", tool._id)).collect();
    const link = `/tools?tool=${tool._id}`;
    for (const w of watchers) {
      await notificationService.notify(ctx, w.userId, {
        kind: "available",
        title: `The ${tool.name} is available again`,
        body: "You asked to be told when it came back. Request it before someone else does.",
        link,
      });
      await outboxService.enqueueNotification(ctx, w.userId, { type: "tool.available", toolName: tool.name, link });
      await ctx.db.delete(w._id);
    }
  },
};
