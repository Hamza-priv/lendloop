"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { HandHelping, Inbox, LayoutGrid, Menu, MessagesSquare, Package, Plus, Send, Shield, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/features/auth/CurrentUserProvider";
import { usePendingIncomingCount } from "@/features/loans/hooks";
import { useUnreadMessages } from "@/features/messages/hooks";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ButtonLink } from "@/shared/ui/Button";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/tools", label: "Browse", icon: LayoutGrid },
  { href: "/wanted", label: "Wanted", icon: HandHelping },
  { href: "/listings", label: "My listings", icon: Package },
  { href: "/requests", label: "My requests", icon: Send },
  { href: "/incoming", label: "Incoming", icon: Inbox },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

export function Header() {
  const pathname = usePathname();
  const current = useCurrentUser();
  const pending = usePendingIncomingCount();
  const unreadMessages = useUnreadMessages();
  const badge = (href: string) => (href === "/incoming" ? pending : href === "/messages" ? unreadMessages : 0);
  const [open, setOpen] = useState(false);
  const isAdmin = current.status === "ready" && current.user.role === "admin";
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", icon: Shield }] : LINKS;
  const isActive = (href: string) =>
    href === "/tools" ? pathname === "/tools" : pathname === href || pathname.startsWith(`${href}/`);

  const navLink = (l: (typeof links)[number], mobile = false) => {
    const active = isActive(l.href);
    const Icon = l.icon;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${
          mobile ? "px-3 py-2.5" : "px-3 py-1.5"
        } ${active ? "bg-zinc-100 text-zinc-950" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"}`}
      >
        {mobile && <Icon className="size-4 text-zinc-500" />}
        {l.label}
        {badge(l.href) > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-semibold text-white">
            {badge(l.href)}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />

        <Show when="signed-in">
          <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
            {links.map((l) => navLink(l))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ButtonLink href="/tools/new" size="sm" className="hidden lg:inline-flex">
              <Plus /> List a tool
            </ButtonLink>
            <NotificationBell />
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </Show>

        <Show when="signed-out">
          <div className="ml-auto flex items-center gap-2">
            <ButtonLink href="/guide" variant="ghost" size="sm" className="hidden sm:inline-flex">
              How it works
            </ButtonLink>
            <ButtonLink href="/about" variant="ghost" size="sm" className="hidden sm:inline-flex">
              About
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up" size="sm">
              Get started
            </ButtonLink>
          </div>
        </Show>
      </div>

      <Show when="signed-in">
        {open && (
          <nav className="border-t border-zinc-200 bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {links.map((l) => navLink(l, true))}
              <ButtonLink href="/tools/new" className="mt-2" onClick={() => setOpen(false)}>
                <Plus /> List a tool
              </ButtonLink>
            </div>
          </nav>
        )}
      </Show>
    </header>
  );
}
