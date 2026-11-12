"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/shared/ui/Skeleton";

/** The Leaflet map, loaded only in the browser. */
export const MapLazy = dynamic(() => import("./PickupMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
});
