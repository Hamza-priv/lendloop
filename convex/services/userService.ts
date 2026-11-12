import type { UserIdentity } from "convex/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import { adminEmails } from "../lib/env";
import { userRepository } from "../repositories/userRepository";

export const userService = {
  /**
   * Creates or refreshes the user's record from their Clerk identity.
   * Admin role comes only from the ADMIN_EMAILS server variable, never from the client.
   */
  async upsertFromIdentity(ctx: MutationCtx, identity: UserIdentity): Promise<Id<"users">> {
    const email = (identity.email ?? "").toLowerCase();
    const name = identity.name ?? identity.nickname ?? (email.split("@")[0] || "Neighbour");
    const role = email && adminEmails().has(email) ? "admin" : "user";

    const existing = await userRepository.getByToken(ctx.db, identity.tokenIdentifier);
    if (existing) {
      if (existing.name !== name || existing.email !== email || existing.role !== role) {
        await userRepository.patch(ctx.db, existing._id, { name, email, role });
      }
      return existing._id;
    }
    return userRepository.insert(ctx.db, {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role,
      trustedLender: false,
    });
  },

  async setTrustedLender(ctx: MutationCtx, userId: Id<"users">, trusted: boolean): Promise<void> {
    const user = await userRepository.get(ctx.db, userId);
    if (!user) throw domainError("NOT_FOUND", "User not found.");
    await userRepository.patch(ctx.db, userId, { trustedLender: trusted });
  },
};
