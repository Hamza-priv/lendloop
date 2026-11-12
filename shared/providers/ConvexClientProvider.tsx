"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { CurrentUserProvider } from "@/features/auth/CurrentUserProvider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` first.");

const convex = new ConvexReactClient(convexUrl);

/** Passes the Clerk session token to Convex, then makes sure a user record exists. */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <CurrentUserProvider>{children}</CurrentUserProvider>
    </ConvexProviderWithClerk>
  );
}
