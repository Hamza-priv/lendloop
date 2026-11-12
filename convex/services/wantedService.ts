// Wanted board: someone needs a tool nobody has listed ("Looking for a screwdriver").
// Neighbours answer with "I have one", which opens a chat; and when someone later
// lists a matching tool, the person who asked is told.
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import { messagingService } from "./messagingService";
import { notificationService } from "./notificationService";
import { outboxService } from "./outboxService";

type User = Doc<"users">;
type Category = Doc<"tools">["category"];

export const WANTED_LIMITS = { titleMin: 3, titleMax: 80, details: 500, openPerUser: 5, days: 30 } as const;

const STOP = new Set(["a", "an", "the", "and", "or", "for", "with", "some", "any", "need", "needed", "looking", "borrow", "tool", "tools", "my", "to", "of", "small", "big", "large", "please", "thanks", "anyone", "someone", "can", "could", "would", "have", "has", "want", "wanted", "help", "just", "day", "days", "weekend", "this", "that", "few"]);

/** Meaningful words of a title: "Need a cordless drill" -> ["cordless", "drill"]. */
export function keywords(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.endsWith("s") && w.length > 4 ? w.slice(0, -1) : w)); // "ladders" -> "ladder"
}

/** True when a listed tool plausibly answers a wanted post. */
export function matches(post: Pick<Doc<"wanted">, "title" | "category">, tool: Pick<Doc<"tools">, "name" | "description" | "category">) {
  const want = keywords(post.title);
  if (want.length === 0) return false;
  const have = new Set(keywords(`${tool.name} ${tool.description}`));
  const hits = want.filter((w) => have.has(w)).length;
  // Every word for short requests ("ladder"), most words for longer ones ("cordless hammer drill").
  return hits >= Math.max(1, Math.ceil(want.length * 0.6)) && (!post.category || post.category === tool.category);
}

const isLive = (w: Doc<"wanted">, now: number) => w.status === "open" && w.expiresAt > now;

export const wantedService = {
  async create(
    ctx: MutationCtx,
    user: User,
    input: { title: string; details: string; category?: Category; neededBy?: string },
  ) {
    const title = input.title.trim();
    const details = input.details.trim();
    if (title.length < WANTED_LIMITS.titleMin || title.length > WANTED_LIMITS.titleMax) {
      throw domainError("INVALID_INPUT", `Say what you need in ${WANTED_LIMITS.titleMin}-${WANTED_LIMITS.titleMax} characters.`);
    }
    if (details.length > WANTED_LIMITS.details) {
      throw domainError("INVALID_INPUT", `Keep details under ${WANTED_LIMITS.details} characters.`);
    }
    if (input.neededBy && !/^\d{4}-\d{2}-\d{2}$/.test(input.neededBy)) throw domainError("INVALID_INPUT", "That date isn't valid.");
    const now = Date.now();
    const mine = await ctx.db.query("wanted").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    if (mine.filter((w) => isLive(w, now)).length >= WANTED_LIMITS.openPerUser) {
      throw domainError("LIMIT", `You can have ${WANTED_LIMITS.openPerUser} open requests. Close one you no longer need first.`);
    }
    return ctx.db.insert("wanted", {
      userId: user._id,
      title,
      details,
      category: input.category,
      neededBy: input.neededBy || undefined,
      status: "open",
      expiresAt: now + WANTED_LIMITS.days * 24 * 60 * 60 * 1000,
    });
  },

  async close(ctx: MutationCtx, user: User, wantedId: Id<"wanted">) {
    const post = await ctx.db.get(wantedId);
    if (!post || post.userId !== user._id) throw domainError("NOT_FOUND", "Request not found.");
    await ctx.db.patch(wantedId, { status: "closed" });
  },

  /** Open requests, newest first. Neighbours see the name only, never contact details. */
  async listOpen(db: DatabaseReader, me: User) {
    const now = Date.now();
    const posts = (await db.query("wanted").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").take(200)).filter(
      (w) => w.expiresAt > now,
    );
    return Promise.all(
      posts.map(async (w) => {
        const [owner, offers] = await Promise.all([db.get(w.userId), w.userId === me._id ? countOffers(db, w._id) : 0]);
        return {
          _id: w._id,
          title: w.title,
          details: w.details,
          category: w.category ?? null,
          neededBy: w.neededBy ?? null,
          postedAt: w._creationTime,
          isMine: w.userId === me._id,
          requester: { name: owner?.name ?? "Neighbour", trustedLender: owner?.trustedLender ?? false },
          offers, // only counted for your own posts
        };
      }),
    );
  },

  /**
   * "I have one": opens a chat with the person who asked and sends a first
   * message, which also notifies them (bell + email).
   */
  async respond(ctx: MutationCtx, me: User, wantedId: Id<"wanted">) {
    const post = await ctx.db.get(wantedId);
    if (!post || !isLive(post, Date.now())) throw domainError("NOT_FOUND", "This request is closed.");
    if (post.userId === me._id) throw domainError("INVALID_INPUT", "This is your own request.");
    const conversationId = await messagingService.open(ctx, me, post.userId, undefined, wantedId);
    const conv = await ctx.db.get(conversationId);
    if (conv && conv.lastMessagePreview === "") {
      await messagingService.send(ctx, me, conversationId, `Hi! I saw you're looking for: ${post.title}. I have one you could borrow.`);
    }
    return conversationId;
  },

  /** Called when a tool is listed: tells people whose open request it matches. */
  async notifyMatches(ctx: MutationCtx, tool: Doc<"tools">) {
    const now = Date.now();
    const posts = await ctx.db.query("wanted").withIndex("by_status", (q) => q.eq("status", "open")).take(500);
    const link = `/tools?tool=${tool._id}`;
    for (const post of posts) {
      if (post.userId === tool.ownerId || post.expiresAt <= now || !matches(post, tool)) continue;
      await notificationService.notify(ctx, post.userId, {
        kind: "wanted",
        title: `A ${tool.name} was just listed`,
        body: `It may match your request: ${post.title}`,
        link,
      });
      await outboxService.enqueueNotification(ctx, post.userId, {
        type: "wanted.match",
        toolName: tool.name,
        link,
        wanted: { title: post.title },
      });
    }
  },
};

async function countOffers(db: DatabaseReader, wantedId: Id<"wanted">) {
  // Few posts per user and few chats per post, so a scan of this user's chats is cheap.
  const post = await db.get(wantedId);
  if (!post) return 0;
  const [a, b] = await Promise.all([
    db.query("conversations").withIndex("by_userA", (q) => q.eq("userA", post.userId)).collect(),
    db.query("conversations").withIndex("by_userB", (q) => q.eq("userB", post.userId)).collect(),
  ]);
  return [...a, ...b].filter((c) => c.wantedId === wantedId && c.lastMessagePreview !== "").length;
}
