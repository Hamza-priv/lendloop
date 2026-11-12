import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Status = Doc<"loans">["status"];

export const loanRepository = {
  get: (db: DatabaseReader, id: Id<"loans">) => db.get(id),

  listForTool: (db: DatabaseReader, toolId: Id<"tools">, status: Status) =>
    db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", status))
      .collect(),

  listByBorrower: (db: DatabaseReader, borrowerId: Id<"users">) =>
    db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", borrowerId))
      .order("desc")
      .collect(),

  listByLender: (db: DatabaseReader, lenderId: Id<"users">) =>
    db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", lenderId))
      .order("desc")
      .collect(),

  listRecent: (db: DatabaseReader, limit: number) =>
    db.query("loans").order("desc").take(limit),

  /** Approved loans whose end date is before `today`, i.e. not returned in time. */
  listOverdue: (db: DatabaseReader, today: string) =>
    db
      .query("loans")
      .withIndex("by_status_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .collect(),

  insert: (db: DatabaseWriter, loan: Omit<Doc<"loans">, "_id" | "_creationTime">) =>
    db.insert("loans", loan),

  patch: (
    db: DatabaseWriter,
    id: Id<"loans">,
    fields: Partial<Pick<Doc<"loans">, "status" | "returnedAt">>,
  ) => db.patch(id, fields),
};
