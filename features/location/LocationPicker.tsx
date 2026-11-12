"use client";

import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Field";
import { searchAddress, shortLabel, useGeolocation, type SearchResult, type ToolLocation } from "./hooks";
import { MapLazy } from "./MapLazy";

type Props = {
  value: ToolLocation | null;
  onChange: (value: ToolLocation | null) => void;
  idPrefix: string;
};

/** Pick where a tool is collected: search, "use my location", or click and drag on the map. */
export function LocationPicker({ value, onChange, idPrefix }: Props) {
  const geo = useGeolocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (query.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchAddress(query.trim());
      setResults(found);
      if (found.length === 1) pick(found[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    // The picker lives inside the tool form, so Enter must search, not submit the form.
    if (e.key === "Enter") {
      e.preventDefault();
      void runSearch();
    }
  }

  function pick(r: SearchResult) {
    onChange({ lat: Number(r.lat), lng: Number(r.lon), label: value?.label || shortLabel(r.display_name) });
    setResults(null);
    setQuery("");
  }

  const geoError = geo.state.status === "error" ? geo.state.message : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id={`${idPrefix}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search a street or postcode, press Enter"
            className="pl-9"
            aria-label="Search for an address"
          />
          {results && (
            <ul className="absolute top-full right-0 left-0 z-[1100] mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lift">
              {results.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-zinc-500">No matches. Try a fuller address.</li>
              ) : (
                results.map((r) => (
                  <li key={`${r.lat},${r.lon}`}>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      className="flex w-full cursor-pointer items-start gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                      <span className="line-clamp-2">{r.display_name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => geo.locate(({ lat, lng }) => onChange({ lat, lng, label: value?.label ?? "" }))}
          loading={geo.state.status === "locating" || searching}
        >
          {geo.state.status !== "locating" && !searching && <LocateFixed />} Use my location
        </Button>
      </div>

      <MapLazy
        value={value ? { lat: value.lat, lng: value.lng } : null}
        onChange={(p) => onChange({ lat: p.lat, lng: p.lng, label: value?.label ?? "" })}
        className="h-64"
      />

      {(error || geoError) && (
        <p className="text-sm text-red-700" role="alert">
          {error ?? geoError}
        </p>
      )}

      {value ? (
        <div className="flex items-center gap-2">
          <Input
            id={`${idPrefix}-label`}
            value={value.label}
            maxLength={120}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="Place name, e.g. Corner of Elm Road, by the post box"
            aria-label="Location name"
          />
          <Button variant="ghost" onClick={() => onChange(null)} aria-label="Remove location" title="Remove location">
            <X />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Click the map to drop a pin, then drag it to adjust.</p>
      )}
    </div>
  );
}
