// AI assistant: the parts that run in Convex's default runtime (queries and
// mutations). The Claude call itself is in assistantAgent.ts ("use node").
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { domainError } from "./domain/errors";
import { todayUtc } from "./domain/loan";
import { CRISIS_REPLY, detectCrisis } from "./domain/safety";
import { getCurrentUser, requireUser } from "./lib/auth";
import { categoryValidator } from "./schema";
import { loanService } from "./services/loanService";
import { toolService } from "./services/toolService";

export const LIMITS = {
  messageChars: 1000,
  perHour: 20,
  turnsPerChat: 30,
} as const;

async function threadOf(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db
    .query("assistantThreads")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function messagesOf(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db
    .query("assistantMessages")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

/** What the chat panel shows: visible messages plus whether a reply is on its way. */
export const thread = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const [t, messages] = await Promise.all([threadOf(ctx, user._id), messagesOf(ctx, user._id)]);
    return {
      status: t?.status ?? "idle",
      error: t?.error ?? null,
      turnsLeft: LIMITS.turnsPerChat - messages.filter((m) => m.role === "user" && m.text !== undefined && m.provider === undefined).length,
      messages: messages
        .filter((m) => m.text !== undefined && m.text.trim() !== "")
        .map((m) => ({ _id: m._id, role: m.role, text: m.text!, at: m._creationTime })),
    };
  },
});

/**
 * Saves a question and schedules the reply: limits, crisis check, then the AI.
 * Shared by the `ask` mutation and the dev test helper in seed.ts.
 */
export async function askAs(ctx: MutationCtx, user: Doc<"users">, text: string) {
  const clean = text.trim();
  if (clean.length === 0) throw domainError("INVALID_INPUT", "Type a question first.");
  if (clean.length > LIMITS.messageChars) {
    throw domainError("INVALID_INPUT", `Keep questions under ${LIMITS.messageChars} characters.`);
  }

  const t = await threadOf(ctx, user._id);
  if (t?.status === "thinking") throw domainError("CONFLICT", "The assistant is still answering.");

  const messages = await messagesOf(ctx, user._id);
  const asked = messages.filter((m) => m.role === "user" && m.text !== undefined && m.provider === undefined);
  if (asked.length >= LIMITS.turnsPerChat) {
    throw domainError("LIMIT", "This chat is full. Start a new chat to keep going.");
  }
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (asked.filter((m) => m._creationTime > hourAgo).length >= LIMITS.perHour) {
    throw domainError("LIMIT", "You've asked a lot this hour. Try again a bit later.");
  }

  // Crisis messages get a fixed, human-written reply with real help. No AI model sees them.
  const flag = detectCrisis(clean);
  if (flag) {
    await ctx.db.insert("assistantMessages", { userId: user._id, role: "user", text: clean, prompt: clean });
    await ctx.db.insert("assistantMessages", { userId: user._id, role: "assistant", text: CRISIS_REPLY[flag] });
    if (t) await ctx.db.patch(t._id, { status: "idle", error: undefined });
    return;
  }

  // The date travels with the question (not in the system prompt) so the cached prefix never changes.
  await ctx.db.insert("assistantMessages", {
    userId: user._id,
    role: "user",
    text: clean,
    prompt: `[Today is ${todayUtc()}]\n${clean}`,
  });
  if (t) await ctx.db.patch(t._id, { status: "thinking", error: undefined });
  else await ctx.db.insert("assistantThreads", { userId: user._id, status: "thinking" });

  await ctx.scheduler.runAfter(0, internal.assistantAgent.respond, { userId: user._id });
}

/** Saves the question and schedules the reply. */
export const ask = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => askAs(ctx, await requireUser(ctx), text),
});

/** "New chat": deletes this user's conversation. */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    for (const m of await messagesOf(ctx, user._id)) await ctx.db.delete(m._id);
    const t = await threadOf(ctx, user._id);
    if (t) await ctx.db.patch(t._id, { status: "idle", error: undefined });
  },
});

// ---- Internal: used by the AI action (assistantAgent.ts) ----

export const history = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const messages = await messagesOf(ctx, userId);
    return {
      userName: user?.name ?? "Neighbour",
      messages: messages.map(({ role, text, prompt, provider, contentJson }) => ({ role, text, prompt, provider, contentJson })),
    };
  },
});

export const append = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    provider: v.union(v.literal("gemini"), v.literal("anthropic")),
    contentJson: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("assistantMessages", args);
  },
});

export const finish = internalMutation({
  args: { userId: v.id("users"), error: v.optional(v.string()) },
  handler: async (ctx, { userId, error }) => {
    const t = await threadOf(ctx, userId);
    const fields = { status: error ? ("error" as const) : ("idle" as const), error };
    if (t) await ctx.db.patch(t._id, fields);
    else await ctx.db.insert("assistantThreads", { userId, ...fields });
  },
});

type BrowseRow = Awaited<ReturnType<typeof toolService.browse>>[number];

function describeAvailability(t: BrowseRow) {
  if (t.availability.state === "available") return "available now";
  return t.availability.overdue ? `on loan, overdue since ${t.availability.until}` : `on loan until ${t.availability.until}`;
}

/** Tool: search_tools. Returns only what the user could already see on the Browse page. */
export const searchTools = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    category: v.optional(categoryValidator),
    availableOnly: v.boolean(),
  },
  handler: async (ctx, { userId, query: q, category, availableOnly }) => {
    const user = (await ctx.db.get(userId)) as Doc<"users"> | null;
    if (!user) return [];
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const rows = (await toolService.browse(ctx.db, user, category))
      .filter((t) => !availableOnly || t.availability.state === "available")
      .map((t) => {
        const hay = `${t.name} ${t.description} ${t.category}`.toLowerCase();
        return { t, score: words.length === 0 ? 1 : words.filter((w) => hay.includes(w)).length };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return rows.map(({ t }) => ({
      name: t.name,
      category: t.category,
      condition: t.condition,
      description: t.description,
      availability: describeAvailability(t),
      booked: t.upcoming.map((u) => `${u.startDate} to ${u.endDate}`),
      owner: t.isMine ? "you" : t.owner.name,
      trustedLender: t.owner.trustedLender,
      pickupPlace: t.location?.label || (t.location ? "pin on map" : null),
      yourRequest: t.myRequest?.status ?? null,
    }));
  },
});

/** Tool: get_my_activity. The user's own requests, incoming requests and listings. */
export const myActivity = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = (await ctx.db.get(userId)) as Doc<"users"> | null;
    if (!user) return null;
    const [mine, incoming, listings] = await Promise.all([
      loanService.myRequests(ctx.db, user),
      loanService.incoming(ctx.db, user),
      toolService.listMine(ctx.db, user),
    ]);
    const brief = (l: (typeof mine)[number], other: string) => ({
      tool: l.tool.name,
      status: l.status,
      dates: `${l.startDate} to ${l.endDate}`,
      overdue: l.overdue,
      with: other,
    });
    return {
      myRequests: mine.slice(0, 15).map((l) => brief(l, l.lender.name)),
      incomingRequests: incoming.slice(0, 15).map((l) => brief(l, l.borrower.name)),
      myListings: listings.map((t) => ({
        name: t.name,
        availability: t.availability.state === "available" ? "available" : `on loan until ${t.availability.until}`,
        hasPickupLocation: t.location !== undefined,
      })),
    };
  },
});
