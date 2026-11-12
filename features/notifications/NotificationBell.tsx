"use client";

import { Bell, CalendarCheck, CheckCheck, HandHelping, MessageCircle, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/shared/lib/format";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "./hooks";

const ICON = { message: MessageCircle, loan: CalendarCheck, available: PackageCheck, wanted: HandHelping } as const;
const TINT = {
  message: "bg-sky-50 text-sky-700",
  loan: "bg-brand-50 text-brand-700",
  available: "bg-amber-50 text-amber-700",
  wanted: "bg-violet-50 text-violet-700",
} as const;

/** The bell in the header: requests, messages and "available again" alerts. */
export function NotificationBell() {
  const notes = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = notes?.filter((n) => !n.read).length ?? 0;

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-2rem))] animate-pop-in overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-950">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll({})}
                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {notes === undefined ? null : notes.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-zinc-500">
                You&apos;re all caught up. Requests, messages and tools you&apos;re waiting for show up here.
              </li>
            ) : (
              notes.map((n) => {
                const Icon = ICON[n.kind];
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) void markOne({ notificationId: n._id });
                        setOpen(false);
                        router.push(n.link);
                      }}
                      className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 ${n.read ? "" : "bg-brand-50/40"}`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TINT[n.kind]}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read ? "text-zinc-700" : "font-medium text-zinc-950"}`}>{n.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{n.body}</span>
                        <span className="mt-1 block text-[11px] text-zinc-400">{timeAgo(n.at)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
