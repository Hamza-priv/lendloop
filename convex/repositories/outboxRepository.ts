import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type OutboxRow = Doc<"outbox">;

export const outboxRepository = {
  get: (db: DatabaseReader, id: Id<"outbox">) => db.get(id),

  insert: (db: DatabaseWriter, row: Omit<OutboxRow, "_id" | "_creationTime">) =>
    db.insert("outbox", row),

  /** Pending rows whose next attempt is due. */
  listDue: (db: DatabaseReader, now: number, limit: number) =>
    db
      .query("outbox")
      .withIndex("by_status_next", (q) => q.eq("status", "pending").lte("nextAttemptAt", now))
      .take(limit),

  /** Rows stuck in "sending" because a delivery crashed before reporting back. */
  async listExpiredLeases(db: DatabaseReader, now: number, limit: number) {
    const rows = await db
      .query("outbox")
      .withIndex("by_status_next", (q) => q.eq("status", "sending"))
      .take(limit);
    return rows.filter((r) => (r.leaseUntil ?? 0) < now);
  },

  listFailed: (db: DatabaseReader, limit: number) =>
    db
      .query("outbox")
      .withIndex("by_status_next", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(limit),

  listForLoan: (db: DatabaseReader, loanId: Id<"loans">) =>
    db
      .query("outbox")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .collect(),

  patch: (
    db: DatabaseWriter,
    id: Id<"outbox">,
    fields: Partial<
      Pick<OutboxRow, "status" | "attempts" | "nextAttemptAt" | "leaseUntil" | "lastError" | "sentAt">
    >,
  ) => db.patch(id, fields),
};
