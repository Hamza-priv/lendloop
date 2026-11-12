import { internalMutation } from "./_generated/server";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Deletes uploaded files no listing uses: photos picked in a form that was never
 * saved, or uploads the server rejected. Files younger than a day are left alone,
 * because someone may still be filling in the form.
 */
export const cleanupOrphanImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const used = new Set<string>();
    for (const tool of await ctx.db.query("tools").collect()) {
      for (const id of tool.images ?? []) used.add(id);
    }
    const cutoff = Date.now() - DAY;
    let deleted = 0;
    for (const file of await ctx.db.system.query("_storage").collect()) {
      if (file._creationTime < cutoff && !used.has(file._id)) {
        await ctx.storage.delete(file._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
