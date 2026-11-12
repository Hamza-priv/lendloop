import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { detectCrisis } from "../../convex/domain/safety";
import { addDays, drill, setup } from "./helpers";

// Scheduled work (n8n deliveries, AI replies) must not run in tests.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

type T = Awaited<ReturnType<typeof setup>>["t"];
const outboxTypes = (t: T) => t.run(async (ctx) => (await ctx.db.query("outbox").collect()).map((r) => r.payload.type));

describe("assistant crisis safety", () => {
  it.each([
    "Hi i want to kill myself what to do",
    "I've been thinking about suicide",
    "honestly I just want to die",
    "how do I hurt myself without anyone noticing",
    "everyone would be better off dead without me",
    "which of the tools would be strongest to hang myself with",
    "I don't want to be here anymore",
    "i just want it all to stop forever",
  ])("answers %j with help, without calling the AI", async (text) => {
    const { alice } = await setup();
    await alice.mutation(api.assistant.ask, { text });
    const thread = await alice.query(api.assistant.thread, {});
    expect(thread?.status).toBe("idle"); // no model call scheduled
    const reply = thread!.messages.at(-1)!;
    expect(reply.role).toBe("assistant");
    expect(reply.text).toMatch(/emergency number/);
    expect(reply.text).toMatch(/findahelpline\.com/);
    expect(reply.text).toMatch(/988/);
  });

  it("flags threats to others, and leaves ordinary tool talk alone", () => {
    expect(detectCrisis("I'm going to hurt my neighbour")).toBe("harm_others");
    expect(detectCrisis("This drill will kill it on the shelves")).toBeNull();
    expect(detectCrisis("I need something to kill weeds")).toBeNull();
    expect(detectCrisis("can I borrow a saw to cut myself a plank")).toBe("self_harm"); // errs on the safe side
  });
});

describe("messaging", () => {
  it("lets a borrower message an owner about a tool, privately", async () => {
    const { t, alice, bob, admin } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const conv = await bob.mutation(api.messages.startAboutTool, { toolId });
    // Same pair + tool reuses the conversation.
    expect(await bob.mutation(api.messages.startAboutTool, { toolId })).toBe(conv);

    await bob.mutation(api.messages.send, { conversationId: conv, body: "Hi! Is the drill free Saturday?" });
    expect(await alice.query(api.messages.unreadCount, {})).toBe(1);
    const thread = await alice.query(api.messages.thread, { conversationId: conv });
    expect(thread.other.name).toBe("bob");
    expect(thread.messages.map((m) => [m.mine, m.body])).toEqual([[false, "Hi! Is the drill free Saturday?"]]);
    expect(JSON.stringify(thread)).not.toContain("@example.com");

    // Not a participant: can't read or write.
    await expect(admin.query(api.messages.thread, { conversationId: conv })).rejects.toThrow(/not found/);
    await expect(admin.mutation(api.messages.send, { conversationId: conv, body: "hi" })).rejects.toThrow(/not found/);
    await expect(alice.mutation(api.messages.startAboutTool, { toolId })).rejects.toThrow(/yourself/);
    expect(await t.query(api.messages.unreadCount, {})).toBe(0);
  });

  it("emails once per unread streak, like LinkedIn, and groups the bell notification", async () => {
    const { t, alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const conv = await bob.mutation(api.messages.startAboutTool, { toolId });

    await bob.mutation(api.messages.send, { conversationId: conv, body: "one" });
    await bob.mutation(api.messages.send, { conversationId: conv, body: "two" });
    expect((await outboxTypes(t)).filter((x) => x === "message.received")).toHaveLength(1);
    const notes = await alice.query(api.notifications.list, {});
    expect(notes.filter((n) => n.kind === "message")).toHaveLength(1);
    expect(notes[0].body).toBe("two");

    // Alice reads, Bob writes again: a new email.
    await alice.mutation(api.messages.markRead, { conversationId: conv });
    expect(await alice.query(api.messages.unreadCount, {})).toBe(0);
    await bob.mutation(api.messages.send, { conversationId: conv, body: "three" });
    expect((await outboxTypes(t)).filter((x) => x === "message.received")).toHaveLength(2);
  });

  it("validates message length and rate", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const conv = await bob.mutation(api.messages.startAboutTool, { toolId });
    await expect(bob.mutation(api.messages.send, { conversationId: conv, body: "  " })).rejects.toThrow(/Write a message/);
    await expect(bob.mutation(api.messages.send, { conversationId: conv, body: "x".repeat(2001) })).rejects.toThrow(/2000/);
    for (let i = 0; i < 30; i++) await bob.mutation(api.messages.send, { conversationId: conv, body: `m${i}` });
    await expect(bob.mutation(api.messages.send, { conversationId: conv, body: "too many" })).rejects.toThrow(/very fast/);
  });

  it("either side of a loan can open a chat about it", async () => {
    const { alice, bob, admin } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    const fromBob = await bob.mutation(api.messages.startAboutLoan, { loanId });
    expect(await alice.mutation(api.messages.startAboutLoan, { loanId })).toBe(fromBob);
    await expect(admin.mutation(api.messages.startAboutLoan, { loanId })).rejects.toThrow(/not found/);
  });
});

describe("notifications", () => {
  it("loan changes show in the bell for the right person", async () => {
    const { alice, bob } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(1), endDate: addDays(2) });
    expect((await alice.query(api.notifications.list, {}))[0].title).toBe("bob wants to borrow your Cordless drill");
    await alice.mutation(api.loans.approve, { loanId });
    const [n] = await bob.query(api.notifications.list, {});
    expect(n).toMatchObject({ kind: "loan", link: "/requests", read: false });
    expect(n.title).toMatch(/approved your request/);

    await bob.mutation(api.notifications.markAllRead, {});
    expect((await bob.query(api.notifications.list, {})).every((x) => x.read)).toBe(true);
  });
});

describe("notify me when available", () => {
  it("tells watchers once when the tool is returned, by bell and email", async () => {
    const { t, alice, bob, admin } = await setup();
    const toolId = await alice.mutation(api.tools.create, drill);
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: addDays(0), endDate: addDays(2) });
    await alice.mutation(api.loans.approve, { loanId });

    await admin.mutation(api.tools.watch, { toolId, on: true });
    expect((await admin.query(api.tools.browse, {}))[0].watching).toBe(true);
    await expect(alice.mutation(api.tools.watch, { toolId, on: true })).rejects.toThrow(/own tool/);

    await alice.mutation(api.loans.markReturned, { loanId });
    const [n] = await admin.query(api.notifications.list, {});
    expect(n).toMatchObject({ kind: "available", title: "The Cordless drill is available again", link: `/tools?tool=${toolId}` });
    expect(await outboxTypes(t)).toContain("tool.available");
    // The watch is used up.
    expect((await admin.query(api.tools.browse, {}))[0].watching).toBe(false);
  });
});
