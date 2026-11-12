"use client";

// Data layer for messaging: components use these hooks, never `api` directly.
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";

export type ConversationRow = FunctionReturnType<typeof api.messages.list>[number];

export const useConversations = () => useQuery(api.messages.list);
export const useThread = (conversationId: Id<"conversations"> | null) =>
  useQuery(api.messages.thread, conversationId ? { conversationId } : "skip");

export function useUnreadMessages() {
  const current = useCurrentUser();
  return useQuery(api.messages.unreadCount, current.status === "ready" ? {} : "skip") ?? 0;
}

export const useSendMessage = () => useMutation(api.messages.send);
export const useMarkRead = () => useMutation(api.messages.markRead);
export const useStartAboutTool = () => useMutation(api.messages.startAboutTool);
export const useStartAboutLoan = () => useMutation(api.messages.startAboutLoan);
