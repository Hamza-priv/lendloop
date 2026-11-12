// Demo data: `npx convex run seed:run`. Safe to run more than once: it does
// nothing if demo users already exist. Demo users cannot sign in (their token
// is not a real Clerk identity); they exist so a new account has tools to browse
// and an overdue loan for the reminder workflow to find.
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { todayUtc } from "./domain/loan";
import { loanRepository } from "./repositories/loanRepository";
import { toolRepository } from "./repositories/toolRepository";
import { userRepository } from "./repositories/userRepository";

const DEMO_USERS = [
  { key: "amira", name: "Amira (demo)", email: "amira@example.com", trustedLender: true },
  { key: "ben", name: "Ben (demo)", email: "ben@example.com", trustedLender: false },
  { key: "chloe", name: "Chloe (demo)", email: "chloe@example.com", trustedLender: false },
] as const;

type ToolSeed = Pick<Doc<"tools">, "name" | "category" | "condition" | "description"> & {
  owner: (typeof DEMO_USERS)[number]["key"];
};

const DEMO_TOOLS: ToolSeed[] = [
  { owner: "amira", name: "Cordless drill", category: "power_tools", condition: "good", description: "18V with two batteries and a bit set." },
  { owner: "amira", name: "Pressure washer", category: "cleaning", condition: "fair", description: "Great for patios. Bring your own extension lead." },
  { owner: "ben", name: "Two-person tent", category: "camping", condition: "good", description: "Waterproof, packs small." },
  { owner: "ben", name: "Hedge trimmer", category: "garden", condition: "worn", description: "Works fine, blade could use sharpening." },
  { owner: "chloe", name: "Stand mixer", category: "kitchen", condition: "new", description: "Dough hook, whisk and paddle included." },
  { owner: "chloe", name: "Socket set", category: "hand_tools", condition: "good", description: "Metric and imperial, 40 pieces." },
];

function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await userRepository.getByToken(ctx.db, "seed|amira")) {
      return "Demo data already present; nothing to do.";
    }

    const users = new Map<string, Id<"users">>();
    for (const u of DEMO_USERS) {
      users.set(
        u.key,
        await userRepository.insert(ctx.db, {
          tokenIdentifier: `seed|${u.key}`,
          name: u.name,
          email: u.email,
          role: "user",
          trustedLender: u.trustedLender,
        }),
      );
    }

    const tools = new Map<string, Id<"tools">>();
    for (const { owner, ...tool } of DEMO_TOOLS) {
      tools.set(tool.name, await toolRepository.insert(ctx.db, { ...tool, ownerId: users.get(owner)! }));
    }

    const today = todayUtc();
    // Ben borrowed Amira's drill and is 3 days late: the reminder workflow will find this.
    await loanRepository.insert(ctx.db, {
      toolId: tools.get("Cordless drill")!,
      borrowerId: users.get("ben")!,
      lenderId: users.get("amira")!,
      startDate: shiftDays(today, -7),
      endDate: shiftDays(today, -3),
      status: "approved",
    });
    // Chloe has a pending request on Ben's tent.
    await loanRepository.insert(ctx.db, {
      toolId: tools.get("Two-person tent")!,
      borrowerId: users.get("chloe")!,
      lenderId: users.get("ben")!,
      startDate: shiftDays(today, 5),
      endDate: shiftDays(today, 8),
      status: "requested",
    });

    return `Seeded ${DEMO_USERS.length} users, ${DEMO_TOOLS.length} tools and 2 loans.`;
  },
});
