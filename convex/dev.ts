// Dev-only helpers for trying LendLoop alone: demo neighbours request, reply,
// approve and post on the Wanted board, and the assistant can be tested from the
// CLI. All are internal functions: the browser can never call them.
//   node node_modules/convex/bin/main.js run dev:<name> '<json args>'
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { askAs } from "./assistant";
import { todayUtc } from "./domain/loan";
import { loanRepository } from "./repositories/loanRepository";
import { toolRepository } from "./repositories/toolRepository";
import { userRepository } from "./repositories/userRepository";
import { loanService } from "./services/loanService";
import { messagingService } from "./services/messagingService";
import { toolService } from "./services/toolService";
import { wantedService } from "./services/wantedService";

function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Dev helper so one person can test the lender side alone: a demo neighbour asks
 * to borrow your newest tool. `npx convex run dev:demoRequest '{"email":"you@example.com"}'`
 * Internal only, so the browser can never call it.
 */
export const demoRequest = internalMutation({
  args: {
    email: v.string(),
    borrower: v.optional(v.union(v.literal("amira"), v.literal("ben"), v.literal("chloe"))),
    startInDays: v.optional(v.number()),
  },
  handler: async (ctx, { email, borrower = "chloe", startInDays = 2 }) => {
    const owner = await userRepository.getByEmail(ctx.db, email);
    if (!owner) throw new Error(`No user with email ${email}. Sign in once first.`);
    const tools = (await toolRepository.listByOwner(ctx.db, owner._id)).sort((a, b) => b._creationTime - a._creationTime);
    if (tools.length === 0) throw new Error("List a tool first.");
    const demo = await userRepository.getByToken(ctx.db, `seed|${borrower}`);
    if (!demo) throw new Error("Run dev:run first.");

    const today = todayUtc();
    await loanService.request(ctx, demo, {
      toolId: tools[0]._id,
      startDate: shiftDays(today, startInDays),
      endDate: shiftDays(today, startInDays + 2),
    });
    return `${demo.name} asked to borrow ${tools[0].name}.`;
  },
});

/**
 * Dev helper: gives every demo tool a pickup location a short walk from a point,
 * so the map, "Open in Google Maps" and "Near me" have something real to show.
 * `node node_modules/convex/bin/main.js run dev:placeDemoToolsNear '{"lat":51.5072,"lng":-0.1276}'`
 */
export const placeDemoToolsNear = internalMutation({
  args: { lat: v.number(), lng: v.number() },
  handler: async (ctx, { lat, lng }) => {
    // Rough offsets: 0.5 to 2.5 km away in different directions.
    const spots: Record<string, [number, number, string]> = {
      "Cordless drill": [0.004, 0.004, "Amira's porch"],
      "Pressure washer": [0.0045, 0.0035, "Amira's garage"],
      "Two-person tent": [-0.009, 0.008, "Ben's side gate"],
      "Hedge trimmer": [-0.0085, 0.0075, "Ben's shed"],
      "Stand mixer": [0.012, -0.016, "Chloe's building, flat 3"],
      "Socket set": [0.0125, -0.0155, "Chloe's building, flat 3"],
    };
    let n = 0;
    for (const tool of await ctx.db.query("tools").collect()) {
      const spot = spots[tool.name];
      const owner = await userRepository.get(ctx.db, tool.ownerId);
      if (!spot || !owner?.tokenIdentifier.startsWith("seed|")) continue;
      await toolRepository.patch(ctx.db, tool._id, {
        location: { lat: lat + spot[0], lng: lng + spot[1], label: spot[2] },
      });
      n++;
    }
    return `Placed ${n} demo tools near ${lat}, ${lng}.`;
  },
});

/**
 * Dev helper: the demo lender answers your newest pending request.
 * `... run dev:demoRespond '{"email":"you@example.com","action":"approve"}'`
 */
export const demoRespond = internalMutation({
  args: { email: v.string(), action: v.union(v.literal("approve"), v.literal("decline")) },
  handler: async (ctx, { email, action }) => {
    const me = await userRepository.getByEmail(ctx.db, email);
    if (!me) throw new Error(`No user with email ${email}.`);
    const pending = (await loanRepository.listByBorrower(ctx.db, me._id)).find((l) => l.status === "requested");
    if (!pending) throw new Error("You have no pending request.");
    const lender = await userRepository.get(ctx.db, pending.lenderId);
    if (!lender?.tokenIdentifier.startsWith("seed|")) throw new Error("That request is not to a demo neighbour.");
    if (action === "approve") await loanService.approve(ctx, lender, pending._id);
    else await loanService.decline(ctx, lender, pending._id);
    return `${lender.name} ${action === "approve" ? "approved" : "declined"} your request.`;
  },
});

