import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { withLoanImages } from "./lib/images";
import { loanService } from "./services/loanService";

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, input) => loanService.request(ctx, await requireUser(ctx), input),
});

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => loanService.approve(ctx, await requireUser(ctx), loanId),
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => loanService.decline(ctx, await requireUser(ctx), loanId),
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => loanService.cancel(ctx, await requireUser(ctx), loanId),
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) =>
    loanService.markReturned(ctx, await requireUser(ctx), loanId),
});

/** Loans where I am the borrower. */
export const myRequests = query({
  args: {},
  handler: async (ctx) => withLoanImages(ctx.storage, await loanService.myRequests(ctx.db, await requireUser(ctx))),
});

/** Loans on tools I own. */
export const incoming = query({
  args: {},
  handler: async (ctx) => withLoanImages(ctx.storage, await loanService.incoming(ctx.db, await requireUser(ctx))),
});
