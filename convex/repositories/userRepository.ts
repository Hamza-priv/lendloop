import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export const userRepository = {
  get: (db: DatabaseReader, id: Id<"users">) => db.get(id),

  getByToken: (db: DatabaseReader, tokenIdentifier: string) =>
    db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique(),

  list: (db: DatabaseReader) => db.query("users").collect(),

  getByEmail: (db: DatabaseReader, email: string) =>
    db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first(),

  insert: (db: DatabaseWriter, user: Omit<Doc<"users">, "_id" | "_creationTime">) =>
    db.insert("users", user),

  patch: (
    db: DatabaseWriter,
    id: Id<"users">,
    fields: Partial<Pick<Doc<"users">, "name" | "email" | "role" | "trustedLender">>,
  ) => db.patch(id, fields),

  /** Loads several users at once, keyed by id. */
  async getMany(db: DatabaseReader, ids: Id<"users">[]) {
    const unique = [...new Set(ids)];
    const users = await Promise.all(unique.map((id) => db.get(id)));
    return new Map(users.filter((u) => u !== null).map((u) => [u._id, u]));
  },
};
