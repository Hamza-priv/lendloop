"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";

type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.me>>;

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "ready"; user: CurrentUser };

const CurrentUserContext = createContext<State>({ status: "loading" });

/**
 * After Clerk signs someone in, store (or refresh) their Convex user record once.
 * Pages wait for "ready" before calling functions that need that record.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [stored, setStored] = useState(false);
  const me = useQuery(api.users.me, stored ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    store()
      .then(() => !cancelled && setStored(true))
      .catch((e) => console.error("Could not store user", e));
    return () => {
      cancelled = true;
      setStored(false);
    };
  }, [isAuthenticated, store]);

  let state: State = { status: "loading" };
  if (!isLoading && !isAuthenticated) state = { status: "signed-out" };
  else if (me) state = { status: "ready", user: me };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

export const useCurrentUser = () => useContext(CurrentUserContext);
