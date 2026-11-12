"use client";

// Data layer for the Wanted board: components use these hooks, never `api` directly.
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type WantedPost = FunctionReturnType<typeof api.wanted.list>[number];

export const useWantedList = () => useQuery(api.wanted.list);
export const useCreateWanted = () => useMutation(api.wanted.create);
export const useCloseWanted = () => useMutation(api.wanted.close);
export const useRespondWanted = () => useMutation(api.wanted.respond);
