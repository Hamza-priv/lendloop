// Transactional outbox for loan events.
//
// 1. enqueueLoanEvent() runs inside the same mutation that changed the loan, so
//    the loan change and its event are committed together or not at all.
// 2. The `deliver` action (convex/outbox.ts) claims a row, sends it to n8n and
//    reports back through complete().
// 3. Failures are retried with growing delays; after MAX_ATTEMPTS the row is
//    marked "failed" and shown on the admin page, so nothing fails silently.
// 4. A cron sweep picks up rows whose scheduled delivery was lost.
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { EVENT_FOR_STATUS, recipientRole } from "../domain/loan";
import { domainError } from "../domain/errors";
import { outboxRepository } from "../repositories/outboxRepository";
import { userRepository } from "../repositories/userRepository";
import { notificationService } from "./notificationService";

const LOAN_NOTE: Record<Doc<"loans">["status"], { title: (other: string, tool: string) => string; link: string }> = {
  requested: { title: (o, t) => `${o} wants to borrow your ${t}`, link: "/incoming" },
  approved: { title: (o, t) => `${o} approved your request for the ${t}`, link: "/requests" },
  declined: { title: (o, t) => `${o} declined your request for the ${t}`, link: "/requests" },
  cancelled: { title: (o, t) => `${o} cancelled their request for your ${t}`, link: "/incoming" },
  returned: { title: (o, t) => `${o} marked the ${t} as returned`, link: "/requests" },
};

export const MAX_ATTEMPTS = 5;
export const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 30 * 60_000, 2 * 3_600_000];
export const LEASE_MS = 60_000;

export const outboxService = {
  async enqueueLoanEvent(
    ctx: MutationCtx,
    loan: Doc<"loans">,
    tool: Pick<Doc<"tools">, "name">,
  ): Promise<void> {
    const type = EVENT_FOR_STATUS[loan.status];
    const recipientId = recipientRole(type) === "lender" ? loan.lenderId : loan.borrowerId;
    const recipient = await userRepository.get(ctx.db, recipientId);
    if (!recipient) return;
    const otherId = recipientId === loan.lenderId ? loan.borrowerId : loan.lenderId;
    const other = await userRepository.get(ctx.db, otherId);

    // In-app notification (the bell), next to the email below.
    const note = LOAN_NOTE[loan.status];
    await notificationService.notify(ctx, recipientId, {
      kind: "loan",
      title: note.title(other?.name ?? "A neighbour", tool.name),
      body: `${loan.startDate} to ${loan.endDate}`,
      link: note.link,
    });

    const now = Date.now();
    const eventId = crypto.randomUUID();
    const outboxId = await outboxRepository.insert(ctx.db, {
      eventId,
      loanId: loan._id,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      payload: {
        eventId,
        type,
        occurredAt: new Date(now).toISOString(),
        loan: {
          id: loan._id,
          status: loan.status,
          startDate: loan.startDate,
          endDate: loan.endDate,
        },
        tool: { name: tool.name },
        recipient: { name: recipient.name, email: recipient.email },
      },
    });
    await ctx.scheduler.runAfter(0, internal.outbox.deliver, { outboxId });
  },

  /** Queues an email that isn't a loan status change (new message, tool available again). */
  async enqueueNotification(
    ctx: MutationCtx,
    recipientId: Id<"users">,
    event: {
      type: "message.received" | "tool.available" | "wanted.match";
      toolName: string;
      link: string;
      message?: { from: string; preview: string };
      wanted?: { title: string };
    },
  ): Promise<void> {
    const recipient = await userRepository.get(ctx.db, recipientId);
    if (!recipient?.email) return;
    const now = Date.now();
    const eventId = crypto.randomUUID();
    const outboxId = await outboxRepository.insert(ctx.db, {
      eventId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      payload: {
        eventId,
        type: event.type,
        occurredAt: new Date(now).toISOString(),
        recipient: { name: recipient.name, email: recipient.email },
        tool: { name: event.toolName },
        link: event.link,
        ...(event.message ? { message: event.message } : {}),
        ...(event.wanted ? { wanted: event.wanted } : {}),
      },
    });
    await ctx.scheduler.runAfter(0, internal.outbox.deliver, { outboxId });
  },

  /** Marks a row as being delivered. Returns null if it is not deliverable now. */
  async claim(ctx: MutationCtx, outboxId: Id<"outbox">, now: number) {
    const row = await outboxRepository.get(ctx.db, outboxId);
    if (!row) return null;
    const leaseExpired = row.status === "sending" && (row.leaseUntil ?? 0) < now;
    const due = row.status === "pending" && row.nextAttemptAt <= now;
    if (!due && !leaseExpired) return null;
    await outboxRepository.patch(ctx.db, outboxId, {
      status: "sending",
      leaseUntil: now + LEASE_MS,
    });
    return row.payload;
  },

  async complete(
    ctx: MutationCtx,
    outboxId: Id<"outbox">,
    result: { ok: true } | { ok: false; error: string },
    now: number,
  ): Promise<void> {
    const row = await outboxRepository.get(ctx.db, outboxId);
    if (!row || row.status !== "sending") return;

    if (result.ok) {
      await outboxRepository.patch(ctx.db, outboxId, {
        status: "sent",
        sentAt: now,
        leaseUntil: undefined,
        lastError: undefined,
      });
      return;
    }

    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await outboxRepository.patch(ctx.db, outboxId, {
        status: "failed",
        attempts,
        lastError: result.error,
        leaseUntil: undefined,
      });
      return;
    }
    const nextAttemptAt = now + BACKOFF_MS[attempts - 1];
    await outboxRepository.patch(ctx.db, outboxId, {
      status: "pending",
      attempts,
      nextAttemptAt,
      lastError: result.error,
      leaseUntil: undefined,
    });
    await ctx.scheduler.runAt(nextAttemptAt, internal.outbox.deliver, { outboxId });
  },

  /** Safety net run by cron: re-schedules due rows and rows with expired leases. */
  async sweep(ctx: MutationCtx, now: number): Promise<number> {
    const due = await outboxRepository.listDue(ctx.db, now, 50);
    const stuck = await outboxRepository.listExpiredLeases(ctx.db, now, 50);
    for (const row of [...due, ...stuck]) {
      await ctx.scheduler.runAfter(0, internal.outbox.deliver, { outboxId: row._id });
    }
    return due.length + stuck.length;
  },

  /** Admin action: give a failed row a fresh set of attempts. */
  async retry(ctx: MutationCtx, outboxId: Id<"outbox">): Promise<void> {
    const row = await outboxRepository.get(ctx.db, outboxId);
    if (!row) throw domainError("NOT_FOUND", "Event not found.");
    if (row.status !== "failed") throw domainError("CONFLICT", "Only failed events can be retried.");
    const now = Date.now();
    await outboxRepository.patch(ctx.db, outboxId, {
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.outbox.deliver, { outboxId });
  },
};
