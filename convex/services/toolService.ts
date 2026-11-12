import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";
import { normalizeLocation, type ToolLocation } from "../domain/location";
import { isActiveOnDate, todayUtc } from "../domain/loan";
import { assertOwnsTool } from "../domain/permissions";
import { normalizeToolInput, type ToolInput } from "../domain/tool";
import { loanRepository } from "../repositories/loanRepository";
import { toolRepository } from "../repositories/toolRepository";
import { userRepository } from "../repositories/userRepository";
import { validateImages } from "../lib/images";
import { outboxService } from "./outboxService";
import { wantedService } from "./wantedService";
import { watchService } from "./watchService";

type User = Doc<"users">;
type Category = Doc<"tools">["category"];

export type Availability =
  | { state: "available" }
  | { state: "on_loan"; until: string; overdue: boolean };

async function availabilityFor(db: DatabaseReader, toolId: Id<"tools">, today: string) {
  const approved = await loanRepository.listForTool(db, toolId, "approved");
  const current = approved.find((l) => isActiveOnDate(l, today));
  const availability: Availability = current
    ? { state: "on_loan", until: current.endDate, overdue: current.endDate < today }
    : { state: "available" };
  const upcoming = approved
    .filter((l) => l.startDate > today)
    .map((l) => ({ startDate: l.startDate, endDate: l.endDate }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { availability, upcoming };
}

async function getActiveTool(db: DatabaseReader, toolId: Id<"tools">) {
  const tool = await toolRepository.get(db, toolId);
  if (!tool || tool.removedAt !== undefined) throw domainError("NOT_FOUND", "Tool not found.");
  return tool;
}

type ToolWithLocation = ToolInput & { location?: ToolLocation | null; images?: Id<"_storage">[] };

export const toolService = {
  /** Public, signed-out view: name and category only, no owner details. */
  async listPublic(db: DatabaseReader) {
    const tools = await toolRepository.listActive(db);
    return tools.map((t) => ({ _id: t._id, name: t.name, category: t.category }));
  },

  /** Signed-in browse view with availability. Owner email is never exposed. */
  async browse(db: DatabaseReader, user: User, category?: Category) {
    const today = todayUtc();
    const tools = await toolRepository.listActive(db, category);
    const owners = await userRepository.getMany(db, tools.map((t) => t.ownerId));
    const watched = await watchService.watchedBy(db, user._id);
    // The caller's own open request per tool, so the card can say "Requested" after a reload.
    const myOpen = new Map<Id<"tools">, { status: "requested" | "approved"; startDate: string; endDate: string }>();
    for (const loan of await loanRepository.listByBorrower(db, user._id)) {
      if ((loan.status === "requested" || loan.status === "approved") && loan.endDate >= today && !myOpen.has(loan.toolId)) {
        myOpen.set(loan.toolId, { status: loan.status, startDate: loan.startDate, endDate: loan.endDate });
      }
    }
    return Promise.all(
      tools.map(async (tool) => {
        const owner = owners.get(tool.ownerId);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          isMine: tool.ownerId === user._id,
          owner: { name: owner?.name ?? "Neighbour", trustedLender: owner?.trustedLender ?? false },
          myRequest: myOpen.get(tool._id) ?? null,
          location: tool.location ?? null,
          images: tool.images ?? [],
          watching: watched.has(tool._id),
          ...(await availabilityFor(db, tool._id, today)),
        };
      }),
    );
  },

  async listMine(db: DatabaseReader, user: User) {
    const today = todayUtc();
    const tools = await toolRepository.listByOwner(db, user._id);
    return Promise.all(
      tools.map(async (tool) => ({ ...tool, ...(await availabilityFor(db, tool._id, today)) })),
    );
  },

  async create(ctx: MutationCtx, user: User, input: ToolWithLocation): Promise<Id<"tools">> {
    const { location, images, ...fields } = input;
    const clean = normalizeToolInput(fields);
    if (images?.length) await validateImages(ctx, images);
    const toolId = await toolRepository.insert(ctx.db, {
      ...clean,
      ownerId: user._id,
      ...(location ? { location: normalizeLocation(location) } : {}),
      ...(images?.length ? { images } : {}),
    });
    // Tell anyone whose Wanted request this listing may answer.
    await wantedService.notifyMatches(ctx, (await toolRepository.get(ctx.db, toolId))!);
    return toolId;
  },

  async update(ctx: MutationCtx, user: User, toolId: Id<"tools">, input: ToolWithLocation): Promise<void> {
    const tool = await getActiveTool(ctx.db, toolId);
    assertOwnsTool(user, tool);
    const { location, images, ...fields } = input;
    const current = new Set(tool.images ?? []);
    if (images) await validateImages(ctx, images);
    await toolRepository.patch(ctx.db, toolId, {
      ...normalizeToolInput(fields),
      // null removes the location; undefined leaves it as it is.
      ...(location === null ? { location: undefined } : location ? { location: normalizeLocation(location) } : {}),
      // undefined leaves photos as they are; an array replaces them.
      ...(images ? { images: images.length ? images : undefined } : {}),
    });
    // Delete files of photos the owner removed, so storage doesn't fill with orphans.
    if (images) {
      const kept = new Set(images);
      for (const id of current) if (!kept.has(id)) await ctx.storage.delete(id);
    }
  },

  /** Owner deletes their own listing. */
  async removeOwn(ctx: MutationCtx, user: User, toolId: Id<"tools">): Promise<void> {
    const tool = await getActiveTool(ctx.db, toolId);
    assertOwnsTool(user, tool);
    await toolService.removeAndDeclinePending(ctx, tool);
  },

  /** Shared by owner delete and admin removal (the caller checks permissions). */
  async removeAndDeclinePending(ctx: MutationCtx, tool: Doc<"tools">): Promise<void> {
    const approved = await loanRepository.listForTool(ctx.db, tool._id, "approved");
    if (approved.length > 0) {
      throw domainError(
        "CONFLICT",
        "This tool has an approved loan. Mark it returned before removing the listing.",
      );
    }
    await toolRepository.softRemove(ctx.db, tool._id, Date.now());
    const pending = await loanRepository.listForTool(ctx.db, tool._id, "requested");
    for (const loan of pending) {
      await loanRepository.patch(ctx.db, loan._id, { status: "declined" });
      await outboxService.enqueueLoanEvent(ctx, { ...loan, status: "declined" }, tool);
    }
  },

  getActiveTool,
};
