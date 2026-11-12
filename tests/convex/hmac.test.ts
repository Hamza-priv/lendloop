import { describe, expect, it } from "vitest";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signBody, verifySignature } from "../../convex/lib/hmac";

describe("hmac", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ hello: "world" });

  it("accepts a valid signature", async () => {
    const h = await signBody(secret, body);
    expect(await verifySignature(secret, body, h[TIMESTAMP_HEADER], h[SIGNATURE_HEADER])).toEqual({ ok: true });
  });

  it("rejects a changed body, wrong secret or missing headers", async () => {
    const h = await signBody(secret, body);
    expect((await verifySignature(secret, body + " ", h[TIMESTAMP_HEADER], h[SIGNATURE_HEADER])).ok).toBe(false);
    expect((await verifySignature("other", body, h[TIMESTAMP_HEADER], h[SIGNATURE_HEADER])).ok).toBe(false);
    expect((await verifySignature(secret, body, null, null)).ok).toBe(false);
  });

  it("rejects old requests (replay window)", async () => {
    const tenMinutesAgo = Date.now() - 10 * 60_000;
    const h = await signBody(secret, body, tenMinutesAgo);
    const result = await verifySignature(secret, body, h[TIMESTAMP_HEADER], h[SIGNATURE_HEADER]);
    expect(result).toEqual({ ok: false, reason: "timestamp outside allowed window" });
  });
});
