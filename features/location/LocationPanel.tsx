"use client";

import { MapPin, MapPinOff, Navigation } from "lucide-react";
import { directionsUrl, distanceKm, formatDistance, type Coords, type ToolLocation } from "./hooks";
import { MapLazy } from "./MapLazy";

type Props = {
  location: ToolLocation | null;
  /** The viewer's position, if they shared it with "Near me". */
  from?: Coords | null;
  emptyText?: string;
  mapClassName?: string;
};

/** Read-only map of where a tool is collected, with a Google Maps directions button. */
export function LocationPanel({ location, from, emptyText = "The owner hasn't added a pickup location.", mapClassName = "h-52" }: Props) {
  if (!location) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-500">
        <MapPinOff className="size-4 shrink-0" />
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <MapLazy value={{ lat: location.lat, lng: location.lng }} className={`${mapClassName} rounded-none border-0`} />
      <div className="flex flex-col gap-3 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-zinc-900">
            <MapPin className="size-3.5 shrink-0 text-brand-700" />
            <span className="truncate">{location.label || "Pickup point"}</span>
          </p>
          {from && <p className="mt-0.5 text-zinc-500">{formatDistance(distanceKm(from, location))}</p>}
        </div>
        <a
          href={directionsUrl(location.lat, location.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800"
        >
          <Navigation className="size-4" /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}
