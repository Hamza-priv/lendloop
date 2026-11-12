"use client";

// Data layer for tools: components use these hooks, never `api` directly.
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Category } from "@/shared/lib/format";

export type BrowseTool = FunctionReturnType<typeof api.tools.browse>[number];
export type MyTool = FunctionReturnType<typeof api.tools.mine>[number];

export const usePublicTools = () => useQuery(api.tools.listPublic);
export const useBrowseTools = (category?: Category) => useQuery(api.tools.browse, { category });
export const useMyTools = () => useQuery(api.tools.mine);

export const useCreateTool = () => useMutation(api.tools.create);
export const useUpdateTool = () => useMutation(api.tools.update);
export const useRemoveTool = () => useMutation(api.tools.remove);
export const useRequestLoan = () => useMutation(api.loans.request);
export const useWatchTool = () => useMutation(api.tools.watch);
export const useGenerateUploadUrl = () => useMutation(api.tools.generateUploadUrl);
