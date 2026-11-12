"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";

export function useNotifications() {
  const current = useCurrentUser();
  return useQuery(api.notifications.list, current.status === "ready" ? {} : "skip");
}

export const useMarkAllNotificationsRead = () => useMutation(api.notifications.markAllRead);
export const useMarkNotificationRead = () => useMutation(api.notifications.markRead);
