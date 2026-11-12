import type { StorageReader } from "convex/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { domainError } from "../domain/errors";

export const IMAGE_LIMITS = {
  perTool: 4,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
} as const;

export type ToolImage = { id: Id<"_storage">; url: string };

/** Storage ids -> short-lived download URLs, dropping any file that no longer exists. */
export async function imagesWithUrls(storage: StorageReader, ids: Id<"_storage">[] | undefined): Promise<ToolImage[]> {
  if (!ids?.length) return [];
  const urls = await Promise.all(ids.map((id) => storage.getUrl(id)));
  return ids.flatMap((id, i) => (urls[i] ? [{ id, url: urls[i] }] : []));
}

/**
 * Checks uploaded files before they are attached to a listing: at most 4, no
 * duplicates, and each one really is an image under 5 MB. The browser checks
 * this too, but only the server's check counts. A rejected upload can't be
 * deleted here (the failing mutation rolls back), so the daily orphan cleanup
 * in crons.ts removes it.
 */
export async function validateImages(ctx: MutationCtx, ids: Id<"_storage">[]) {
  if (ids.length > IMAGE_LIMITS.perTool) {
    throw domainError("INVALID_INPUT", `Add at most ${IMAGE_LIMITS.perTool} photos.`);
  }
  if (new Set(ids).size !== ids.length) throw domainError("INVALID_INPUT", "The same photo was added twice.");
  for (const id of ids) {
    const file = await ctx.db.system.get(id);
    if (!file) throw domainError("INVALID_INPUT", "A photo upload didn't finish. Please add it again.");
    const typeOk = (IMAGE_LIMITS.types as readonly string[]).includes(file.contentType ?? "");
    if (!typeOk || file.size > IMAGE_LIMITS.maxBytes) {
      throw domainError(
        "INVALID_INPUT",
        typeOk ? "Each photo must be 5 MB or smaller." : "Photos must be JPG, PNG, WebP or GIF.",
      );
    }
  }
}

/** Adds the tool's cover photo URL to each loan for the loan cards. */
export async function withLoanImages<L extends { tool: { imageId: Id<"_storage"> | null } }>(
  storage: StorageReader,
  loans: L[],
) {
  return Promise.all(
    loans.map(async (l) => ({
      ...l,
      tool: { ...l.tool, imageUrl: l.tool.imageId ? await storage.getUrl(l.tool.imageId) : null },
    })),
  );
}
