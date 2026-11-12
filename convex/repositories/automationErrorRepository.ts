import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export const automationErrorRepository = {
  insert: (
    db: DatabaseWriter,
    row: Omit<Doc<"automationErrors">, "_id" | "_creationTime">,
  ) => db.insert("automationErrors", row),

  listRecent: (db: DatabaseReader, limit: number) =>
    db.query("automationErrors").order("desc").take(limit),

  remove: (db: DatabaseWriter, id: Id<"automationErrors">) => db.delete(id),
};
