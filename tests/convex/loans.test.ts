import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { addDays, drill, setup } from "./helpers";

describe("loan rules", () => {
  it("approving one request declines overlapping pending requests", async () => {
    const { t, alice, bob, admin } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const first = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(3) });
    const clash = await admin.mutation(api.loans.request, { toolId, startDate: addDays(2), endDate: addDays(4) });
    await alice.mutation(api.loans.approve, { loanId: first });

    const status = await t.run(async (ctx) => (await ctx.db.get(clash))?.status);
    expect(status).toBe("declined");
    await expect(
      admin.mutation(api.loans.request, { toolId, startDate: addDays(3), endDate: addDays(5) }),
    ).rejects.toThrow(/already lent out/);
  });

  it("rejects bad date ranges", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await expect(bob.mutation(api.loans.request, { toolId, startDate: addDays(-1), endDate: addDays(1) })).rejects.toThrow(/past/);
    await expect(bob.mutation(api.loans.request, { toolId, startDate: addDays(3), endDate: addDays(1) })).rejects.toThrow(/end date/);
    await expect(bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(40) })).rejects.toThrow(/at most/);
  });

  it("cannot approve a loan twice", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    await alice.mutation(api.loans.approve, { loanId });
    await expect(alice.mutation(api.loans.approve, { loanId })).rejects.toThrow(/cannot be marked/);
  });
});

describe("outbox", () => {
  it("every loan change writes an event with only the needed fields", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    await alice.mutation(api.loans.approve, { loanId });

    const rows = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(rows.map((r) => r.payload.type)).toEqual(["loan.requested", "loan.approved"]);
    expect(rows[0].payload.recipient.email).toBe("alice@example.com"); // lender hears about a request
    expect(rows[1].payload.recipient.email).toBe("bob@example.com"); // borrower hears about approval
    expect(Object.keys(rows[0].payload).sort()).toEqual(
      ["eventId", "loan", "occurredAt", "recipient", "tool", "type"],
    );
    expect(rows.every((r) => r.status === "pending" && r.payload.eventId === r.eventId)).toBe(true);
  });

  it("failed deliveries back off, then stop as failed after 5 attempts", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    const [row] = await t.run((ctx) => ctx.db.query("outbox").collect());

    for (let i = 1; i <= 5; i++) {
      await t.run((ctx) => ctx.db.patch(row._id, { nextAttemptAt: 0 }));
      expect(await t.mutation(internal.outbox.claim, { outboxId: row._id })).not.toBeNull();
      await t.mutation(internal.outbox.complete, { outboxId: row._id, ok: false, error: "n8n down" });
    }
    const after = await t.run((ctx) => ctx.db.get(row._id));
    expect(after).toMatchObject({ status: "failed", attempts: 5, lastError: "n8n down" });
  });

  it("a row cannot be claimed twice at once", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    const [row] = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(await t.mutation(internal.outbox.claim, { outboxId: row._id })).not.toBeNull();
    expect(await t.mutation(internal.outbox.claim, { outboxId: row._id })).toBeNull();
  });
});

describe("reminders", () => {
  it("write-back is idempotent", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    const args = { loanId, idempotencyKey: `${loanId}:${addDays(0)}`, status: "sent" as const, channel: "mock-log" };

    expect(await t.mutation(internal.automation.recordReminder, args)).toEqual({ created: true });
    expect(await t.mutation(internal.automation.recordReminder, args)).toEqual({ created: false });
    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
  });

  it("overdue list includes only approved loans past their end date, once per day", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    await alice.mutation(api.loans.approve, { loanId });
    await t.run((ctx) => ctx.db.patch(loanId, { startDate: addDays(-5), endDate: addDays(-2) }));

    const { loans } = await t.query(internal.automation.overdueLoans, {});
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({ daysOverdue: 2, borrower: { email: "bob@example.com" } });

    await t.mutation(internal.automation.recordReminder, {
      loanId, idempotencyKey: loans[0].idempotencyKey, status: "sent", channel: "mock-log",
    });
    expect((await t.query(internal.automation.overdueLoans, {})).loans).toHaveLength(0);
  });
});
