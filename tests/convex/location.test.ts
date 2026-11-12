import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { addDays, drill, setup } from "./helpers";

const gate = { lat: 51.50072, lng: -0.12463, label: "Side gate" };

describe("tool pickup location", () => {
  it("is shown to signed-in users but never on the public list", async () => {
    const { t, alice, bob } = await setup();
    await alice.mutation(api.tools.create, { ...drill, location: gate });

    const [publicTool] = await t.query(api.tools.listPublic, {});
    expect(publicTool).toEqual({ _id: expect.anything(), name: drill.name, category: drill.category });
    expect(JSON.stringify(publicTool)).not.toContain("51.5");

    const [browsed] = await bob.query(api.tools.browse, {});
    expect(browsed.location).toEqual(gate);
  });

  it("travels with the loan so an approved borrower can get directions", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, { ...drill, location: gate });
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    await alice.mutation(api.loans.approve, { loanId });
    expect((await bob.query(api.loans.myRequests, {}))[0].tool.location).toEqual(gate);
  });

  it("can be added, changed, kept and removed when editing", async () => {
    const { alice } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    expect((await alice.query(api.tools.mine, {}))[0].location).toBeUndefined();

    await alice.mutation(api.tools.update, { toolId, ...drill, location: gate });
    expect((await alice.query(api.tools.mine, {}))[0].location).toEqual(gate);

    // Omitted: unchanged.
    await alice.mutation(api.tools.update, { toolId, ...drill, name: "Drill v2" });
    expect((await alice.query(api.tools.mine, {}))[0].location).toEqual(gate);

    // null: removed.
    await alice.mutation(api.tools.update, { toolId, ...drill, location: null });
    expect((await alice.query(api.tools.mine, {}))[0].location).toBeUndefined();
  });

  it("only the owner can change it", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, { ...drill, location: gate });
    await expect(bob.mutation(api.tools.update, { toolId, ...drill, location: null })).rejects.toThrow();
  });

  it("rejects invalid coordinates and long names, and rounds to about a metre", async () => {
    const { alice } = await setup();
    await expect(alice.mutation(api.tools.create, { ...drill, location: { lat: 91, lng: 0, label: "" } })).rejects.toThrow(/not valid/);
    await expect(alice.mutation(api.tools.create, { ...drill, location: { lat: 0, lng: 181, label: "" } })).rejects.toThrow(/not valid/);
    await expect(
      alice.mutation(api.tools.create, { ...drill, location: { lat: 0, lng: 0, label: "x".repeat(121) } }),
    ).rejects.toThrow(/at most 120/);

    await alice.mutation(api.tools.create, { ...drill, location: { lat: 51.500723456, lng: -0.124634567, label: " Gate " } });
    expect((await alice.query(api.tools.mine, {}))[0].location).toEqual({ lat: 51.50072, lng: -0.12463, label: "Gate" });
  });
});
