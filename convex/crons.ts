import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Safety net for the outbox: re-sends events whose scheduled delivery was lost.
crons.interval("outbox sweep", { minutes: 5 }, internal.outbox.sweep, {});

// Removes uploaded photos that never ended up on a listing.
crons.daily("orphan photo cleanup", { hourUTC: 3, minuteUTC: 30 }, internal.storage.cleanupOrphanImages, {});

export default crons;
