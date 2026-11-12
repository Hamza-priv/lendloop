/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

export const modules = import.meta.glob("../../convex/**/*.*s");

export function addDays(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A fresh in-memory backend with two users and an admin, all stored. */
export async function setup() {
  process.env.ADMIN_EMAILS = "admin@example.com";
  const t = convexTest(schema, modules);
  const as = (subject: string, email: string) =>
    t.withIdentity({ subject, issuer: "https://test", email, name: subject });
  const alice = as("alice", "alice@example.com");
  const bob = as("bob", "bob@example.com");
  const admin = as("admin", "admin@example.com");
  for (const u of [alice, bob, admin]) await u.mutation(api.users.store, {});
  return { t, alice, bob, admin };
}

export const drill = {
  name: "Cordless drill",
  category: "power_tools" as const,
  condition: "good" as const,
  description: "18V",
};
