import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import {
  assertTransition,
  isOverdue,
  rangesOverlap,
  todayUtc,
  validateDateRange,
  type LoanStatus,
} from "../domain/loan";
import { assertCanBorrow, assertIsBorrower, assertIsLender } from "../domain/permissions";
import { loanRepository } from "../repositories/loanRepository";
import { outboxRepository } from "../repositories/outboxRepository";
import { reminderRepository } from "../repositories/reminderRepository";
import { toolRepository } from "../repositories/toolRepository";
import { userRepository } from "../repositories/userRepository";
import { outboxService } from "./outboxService";
import { toolService } from "./toolService";
import { watchService } from "./watchService";

type User = Doc<"users">;

async function getLoan(db: DatabaseReader, loanId: Id<"loans">) {
  const loan = await loanRepository.get(db, loanId);
  if (!loan) throw domainError("NOT_FOUND", "Loan not found.");
  return loan;
}

/** Changes status, then records the event in the outbox in the same transaction. */
async function transition(ctx: MutationCtx, loan: Doc<"loans">, to: LoanStatus) {
  assertTransition(loan.status, to);
  const fields = to === "returned" ? { status: to, returnedAt: Date.now() } : { status: to };
  await loanRepository.patch(ctx.db, loan._id, fields);
  const tool = await toolRepository.get(ctx.db, loan.toolId);
  await outboxService.enqueueLoanEvent(ctx, { ...loan, ...fields }, tool ?? { name: "a tool" });
}

/** Adds tool name and location, the other party's name and automation activity to each loan. */
async function describe(db: DatabaseReader, loans: Doc<"loans">[]) {
  const today = todayUtc();
  const tools = await toolRepository.getMany(db, loans.map((l) => l.toolId));
  const users = await userRepository.getMany(
    db,
    loans.flatMap((l) => [l.borrowerId, l.lenderId]),
  );
  return Promise.all(
    loans.map(async (loan) => {
      const [events, reminders] = await Promise.all([
        outboxRepository.listForLoan(db, loan._id),
        reminderRepository.listForLoan(db, loan._id),
      ]);
      const activity = [
        ...events.map((e) => ({
          kind: "notification" as const,
          label: e.payload.type.replace("loan.", ""),
          status: e.status,
          at: e.sentAt ?? e._creationTime,
          error: e.status === "failed" ? e.lastError : undefined,
        })),
        ...reminders.map((r) => ({
          kind: "reminder" as const,
          label: "overdue reminder",
          status: r.status,
          at: r.sentAt,
          error: undefined,
        })),
      ].sort((a, b) => b.at - a.at);
      const tool = tools.get(loan.toolId);
      return {
        _id: loan._id,
        status: loan.status,
        startDate: loan.startDate,
        endDate: loan.endDate,
        overdue: isOverdue(loan, today),
        tool: { _id: loan.toolId, name: tool?.name ?? "Removed tool", category: tool?.category ?? ("other" as const), location: tool?.location ?? null, imageId: tool?.images?.[0] ?? null },
        borrower: { name: users.get(loan.borrowerId)?.name ?? "Neighbour" },
        lender: {
          name: users.get(loan.lenderId)?.name ?? "Neighbour",
          trustedLender: users.get(loan.lenderId)?.trustedLender ?? false,
        },
        activity,
      };
    }),
  );
}

export const loanService = {
  async request(
    ctx: MutationCtx,
    user: User,
    input: { toolId: Id<"tools">; startDate: string; endDate: string },
  ): Promise<Id<"loans">> {
    const today = todayUtc();
    validateDateRange(input.startDate, input.endDate, today);
    const tool = await toolService.getActiveTool(ctx.db, input.toolId);
    assertCanBorrow(user, tool);

    const approved = await loanRepository.listForTool(ctx.db, tool._id, "approved");
    if (approved.some((l) => rangesOverlap(l, input))) {
      throw domainError("CONFLICT", "The tool is already lent out for some of those dates.");
    }
    const pending = await loanRepository.listForTool(ctx.db, tool._id, "requested");
    if (pending.some((l) => l.borrowerId === user._id && rangesOverlap(l, input))) {
      throw domainError("CONFLICT", "You already have a pending request for those dates.");
    }

    const loanId = await loanRepository.insert(ctx.db, {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "requested",
    });
    const loan = (await loanRepository.get(ctx.db, loanId))!;
    await outboxService.enqueueLoanEvent(ctx, loan, tool);
    return loanId;
  },

  /** Approves one request and declines any other pending requests it now clashes with. */
  async approve(ctx: MutationCtx, user: User, loanId: Id<"loans">): Promise<void> {
    const loan = await getLoan(ctx.db, loanId);
    assertIsLender(user, loan);
    assertTransition(loan.status, "approved");
    if (loan.endDate < todayUtc()) {
      throw domainError("CONFLICT", "These dates have passed. Decline the request instead.");
    }
    const approved = await loanRepository.listForTool(ctx.db, loan.toolId, "approved");
    if (approved.some((l) => l._id !== loan._id && rangesOverlap(l, loan))) {
      throw domainError("CONFLICT", "Another approved loan already covers these dates.");
    }
    await transition(ctx, loan, "approved");

    const pending = await loanRepository.listForTool(ctx.db, loan.toolId, "requested");
    for (const other of pending) {
      if (other._id !== loan._id && rangesOverlap(other, loan)) {
        await transition(ctx, other, "declined");
      }
    }
  },

  async decline(ctx: MutationCtx, user: User, loanId: Id<"loans">): Promise<void> {
    const loan = await getLoan(ctx.db, loanId);
    assertIsLender(user, loan);
    await transition(ctx, loan, "declined");
  },

  async cancel(ctx: MutationCtx, user: User, loanId: Id<"loans">): Promise<void> {
    const loan = await getLoan(ctx.db, loanId);
    assertIsBorrower(user, loan);
    await transition(ctx, loan, "cancelled");
  },

  async markReturned(ctx: MutationCtx, user: User, loanId: Id<"loans">): Promise<void> {
    const loan = await getLoan(ctx.db, loanId);
    assertIsLender(user, loan);
    await transition(ctx, loan, "returned");
    // Anyone waiting for this tool hears it's back.
    const tool = await toolRepository.get(ctx.db, loan.toolId);
    if (tool && tool.removedAt === undefined) await watchService.notifyAvailable(ctx, tool);
  },

  async myRequests(db: DatabaseReader, user: User) {
    return describe(db, await loanRepository.listByBorrower(db, user._id));
  },

  async incoming(db: DatabaseReader, user: User) {
    return describe(db, await loanRepository.listByLender(db, user._id));
  },

  async allForAdmin(db: DatabaseReader) {
    return describe(db, await loanRepository.listRecent(db, 200));
  },
};
