// Role-based access control is enforced in Convex functions, not only in the UI.
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { addDays, drill, setup } from "./helpers";

const forbidden = expect.objectContaining({ data: expect.objectContaining({ code: "FORBIDDEN" }) });

describe("tools", () => {
  it("public list shows name and category only", async () => {
    const { t, alice } = await setup();
    await alice.mutation(api.tools.create, drill);
    const list = await t.query(api.tools.listPublic, {});
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]).sort()).toEqual(["_id", "category", "name"]);
  });

  it("signed-out users cannot browse or create", async () => {
    const { t } = await setup();
    await expect(t.query(api.tools.browse, {})).rejects.toThrow();
    await expect(t.mutation(api.tools.create, drill)).rejects.toThrow();
  });

  it("only the owner can edit or delete a listing", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await expect(bob.mutation(api.tools.update, { toolId, ...drill, name: "Mine now" })).rejects.toEqual(forbidden);
    await expect(bob.mutation(api.tools.remove, { toolId })).rejects.toEqual(forbidden);
    await alice.mutation(api.tools.update, { toolId, ...drill, name: "Drill v2" });
  });

  it("a user cannot borrow their own tool", async () => {
    const { alice } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await expect(
      alice.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) }),
    ).rejects.toThrow(/own tool/);
  });
});

describe("loans", () => {
  it("only the lender can approve, decline or mark returned", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(3) });

    await expect(bob.mutation(api.loans.approve, { loanId })).rejects.toEqual(forbidden);
    await alice.mutation(api.loans.approve, { loanId });
    await expect(bob.mutation(api.loans.markReturned, { loanId })).rejects.toEqual(forbidden);
    await alice.mutation(api.loans.markReturned, { loanId });
  });

  it("only the borrower can cancel a pending request", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    await expect(alice.mutation(api.loans.cancel, { loanId })).rejects.toEqual(forbidden);
    await bob.mutation(api.loans.cancel, { loanId });
  });

  it("users only see loans they are part of", async () => {
    const { alice, bob, admin } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    expect(await admin.query(api.loans.myRequests, {})).toHaveLength(0);
    expect(await admin.query(api.loans.incoming, {})).toHaveLength(0);
    expect(await bob.query(api.loans.myRequests, {})).toHaveLength(1);
    expect(await alice.query(api.loans.incoming, {})).toHaveLength(1);
  });
});

describe("admin", () => {
  it("regular users cannot call admin functions", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const me = await bob.query(api.users.me, {});
    await expect(bob.query(api.admin.allLoans, {})).rejects.toEqual(forbidden);
    await expect(bob.mutation(api.admin.removeListing, { toolId })).rejects.toEqual(forbidden);
    await expect(bob.mutation(api.admin.setTrustedLender, { userId: me!._id, trusted: true })).rejects.toEqual(forbidden);
  });

  it("admin role comes from ADMIN_EMAILS, and admins can remove any listing", async () => {
    const { alice, admin } = await setup();
    expect((await admin.query(api.users.me, {}))?.role).toBe("admin");
    expect((await alice.query(api.users.me, {}))?.role).toBe("user");
    const toolId = await alice.mutation(api.tools.create, drill);
    await admin.mutation(api.admin.removeListing, { toolId });
    expect(await alice.query(api.tools.mine, {})).toHaveLength(0);
  });

  it("admin can mark a Trusted Lender", async () => {
    const { alice, admin } = await setup();
    const me = await alice.query(api.users.me, {});
    await admin.mutation(api.admin.setTrustedLender, { userId: me!._id, trusted: true });
    expect((await alice.query(api.users.me, {}))?.trustedLender).toBe(true);
  });
});
