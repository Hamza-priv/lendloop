import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Category = Doc<"tools">["category"];

export const toolRepository = {
  get: (db: DatabaseReader, id: Id<"tools">) => db.get(id),

  /** Listings that have not been removed, optionally for one category. */
  async listActive(db: DatabaseReader, category?: Category) {
    const tools = category
      ? await db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .collect()
      : await db.query("tools").order("desc").collect();
    return tools.filter((t) => t.removedAt === undefined);
  },

  async listByOwner(db: DatabaseReader, ownerId: Id<"users">) {
    const tools = await db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .collect();
    return tools.filter((t) => t.removedAt === undefined);
  },

  insert: (db: DatabaseWriter, tool: Omit<Doc<"tools">, "_id" | "_creationTime">) =>
    db.insert("tools", tool),

  patch: (
    db: DatabaseWriter,
    id: Id<"tools">,
    fields: Partial<Pick<Doc<"tools">, "name" | "category" | "condition" | "description" | "location" | "images">>,
  ) => db.patch(id, fields),

  softRemove: (db: DatabaseWriter, id: Id<"tools">, now: number) =>
    db.patch(id, { removedAt: now }),

  async getMany(db: DatabaseReader, ids: Id<"tools">[]) {
    const unique = [...new Set(ids)];
    const tools = await Promise.all(unique.map((id) => db.get(id)));
    return new Map(tools.filter((t) => t !== null).map((t) => [t._id, t]));
  },
};
