// Private messages between two neighbours, usually about one tool.
// Emails work like LinkedIn: one email when a conversation goes from "read" to
// "unread", not one per message, so a quick back-and-forth doesn't flood inboxes.
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import { notificationService } from "./notificationService";
import { outboxService } from "./outboxService";

type User = Doc<"users">;
type Conversation = Doc<"conversations">;

export const MESSAGE_LIMITS = { bodyChars: 2000, perTenMinutes: 30 } as const;

function sides(conv: Conversation, me: Id<"users">) {
  if (conv.userA === me) return { mine: "readAtA" as const, other: conv.userB, theirs: "readAtB" as const };
  if (conv.userB === me) return { mine: "readAtB" as const, other: conv.userA, theirs: "readAtA" as const };
  return null;
}

async function getOwn(db: DatabaseReader, me: User, id: Id<"conversations">) {
  const conv = await db.get(id);
  const s = conv && sides(conv, me._id);
  if (!conv || !s) throw domainError("NOT_FOUND", "Conversation not found.");
  return { conv, s };
}

const preview = (body: string) => (body.length > 140 ? `${body.slice(0, 137)}…` : body);

export const messagingService = {
  /** Finds or creates the conversation between `me` and `otherId` about `toolId`. */
  async open(ctx: MutationCtx, me: User, otherId: Id<"users">, toolId?: Id<"tools">, wantedId?: Id<"wanted">) {
    if (otherId === me._id) throw domainError("INVALID_INPUT", "You can't message yourself.");
    const [userA, userB] = me._id < otherId ? [me._id, otherId] : [otherId, me._id];
    const existing = (
      await ctx.db
        .query("conversations")
        .withIndex("by_pair_tool", (q) => q.eq("userA", userA).eq("userB", userB).eq("toolId", toolId))
        .collect()
    ).find((c) => c.wantedId === wantedId);
    if (existing) return existing._id;
    const now = Date.now();
    return ctx.db.insert("conversations", {
      userA,
      userB,
      toolId,
      wantedId,
      lastMessageAt: now,
      lastMessagePreview: "",
      // Nothing read yet: any message, even one sent this same millisecond, counts as unread.
      readAtA: 0,
      readAtB: 0,
    });
  },

  async send(ctx: MutationCtx, me: User, conversationId: Id<"conversations">, text: string) {
    const { conv, s } = await getOwn(ctx.db, me, conversationId);
    const body = text.trim();
    if (!body) throw domainError("INVALID_INPUT", "Write a message first.");
    if (body.length > MESSAGE_LIMITS.bodyChars) {
      throw domainError("INVALID_INPUT", `Keep messages under ${MESSAGE_LIMITS.bodyChars} characters.`);
    }
    const tenMinAgo = Date.now() - 10 * 60_000;
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId).gt("_creationTime", tenMinAgo))
      .collect();
    if (recent.filter((m) => m.senderId === me._id).length >= MESSAGE_LIMITS.perTenMinutes) {
      throw domainError("LIMIT", "You're sending messages very fast. Wait a few minutes.");
    }

    // Did the other person already have unread messages from me? Then they've been emailed.
    const theyHadUnread = conv.lastSenderId === me._id && conv.lastMessageAt > conv[s.theirs];

    const now = Date.now();
    await ctx.db.insert("messages", { conversationId, senderId: me._id, body });
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: preview(body),
      lastSenderId: me._id,
      [s.mine]: now,
    });

    const tool = conv.toolId ? await ctx.db.get(conv.toolId) : null;
    const wanted = conv.wantedId ? await ctx.db.get(conv.wantedId) : null;
    const link = `/messages?c=${conversationId}`;
    await notificationService.notify(ctx, s.other, {
      kind: "message",
      title: tool
        ? `${me.name} messaged you about the ${tool.name}`
        : wanted
          ? `${me.name} replied to your request: ${wanted.title}`
          : `${me.name} sent you a message`,
      body: preview(body),
      link,
      groupKey: `conv:${conversationId}`,
    });
    if (!theyHadUnread) {
      await outboxService.enqueueNotification(ctx, s.other, {
        type: "message.received",
        toolName: tool?.name ?? wanted?.title ?? "LendLoop",
        link,
        message: { from: me.name, preview: preview(body) },
      });
    }
  },

  async markRead(ctx: MutationCtx, me: User, conversationId: Id<"conversations">) {
    const { s } = await getOwn(ctx.db, me, conversationId);
    await ctx.db.patch(conversationId, { [s.mine]: Date.now() });
    const note = await ctx.db
      .query("notifications")
      .withIndex("by_user_group", (q) => q.eq("userId", me._id).eq("groupKey", `conv:${conversationId}`))
      .order("desc")
      .first();
    if (note && note.readAt === undefined) await ctx.db.patch(note._id, { readAt: Date.now() });
  },

  /** My conversations that have at least one message, newest first. */
  async list(db: DatabaseReader, me: User) {
    const [a, b] = await Promise.all([
      db.query("conversations").withIndex("by_userA", (q) => q.eq("userA", me._id)).order("desc").take(100),
      db.query("conversations").withIndex("by_userB", (q) => q.eq("userB", me._id)).order("desc").take(100),
    ]);
    const convs = [...a, ...b].filter((c) => c.lastMessagePreview !== "").sort((x, y) => y.lastMessageAt - x.lastMessageAt);
    return Promise.all(
      convs.map(async (c) => {
        const s = sides(c, me._id)!;
        const [other, tool, wanted] = await Promise.all([
          db.get(s.other),
          c.toolId ? db.get(c.toolId) : null,
          c.wantedId ? db.get(c.wantedId) : null,
        ]);
        return {
          _id: c._id,
          other: { name: other?.name ?? "Neighbour", trustedLender: other?.trustedLender ?? false },
          tool: tool ? { _id: tool._id, name: tool.name, category: tool.category, imageId: tool.images?.[0] ?? null } : null,
          wanted: wanted ? { title: wanted.title } : null,
          preview: c.lastMessagePreview,
          lastMessageAt: c.lastMessageAt,
          lastFromMe: c.lastSenderId === me._id,
          unread: c.lastSenderId !== me._id && c.lastMessageAt > c[s.mine],
        };
      }),
    );
  },

  async thread(db: DatabaseReader, me: User, conversationId: Id<"conversations">) {
    const { conv, s } = await getOwn(db, me, conversationId);
    const [other, tool, wanted, messages] = await Promise.all([
      db.get(s.other),
      conv.toolId ? db.get(conv.toolId) : null,
      conv.wantedId ? db.get(conv.wantedId) : null,
      db.query("messages").withIndex("by_conversation", (q) => q.eq("conversationId", conversationId)).collect(),
    ]);
    return {
      _id: conv._id,
      other: { name: other?.name ?? "Neighbour", trustedLender: other?.trustedLender ?? false },
      tool: tool ? { _id: tool._id, name: tool.name, category: tool.category, imageId: tool.images?.[0] ?? null } : null,
      wanted: wanted ? { title: wanted.title } : null,
      // When the other person last read the chat, for "Seen".
      otherReadAt: conv[s.theirs],
      messages: messages.map((m) => ({ _id: m._id, mine: m.senderId === me._id, body: m.body, at: m._creationTime })),
    };
  },

  async unreadCount(db: DatabaseReader, me: User) {
    return (await messagingService.list(db, me)).filter((c) => c.unread).length;
  },
};
