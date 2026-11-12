import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { drill, setup } from "./helpers";

// Scheduled AI replies must not run in tests (no API keys, no network).
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("assistant", () => {
  it("stores the question, shows it, and marks the thread as thinking", async () => {
    const { alice } = await setup();
    await alice.mutation(api.assistant.ask, { text: "  Need a drill  " });
    const thread = await alice.query(api.assistant.thread, {});
    expect(thread?.status).toBe("thinking");
    expect(thread?.messages.map((m) => [m.role, m.text])).toEqual([["user", "Need a drill"]]);

    // A second question while the first is being answered is refused.
    await expect(alice.mutation(api.assistant.ask, { text: "Hello?" })).rejects.toThrow(/still answering/);
  });

  it("rejects empty and over-long questions, and signed-out users", async () => {
    const { t, alice } = await setup();
    await expect(alice.mutation(api.assistant.ask, { text: "   " })).rejects.toThrow(/Type a question/);
    await expect(alice.mutation(api.assistant.ask, { text: "x".repeat(1001) })).rejects.toThrow(/1000/);
    await expect(t.mutation(api.assistant.ask, { text: "hi" })).rejects.toThrow();
    expect(await t.query(api.assistant.thread, {})).toBeNull();
  });

  it("limits questions per hour", async () => {
    const { t, alice } = await setup();
    for (let i = 0; i < 20; i++) {
      await alice.mutation(api.assistant.ask, { text: `q${i}` });
      const userId = (await alice.query(api.users.me, {}))!._id;
      await t.mutation(internal.assistant.finish, { userId });
    }
    await expect(alice.mutation(api.assistant.ask, { text: "one more" })).rejects.toThrow(/this hour/);
  });

  it("hides tool turns and keeps each user's chat private; New chat clears it", async () => {
    const { t, alice, bob } = await setup();
    await alice.mutation(api.assistant.ask, { text: "What can I borrow?" });
    const userId = (await alice.query(api.users.me, {}))!._id;
    await t.mutation(internal.assistant.append, { userId, role: "assistant", provider: "gemini", contentJson: "{}" });
    await t.mutation(internal.assistant.append, { userId, role: "user", provider: "gemini", contentJson: "{}" });
    await t.mutation(internal.assistant.append, {
      userId,
      role: "assistant",
      provider: "gemini",
      contentJson: "{}",
      text: "Try the drill.",
    });
    await t.mutation(internal.assistant.finish, { userId });

    const thread = await alice.query(api.assistant.thread, {});
    expect(thread?.messages.map((m) => m.text)).toEqual(["What can I borrow?", "Try the drill."]);
    expect(thread?.turnsLeft).toBe(29);
    expect((await bob.query(api.assistant.thread, {}))?.messages).toEqual([]);

    await alice.mutation(api.assistant.reset, {});
    expect((await alice.query(api.assistant.thread, {}))?.messages).toEqual([]);
  });

  it("search tool returns only what Browse shows: no emails or coordinates", async () => {
    const { t, alice, bob } = await setup();
    await alice.mutation(api.tools.create, { ...drill, location: { lat: 51.5, lng: -0.12, label: "Side gate" } });
    const bobId = (await bob.query(api.users.me, {}))!._id;

    const results = await t.query(internal.assistant.searchTools, { userId: bobId, query: "drill", availableOnly: false });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: drill.name, owner: "alice", pickupPlace: "Side gate", availability: "available now" });
    const json = JSON.stringify(results);
    expect(json).not.toContain("@example.com");
    expect(json).not.toContain("51.5");

    expect(await t.query(internal.assistant.searchTools, { userId: bobId, query: "tent", availableOnly: false })).toEqual([]);
  });
});
