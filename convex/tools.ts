import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { imagesWithUrls } from "./lib/images";
import { categoryValidator, conditionValidator, locationValidator } from "./schema";
import { toolService } from "./services/toolService";
import { watchService } from "./services/watchService";

const toolInput = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
  // null clears it; omitted leaves it unchanged.
  location: v.optional(v.union(locationValidator, v.null())),
  // Omitted leaves photos unchanged; an array (even empty) replaces them.
  images: v.optional(v.array(v.id("_storage"))),
};

/** A one-time URL the browser uploads a photo to. Only signed-in users get one. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

/** Public landing page list. No sign-in needed, no owner details. */
export const listPublic = query({
  args: {},
  handler: (ctx) => toolService.listPublic(ctx.db),
});

export const browse = query({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const user = await requireUser(ctx);
    const rows = await toolService.browse(ctx.db, user, category);
    return Promise.all(rows.map(async (t) => ({ ...t, images: await imagesWithUrls(ctx.storage, t.images) })));
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const rows = await toolService.listMine(ctx.db, await requireUser(ctx));
    return Promise.all(rows.map(async (t) => ({ ...t, images: await imagesWithUrls(ctx.storage, t.images) })));
  },
});

export const create = mutation({
  args: toolInput,
  handler: async (ctx, input) => toolService.create(ctx, await requireUser(ctx), input),
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolInput },
  handler: async (ctx, { toolId, ...input }) =>
    toolService.update(ctx, await requireUser(ctx), toolId, input),
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => toolService.removeOwn(ctx, await requireUser(ctx), toolId),
});

/** "Notify me when available" on or off. */
export const watch = mutation({
  args: { toolId: v.id("tools"), on: v.boolean() },
  handler: async (ctx, { toolId, on }) => {
    const user = await requireUser(ctx);
    const tool = await toolService.getActiveTool(ctx.db, toolId);
    await watchService.set(ctx, user, tool, on);
  },
});
