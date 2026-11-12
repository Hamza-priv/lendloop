import { mutation, query } from "./_generated/server";
import { domainError } from "./domain/errors";
import { getCurrentUser } from "./lib/auth";
import { userService } from "./services/userService";

/** Called by the client right after sign-in to create or refresh the user record. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw domainError("UNAUTHENTICATED", "Please sign in.");
    return userService.upsertFromIdentity(ctx, identity);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});
