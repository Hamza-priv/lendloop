import { domainError } from "./errors";

/** Where a tool is collected. `label` is a short place name, e.g. "Near Jubilee Park". */
export type ToolLocation = { lat: number; lng: number; label: string };

const LABEL_MAX = 120;

/** Checks coordinates and trims the label before a tool location is stored. */
export function normalizeLocation(input: ToolLocation): ToolLocation {
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw domainError("INVALID_INPUT", "That location is not valid.");
  }
  const label = input.label.trim();
  if (label.length > LABEL_MAX) {
    throw domainError("INVALID_INPUT", `Location name must be at most ${LABEL_MAX} characters.`);
  }
  // 5 decimal places is about 1 metre: precise enough for a gate, no false precision.
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return { lat: round(lat), lng: round(lng), label };
}