/**
 * Dev helper: the demo neighbour in your newest conversation replies, so you can
 * see the unread badge, the bell and the email.
 * `... run dev:demoReply '{"email":"you@example.com","text":"Sure, Saturday works!"}'`
 */
export const demoReply = internalMutation({
  args: { email: v.string(), text: v.string() },
  handler: async (ctx, { email, text }) => {
    const me = await userRepository.getByEmail(ctx.db, email);
    if (!me) throw new Error(`No user with email ${email}.`);
    const convs = [
      ...(await ctx.db.query("conversations").withIndex("by_userA", (q) => q.eq("userA", me._id)).collect()),
      ...(await ctx.db.query("conversations").withIndex("by_userB", (q) => q.eq("userB", me._id)).collect()),
    ].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    const conv = convs[0];
    if (!conv) throw new Error("You have no conversations.");
    const demo = await userRepository.get(ctx.db, conv.userA === me._id ? conv.userB : conv.userA);
    if (!demo?.tokenIdentifier.startsWith("seed|")) throw new Error("Your newest chat isn't with a demo neighbour.");
    await messagingService.send(ctx, demo, conv._id, text);
    return `${demo.name} replied.`;
  },
});

/**
 * Dev helpers for testing the AI assistant from the command line, through the
 * same path as the chat panel (limits, crisis check, AI call).
 * `... run dev:assistantAsk '{"email":"you@example.com","text":"..."}'`, then `dev:assistantChat`.
 */
export const assistantAsk = internalMutation({
  args: { email: v.string(), text: v.string(), newChat: v.optional(v.boolean()) },
  handler: async (ctx, { email, text, newChat }) => {
    const me = await userRepository.getByEmail(ctx.db, email);
    if (!me) throw new Error(`No user with email ${email}.`);
    if (newChat) {
      for (const m of await ctx.db.query("assistantMessages").withIndex("by_user", (q) => q.eq("userId", me._id)).collect()) {
        await ctx.db.delete(m._id);
      }
    }
    await askAs(ctx, me, text);
    return "Asked.";
  },
});

export const assistantChat = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const me = await userRepository.getByEmail(ctx.db, email);
    if (!me) throw new Error(`No user with email ${email}.`);
    const thread = await ctx.db.query("assistantThreads").withIndex("by_user", (q) => q.eq("userId", me._id)).unique();
    const msgs = await ctx.db.query("assistantMessages").withIndex("by_user", (q) => q.eq("userId", me._id)).collect();
    return {
      status: thread?.status ?? "idle",
      error: thread?.error ?? null,
      messages: msgs.filter((m) => m.text).map((m) => `${m.role}: ${m.text}`),
    };
  },
});

/** Dev helper: clears a user's assistant chat (e.g. after running test questions). */
export const assistantClear = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const me = await userRepository.getByEmail(ctx.db, email);
    if (!me) throw new Error(`No user with email ${email}.`);
    const msgs = await ctx.db.query("assistantMessages").withIndex("by_user", (q) => q.eq("userId", me._id)).collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    return `Cleared ${msgs.length} messages.`;
  },
});

/**
 * Dev helper for the Wanted board: Ben asks for a screwdriver set and a ladder,
 * then Amira lists a step ladder, which should notify Ben (bell + email).
 */
export const demoWanted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ben = await userRepository.getByToken(ctx.db, "seed|ben");
    const amira = await userRepository.getByToken(ctx.db, "seed|amira");
    if (!ben || !amira) throw new Error("Run dev:run first.");
    await wantedService.create(ctx, ben, {
      title: "Screwdriver set",
      details: "Flat-head and Phillips, to put a wardrobe together on Saturday.",
      category: "hand_tools",
    });
    await wantedService.create(ctx, ben, { title: "Ladder", details: "To clear the gutters, one afternoon." });
    await toolService.create(ctx, amira, {
      name: "Step ladder",
      category: "other",
      condition: "good",
      description: "Six steps, folds flat.",
    });
    const notes = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", ben._id)).collect();
    return notes.filter((n) => n.kind === "wanted").map((n) => n.title);
  },
});
