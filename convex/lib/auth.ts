import type { Auth } from "convex/server";
import type { DatabaseReader } from "../_generated/server";
import { domainError } from "../domain/errors";
import { assertAdmin } from "../domain/permissions";
import { userRepository } from "../repositories/userRepository";

type Ctx = { auth: Auth; db: DatabaseReader };

/** The signed-in user's record, or null if signed out or not yet stored. */
export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return userRepository.getByToken(ctx.db, identity.tokenIdentifier);
}

export async function requireUser(ctx: Ctx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw domainError("UNAUTHENTICATED", "Please sign in.");
  return user;
}

export async function requireAdmin(ctx: Ctx) {
  const user = await requireUser(ctx);
  assertAdmin(user);
  return user;
}
