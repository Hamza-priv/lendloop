import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { Badge } from "@/shared/ui/Badge";
import { formatDate } from "@/shared/lib/format";

type Availability = FunctionReturnType<typeof api.tools.browse>[number]["availability"];

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  if (availability.state === "available") return <Badge tone="green" dot>Available</Badge>;
  if (availability.overdue) return <Badge tone="red" dot>Overdue since {formatDate(availability.until)}</Badge>;
  return <Badge tone="amber" dot>Back {formatDate(availability.until)}</Badge>;
}
