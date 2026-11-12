import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { drill, setup } from "./helpers";

type T = Awaited<ReturnType<typeof setup>>["t"];

const store = (t: T, type: string, bytes = 10) =>
  t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type }))) as Promise<Id<"_storage">>;

describe("tool photos", () => {
  it("attaches photos and returns URLs, cover first", async () => {
    const { t, alice, bob } = await setup();
    const a = await store(t, "image/png");
    const b = await store(t, "image/jpeg");
    await alice.mutation(api.tools.create, { ...drill, images: [a, b] });

    const [tool] = await bob.query(api.tools.browse, {});
    expect(tool.images.map((i) => i.id)).toEqual([a, b]);
    expect(tool.images[0].url).toMatch(/^https?:\/\//);
  });

  it("rejects non-images, too many photos and duplicates", async () => {
    const { t, alice } = await setup();
    const pdf = await store(t, "application/pdf");
    await expect(alice.mutation(api.tools.create, { ...drill, images: [pdf] })).rejects.toThrow(/JPG, PNG/);

    const five = await Promise.all([1, 2, 3, 4, 5].map(() => store(t, "image/png")));
    await expect(alice.mutation(api.tools.create, { ...drill, images: five })).rejects.toThrow(/at most 4/);

    const one = await store(t, "image/png");
    await expect(alice.mutation(api.tools.create, { ...drill, images: [one, one] })).rejects.toThrow(/twice/);
  });

  it("rejects photos over 5 MB", async () => {
    const { t, alice } = await setup();
    const big = await store(t, "image/jpeg", 5 * 1024 * 1024 + 1);
    await expect(alice.mutation(api.tools.create, { ...drill, images: [big] })).rejects.toThrow(/5 MB/);
  });

  it("editing replaces photos and deletes the removed files", async () => {
    const { t, alice } = await setup();
    const a = await store(t, "image/png");
    const b = await store(t, "image/png");
    const toolId = await alice.mutation(api.tools.create, { ...drill, images: [a, b] });

    // Omitted: unchanged.
    await alice.mutation(api.tools.update, { toolId, ...drill });
    expect((await alice.query(api.tools.mine, {}))[0].images.map((i) => i.id)).toEqual([a, b]);

    // Reorder and drop one: b becomes the cover, a's file is deleted.
    await alice.mutation(api.tools.update, { toolId, ...drill, images: [b] });
    expect((await alice.query(api.tools.mine, {}))[0].images.map((i) => i.id)).toEqual([b]);
    expect(await t.run((ctx) => ctx.db.system.get(a))).toBeNull();
  });

  it("only signed-in users get an upload URL", async () => {
    const { t, alice } = await setup();
    expect(await alice.mutation(api.tools.generateUploadUrl, {})).toMatch(/^https?:\/\//);
    await expect(t.mutation(api.tools.generateUploadUrl, {})).rejects.toThrow();
  });

  it("loan cards get the tool's cover photo", async () => {
    const { t, alice, bob } = await setup();
    const a = await store(t, "image/png");
    const toolId = await alice.mutation(api.tools.create, { ...drill, images: [a] });
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.toISOString().slice(0, 10);
    await bob.mutation(api.loans.request, { toolId, startDate: day, endDate: day });
    expect((await bob.query(api.loans.myRequests, {}))[0].tool.imageUrl).toMatch(/^https?:\/\//);
  });

  it("daily cleanup deletes old uploads no listing uses, and keeps the rest", async () => {
    const { t, alice } = await setup();
    vi.useFakeTimers();
    try {
      const orphan = await store(t, "image/png");
      const used = await store(t, "image/png");
      await alice.mutation(api.tools.create, { ...drill, images: [used] });
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
      const fresh = await store(t, "image/png");

      expect(await t.mutation(internal.storage.cleanupOrphanImages, {})).toEqual({ deleted: 1 });
      expect(await t.run((ctx) => ctx.db.system.get(orphan))).toBeNull();
      expect(await t.run((ctx) => ctx.db.system.get(used))).not.toBeNull();
      expect(await t.run((ctx) => ctx.db.system.get(fresh))).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
