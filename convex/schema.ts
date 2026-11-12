// Database schema. Convex applies changes to this file automatically on
// `npx convex dev` / `npx convex deploy`, so there is no separate migration step.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export const categoryValidator = v.union(
  v.literal("power_tools"),
  v.literal("hand_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("cleaning"),
  v.literal("other"),
);

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);

export const loanStatusValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

/** Where a tool is collected. Shown to signed-in users only, never on the public page. */
export const locationValidator = v.object({
  lat: v.number(),
  lng: v.number(),
  label: v.string(),
});

export const loanEventTypeValidator = v.union(
  v.literal("loan.requested"),
  v.literal("loan.approved"),
  v.literal("loan.declined"),
  v.literal("loan.cancelled"),
  v.literal("loan.returned"),
);

// The only fields n8n receives for a loan event (data minimisation).
export const loanEventPayloadValidator = v.object({
  eventId: v.string(),
  type: loanEventTypeValidator,
  occurredAt: v.string(),
  loan: v.object({
    id: v.string(),
    status: loanStatusValidator,
    startDate: v.string(),
    endDate: v.string(),
  }),
  tool: v.object({ name: v.string() }),
  recipient: v.object({ name: v.string(), email: v.string() }),
});

/** Emails that aren't about a loan status change: a new message, a watched tool coming back. */
export const notificationEventPayloadValidator = v.object({
  eventId: v.string(),
  type: v.union(v.literal("message.received"), v.literal("tool.available"), v.literal("wanted.match")),
  occurredAt: v.string(),
  recipient: v.object({ name: v.string(), email: v.string() }),
  tool: v.object({ name: v.string() }),
  // Only for message.received: who wrote, and the first words of the message.
  message: v.optional(v.object({ from: v.string(), preview: v.string() })),
  // Only for wanted.match: the request the new listing may answer.
  wanted: v.optional(v.object({ title: v.string() })),
  // Path in the app the email links to, e.g. /messages?c=...
  link: v.string(),
});

export const notificationKindValidator = v.union(
  v.literal("message"),
  v.literal("loan"),
  v.literal("available"),
  v.literal("wanted"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    trustedLender: v.boolean(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    location: v.optional(locationValidator),
    // Photo storage ids, first one is the cover. At most 4.
    images: v.optional(v.array(v.id("_storage"))),
    // Soft delete keeps loan history readable after a listing is removed.
    removedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  // In-app notifications (the bell). Emails for the same events go through the outbox.
  notifications: defineTable({
    userId: v.id("users"),
    kind: notificationKindValidator,
    title: v.string(),
    body: v.string(),
    link: v.string(),
    // Groups repeats: new messages in one conversation update one notification.
    groupKey: v.optional(v.string()),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_group", ["userId", "groupKey"]),

  // A conversation between two neighbours, usually about one tool. userA < userB
  // (sorted ids) so each pair + tool has exactly one conversation.
  conversations: defineTable({
    userA: v.id("users"),
    userB: v.id("users"),
    toolId: v.optional(v.id("tools")),
    // Set when the chat started from "I have one" on a Wanted post.
    wantedId: v.optional(v.id("wanted")),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    lastSenderId: v.optional(v.id("users")),
    readAtA: v.number(),
    readAtB: v.number(),
  })
    .index("by_userA", ["userA", "lastMessageAt"])
    .index("by_userB", ["userB", "lastMessageAt"])
    .index("by_pair_tool", ["userA", "userB", "toolId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
  }).index("by_conversation", ["conversationId"]),

  // Wanted board: "I need a screwdriver" posts for tools nobody has listed yet.
  wanted: defineTable({
    userId: v.id("users"),
    title: v.string(),
    category: v.optional(categoryValidator),
    details: v.string(),
    neededBy: v.optional(v.string()), // YYYY-MM-DD
    status: v.union(v.literal("open"), v.literal("closed")),
    expiresAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // "Notify me when available" on a tool that is on loan.
  watches: defineTable({
    userId: v.id("users"),
    toolId: v.id("tools"),
  })
    .index("by_tool", ["toolId"])
    .index("by_user_tool", ["userId", "toolId"]),

  // AI assistant conversation, one per user. A question the user typed is stored
  // plain (`text`, plus `prompt` with today's date) so any provider can read it.
  // Model turns and tool results keep the provider's exact format in
  // `contentJson`, replayed unchanged on the next turn.
  assistantMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    // What the chat panel shows. Absent for tool turns, which stay hidden.
    text: v.optional(v.string()),
    prompt: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("gemini"), v.literal("anthropic"))),
    contentJson: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  assistantThreads: defineTable({
    userId: v.id("users"),
    status: v.union(v.literal("idle"), v.literal("thinking"), v.literal("error")),
    error: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD (UTC)
    endDate: v.string(), // YYYY-MM-DD (UTC), inclusive
    status: loanStatusValidator,
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status_endDate", ["status", "endDate"]),

  // Transactional outbox: written in the same transaction as the loan change,
  // then delivered to n8n by a background job with retries.
  outbox: defineTable({
    eventId: v.string(),
    // Set for loan events; absent for message / availability emails.
    loanId: v.optional(v.id("loans")),
    payload: v.union(loanEventPayloadValidator, notificationEventPayloadValidator),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    leaseUntil: v.optional(v.number()),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_status_next", ["status", "nextAttemptAt"])
    .index("by_loan", ["loanId"])
    .index("by_eventId", ["eventId"]),

  // Overdue reminders written back by n8n. idempotencyKey = `${loanId}:${asOf}`,
  // so a retried write-back never creates a second record.
  reminders: defineTable({
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(),
    sentAt: v.number(),
    executionId: v.optional(v.string()),
  })
    .index("by_key", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),

  // Failed n8n runs reported by the error workflow, shown on the admin page.
  automationErrors: defineTable({
    workflow: v.string(),
    node: v.optional(v.string()),
    message: v.string(),
    executionId: v.optional(v.string()),
  }),
});
