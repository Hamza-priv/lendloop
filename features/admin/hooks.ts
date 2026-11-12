"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useAutomationHealth = () => useQuery(api.admin.automationHealth);
export const useAdminUsers = () => useQuery(api.admin.users);
export const useAllLoans = () => useQuery(api.admin.allLoans);

export const useRetryEvent = () => useMutation(api.admin.retryEvent);
export const useSetTrustedLender = () => useMutation(api.admin.setTrustedLender);
export const useRemoveListing = () => useMutation(api.admin.removeListing);
export const useDismissError = () => useMutation(api.admin.dismissError);
