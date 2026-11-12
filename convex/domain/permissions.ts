// Pure access rules. Every Convex function goes through these, so the UI is
// never the only thing standing between a user and data they shouldn't touch.
import type { Doc } from "../_generated/dataModel";
import { domainError } from "./errors";

type User = Pick<Doc<"users">, "_id" | "role">;

export const isAdmin = (user: User) => user.role === "admin";

export function assertAdmin(user: User) {
  if (!isAdmin(user)) throw domainError("FORBIDDEN", "Admins only.");
}

/** Only the owner edits or deletes a listing. Admin removal is a separate action. */
export function assertOwnsTool(user: User, tool: Pick<Doc<"tools">, "ownerId">) {
  if (tool.ownerId !== user._id) {
    throw domainError("FORBIDDEN", "You can only change your own listings.");
  }
}

export function assertCanBorrow(user: User, tool: Pick<Doc<"tools">, "ownerId" | "removedAt">) {
  if (tool.removedAt !== undefined) throw domainError("NOT_FOUND", "This listing was removed.");
  if (tool.ownerId === user._id) {
    throw domainError("INVALID_INPUT", "You can't borrow your own tool.");
  }
}

/** Approve, decline and mark returned belong to the lender. */
export function assertIsLender(user: User, loan: Pick<Doc<"loans">, "lenderId">) {
  if (loan.lenderId !== user._id) {
    throw domainError("FORBIDDEN", "Only the tool's owner can do this.");
  }
}

/** Cancelling a pending request belongs to the borrower. */
export function assertIsBorrower(user: User, loan: Pick<Doc<"loans">, "borrowerId">) {
  if (loan.borrowerId !== user._id) {
    throw domainError("FORBIDDEN", "Only the borrower can do this.");
  }
}

export function isPartyToLoan(user: User, loan: Pick<Doc<"loans">, "lenderId" | "borrowerId">) {
  return loan.lenderId === user._id || loan.borrowerId === user._id;
}
