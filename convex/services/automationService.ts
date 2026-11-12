// What n8n is allowed to read and write. Only called from signed HTTP endpoints.
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { daysBetween, isValidDate, reminderKey, todayUtc } from "../domain/loan";
import { automationErrorRepository } from "../repositories/automationErrorRepository";
import { loanRepository } from "../repositories/loanRepository";
import { reminderRepository } from "../repositories/reminderRepository";
import { toolRepository } from "../repositories/toolRepository";
import { userRepository } from "../repositories/userRepository";

export const automationService = {
  /**
   * Overdue loans that have not had a reminder today. Returns only what the
   * reminder needs: borrower name and email, tool name, end date.
   */
  async overdueLoans(db: DatabaseReader) {
    const asOf = todayUtc();
    const loans = await loanRepository.listOverdue(db, asOf);
    const tools = await toolRepository.getMany(db, loans.map((l) => l.toolId));
    const borrowers = await userRepository.getMany(db, loans.map((l) => l.borrowerId));

    const result = [];
    for (const loan of loans) {
      const key = reminderKey(loan._id, asOf);
      if (await reminderRepository.getByKey(db, key)) continue;
      const borrower = borrowers.get(loan.borrowerId);
      if (!borrower) continue;
      result.push({
        loanId: loan._id,
        idempotencyKey: key,
        borrower: { name: borrower.name, email: borrower.email },
        tool: { name: tools.get(loan.toolId)?.name ?? "a tool" },
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, asOf),
      });
    }
    return { asOf, loans: result };
  },

  /** Idempotent: the same idempotencyKey always maps to one reminder record. */
  async recordReminder(
    ctx: MutationCtx,
    input: {
      loanId: Id<"loans">;
      idempotencyKey: string;
      status: "sent" | "failed";
      channel: string;
      executionId?: string;
    },
  ): Promise<{ created: boolean } | { error: string }> {
    const [keyLoanId, keyDate] = input.idempotencyKey.split(":");
    if (keyLoanId !== input.loanId || !keyDate || !isValidDate(keyDate)) {
      return { error: "idempotencyKey does not match loanId" };
    }
    const loan = await loanRepository.get(ctx.db, input.loanId);
    if (!loan) return { error: "loan not found" };

    const { created } = await reminderRepository.insertIfAbsent(ctx.db, {
      loanId: input.loanId,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      channel: input.channel.slice(0, 40),
      sentAt: Date.now(),
      executionId: input.executionId?.slice(0, 100),
    });
    return { created };
  },

  async recordError(
    ctx: MutationCtx,
    input: { workflow: string; node?: string; message: string; executionId?: string },
  ): Promise<void> {
    await automationErrorRepository.insert(ctx.db, {
      workflow: input.workflow.slice(0, 120),
      node: input.node?.slice(0, 120),
      message: input.message.slice(0, 1000),
      executionId: input.executionId?.slice(0, 100),
    });
  },
};
