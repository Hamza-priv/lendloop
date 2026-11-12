"use client";

import { useCallback, useState } from "react";

export type ToolLocation = { lat: number; lng: number; label: string };
export type Coords = { lat: number; lng: number };

/** Opens directions in Google Maps (the app on phones), from wherever the user is. No API key needed. */
export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; coords: Coords }
  | { status: "error"; message: string };

/**
 * The browser's current position, asked for only when `locate()` is called.
 * It stays in the browser: nothing is sent to the server.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback((onCoords?: (c: Coords) => void) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "error", message: "Your browser can't share its location." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState({ status: "ready", coords });
        onCoords?.(coords);
      },
      (err) =>
        setState({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location access is blocked. Allow it in your browser settings."
              : "Couldn't get your location. Try again.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);
  return { state, locate, reset };
}

export type SearchResult = { display_name: string; lat: string; lon: string };

/** Address search through OpenStreetMap's Nominatim. Called only when the user submits a search. */
export async function searchAddress(query: string): Promise<SearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Address search is unavailable right now.");
  return res.json();
}

/** "Trafalgar Square, Westminster, London, ..." -> "Trafalgar Square, Westminster" */
export function shortLabel(displayName: string) {
  return displayName.split(",").slice(0, 2).map((s) => s.trim()).join(", ").slice(0, 120);
}
