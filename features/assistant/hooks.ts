"use client";

// Data layer for the assistant: components use these hooks, never `api` directly.
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";

export function useAssistantThread() {
  const current = useCurrentUser();
  return useQuery(api.assistant.thread, current.status === "ready" ? {} : "skip");
}

export const useAsk = () => useMutation(api.assistant.ask);
export const useResetChat = () => useMutation(api.assistant.reset);
