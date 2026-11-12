"use client";

// Data layer for loans: components use these hooks, never `api` directly.
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";

export type LoanView = FunctionReturnType<typeof api.loans.myRequests>[number];

export const useMyRequests = () => useQuery(api.loans.myRequests);
export const useIncomingRequests = () => useQuery(api.loans.incoming);

/** Requests waiting for the signed-in lender's answer (for the header badge). */
export function usePendingIncomingCount() {
  const current = useCurrentUser();
  const loans = useQuery(api.loans.incoming, current.status === "ready" ? {} : "skip");
  return loans?.filter((l) => l.status === "requested").length ?? 0;
}

export function useLoanActions() {
  return {
    approve: useMutation(api.loans.approve),
    decline: useMutation(api.loans.decline),
    cancel: useMutation(api.loans.cancel),
    markReturned: useMutation(api.loans.markReturned),
  };
}
