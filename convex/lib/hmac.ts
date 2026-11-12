// HMAC-SHA256 request signing shared by both directions (Convex -> n8n and n8n -> Convex).
//
// Signed message: `${timestamp}.${rawBody}`
// Headers:        x-lendloop-timestamp: <unix seconds>
//                 x-lendloop-signature: sha256=<hex>
//
// The timestamp is part of the signed message, so it cannot be changed, and
// requests older than MAX_SKEW_SECONDS are rejected to limit replays.
export const TIMESTAMP_HEADER = "x-lendloop-timestamp";
export const SIGNATURE_HEADER = "x-lendloop-signature";
export const MAX_SKEW_SECONDS = 300;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without exiting early, so timing does not reveal how much matched. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signBody(secret: string, body: string, nowMs: number = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const signature = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  return { [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: signature };
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifySignature(
  secret: string,
  body: string,
  timestamp: string | null,
  signature: string | null,
  nowMs: number = Date.now(),
): Promise<VerifyResult> {
  if (!timestamp || !signature) return { ok: false, reason: "missing signature headers" };
  const ts = Number(timestamp);
  if (!Number.isInteger(ts)) return { ok: false, reason: "bad timestamp" };
  if (Math.abs(nowMs / 1000 - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp outside allowed window" };
  }
  const expected = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  return timingSafeEqual(expected, signature) ? { ok: true } : { ok: false, reason: "bad signature" };
}
