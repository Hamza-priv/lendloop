import type { Doc } from "../_generated/dataModel";
import { domainError } from "./errors";

export type ToolInput = Pick<Doc<"tools">, "name" | "category" | "condition" | "description">;

const LIMITS = { name: 80, description: 500 } as const;

/** Trims and checks user text before it is stored. */
export function normalizeToolInput(input: ToolInput): ToolInput {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > LIMITS.name) {
    throw domainError("INVALID_INPUT", `Name must be 2-${LIMITS.name} characters.`);
  }
  if (description.length > LIMITS.description) {
    throw domainError("INVALID_INPUT", `Description must be at most ${LIMITS.description} characters.`);
  }
  return { ...input, name, description };
}
