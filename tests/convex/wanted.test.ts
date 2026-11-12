import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { keywords, matches } from "../../convex/services/wantedService";
import { drill, setup } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("wanted board", () => {
  it("posts a request everyone signed in can see, without contact details", async () => {
    const { t, alice, bob } = await setup();
    await alice.mutation(api.wanted.create, { title: "Screwdriver set", details: "Flat and Phillips, for one afternoon" });
    const [post] = await bob.query(api.wanted.list, {});
    expect(post).toMatchObject({ title: "Screwdriver set", isMine: false, requester: { name: "alice" } });
    expect(JSON.stringify(post)).not.toContain("@example.com");
    await expect(t.query(api.wanted.list, {})).rejects.toThrow();
  });

  it("validates input and caps open requests per person", async () => {
    const { alice } = await setup();
    await expect(alice.mutation(api.wanted.create, { title: "ab", details: "" })).rejects.toThrow(/3-80/);
    await expect(alice.mutation(api.wanted.create, { title: "Ladder", details: "x".repeat(501) })).rejects.toThrow(/500/);
    await expect(alice.mutation(api.wanted.create, { title: "Ladder", details: "", neededBy: "soon" })).rejects.toThrow(/date/);
    for (let i = 0; i < 5; i++) await alice.mutation(api.wanted.create, { title: `Thing ${i}`, details: "" });
    await expect(alice.mutation(api.wanted.create, { title: "One more", details: "" })).rejects.toThrow(/5 open requests/);
  });

  it("'I have one' opens a chat with an automatic first message, once", async () => {
    const { alice, bob } = await setup();
    const wantedId = await alice.mutation(api.wanted.create, { title: "Screwdriver", details: "" });
    const conv = await bob.mutation(api.wanted.respond, { wantedId });
    expect(await bob.mutation(api.wanted.respond, { wantedId })).toBe(conv);

    const thread = await alice.query(api.messages.thread, { conversationId: conv });
    expect(thread.wanted).toEqual({ title: "Screwdriver" });
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].body).toMatch(/looking for: Screwdriver/);
    const [note] = await alice.query(api.notifications.list, {});
    expect(note.title).toBe("bob replied to your request: Screwdriver");
    expect((await alice.query(api.wanted.list, {}))[0].offers).toBe(1);

    await expect(alice.mutation(api.wanted.respond, { wantedId })).rejects.toThrow(/own request/);
  });

  it("closed or expired requests disappear and can't be answered", async () => {
    const { alice, bob } = await setup();
    const a = await alice.mutation(api.wanted.create, { title: "Ladder", details: "" });
    await alice.mutation(api.wanted.close, { wantedId: a });
    await expect(bob.mutation(api.wanted.respond, { wantedId: a })).rejects.toThrow(/closed/);
    await expect(bob.mutation(api.wanted.close, { wantedId: a })).rejects.toThrow(/not found/);

    await alice.mutation(api.wanted.create, { title: "Tent", details: "" });
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await bob.query(api.wanted.list, {})).toEqual([]);
  });

  it("tells the person who asked when a matching tool is listed", async () => {
    const { t, alice, bob } = await setup();
    await alice.mutation(api.wanted.create, { title: "Need a cordless drill", details: "" });
    await alice.mutation(api.wanted.create, { title: "Pressure washer", details: "" });
    const toolId = await bob.mutation(api.tools.create, drill); // "Cordless drill"

    const notes = await alice.query(api.notifications.list, {});
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ kind: "wanted", title: "A Cordless drill was just listed", link: `/tools?tool=${toolId}` });
    const types = await t.run(async (ctx) => (await ctx.db.query("outbox").collect()).map((r) => r.payload.type));
    expect(types).toContain("wanted.match");

    // Your own listing never notifies you.
    await alice.mutation(api.tools.create, { ...drill, name: "Pressure washer" });
    expect(await alice.query(api.notifications.list, {})).toHaveLength(1);
  });

  it("matching ignores filler words and plurals", () => {
    expect(keywords("Looking for some ladders")).toEqual(["ladder"]);
    const tool = { name: "Extension ladder", description: "3.5m aluminium", category: "other" as const };
    expect(matches({ title: "a ladder please", category: undefined }, tool)).toBe(true);
    expect(matches({ title: "ladder", category: "garden" }, tool)).toBe(false);
    expect(matches({ title: "Socket set", category: undefined }, tool)).toBe(false);
  });
});
