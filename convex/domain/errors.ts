import { ConvexError } from "convex/values";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "LIMIT";

/** Errors the UI can show as-is. The code lets the client react without parsing text. */
export function domainError(code: ErrorCode, message: string) {
  return new ConvexError({ code, message });
}
