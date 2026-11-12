import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { categoryValidator } from "./schema";
import { wantedService } from "./services/wantedService";

export const list = query({
  args: {},
  handler: async (ctx) => wantedService.listOpen(ctx.db, await requireUser(ctx)),
});

export const create = mutation({
  args: {
    title: v.string(),
    details: v.string(),
    category: v.optional(categoryValidator),
    neededBy: v.optional(v.string()),
  },
  handler: async (ctx, input) => wantedService.create(ctx, await requireUser(ctx), input),
});

export const close = mutation({
  args: { wantedId: v.id("wanted") },
  handler: async (ctx, { wantedId }) => wantedService.close(ctx, await requireUser(ctx), wantedId),
});

/** "I have one": opens a chat with the person who asked. Returns the conversation id. */
export const respond = mutation({
  args: { wantedId: v.id("wanted") },
  handler: async (ctx, { wantedId }) => wantedService.respond(ctx, await requireUser(ctx), wantedId),
});
