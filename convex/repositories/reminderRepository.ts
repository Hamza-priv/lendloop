import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Reminder = Omit<Doc<"reminders">, "_id" | "_creationTime">;

export const reminderRepository = {
  getByKey: (db: DatabaseReader, idempotencyKey: string) =>
    db
      .query("reminders")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique(),

  listForLoan: (db: DatabaseReader, loanId: Id<"loans">) =>
    db
      .query("reminders")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .collect(),

  /**
   * Idempotent write: a retried call with the same key returns the existing
   * record instead of creating a duplicate. Convex mutations are serializable,
   * so two concurrent retries cannot both insert.
   */
  async insertIfAbsent(db: DatabaseWriter, reminder: Reminder) {
    const existing = await reminderRepository.getByKey(db, reminder.idempotencyKey);
    if (existing) return { id: existing._id, created: false };
    const id = await db.insert("reminders", reminder);
    return { id, created: true };
  },
};
