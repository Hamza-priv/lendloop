"use client";

import { Lock, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/PageHeader";
import { useCurrentUser } from "./CurrentUserProvider";

type Props = { children: ReactNode; adminOnly?: boolean; fallback?: ReactNode };

/**
 * UI gate only, for a clean experience. Real access control is enforced in
 * every Convex function, so bypassing this component exposes nothing.
 */
export function RequireUser({ children, adminOnly = false, fallback = null }: Props) {
  const state = useCurrentUser();

  if (state.status === "loading") return <>{fallback}</>;
  if (state.status === "signed-out") {
    return (
      <EmptyState
        icon={<Lock />}
        title="Sign in to continue"
        action={<ButtonLink href="/sign-in">Sign in</ButtonLink>}
      >
        You need an account to lend or borrow tools.
      </EmptyState>
    );
  }
  if (adminOnly && state.user.role !== "admin") {
    return (
      <EmptyState icon={<ShieldAlert />} title="Admins only">
        This page is for neighbourhood admins.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
