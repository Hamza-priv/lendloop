"use client";

// Leaflet touches `window`, so this file is only ever loaded through MapLazy (ssr: false).
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type LatLng = { lat: number; lng: number };

const PIN = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgb(0 0 0 / .25))">
    <path d="M17 1C8.2 1 1 8 1 16.7 1 28.5 17 43 17 43s16-14.5 16-26.3C33 8 25.8 1 17 1z" fill="#047857" stroke="#fff" stroke-width="2"/>
    <circle cx="17" cy="16.5" r="6" fill="#fff"/>
  </svg>`,
});

const WORLD: [number, number] = [20, 0];

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Moves the map when the pin is set from outside (search, "use my location"). */
function FollowPin({ value, zoom }: { value: LatLng | null; zoom: number }) {
  const map = useMap();
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const target = map.getZoom() < 12 ? zoom : map.getZoom();
    map.flyTo([lat, lng], target, { duration: 0.6 });
  }, [lat, lng, map, zoom]);
  return null;
}

type Props = {
  value: LatLng | null;
  onChange?: (p: LatLng) => void;
  className?: string;
};

/** OpenStreetMap with one pin. Editable when `onChange` is given, read-only otherwise. */
export default function PickupMap({ value, onChange, className = "h-80" }: Props) {
  const editable = onChange !== undefined;
  return (
    <div className={`isolate overflow-hidden rounded-xl border border-zinc-200 ${className}`}>
      <MapContainer
        center={value ? [value.lat, value.lng] : WORLD}
        zoom={value ? 16 : 2}
        scrollWheelZoom={editable}
        dragging
        className="size-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={PIN}
            draggable={editable}
            eventHandlers={
              editable
                ? {
                    dragend: (e) => {
                      const p = (e.target as L.Marker).getLatLng();
                      onChange({ lat: p.lat, lng: p.lng });
                    },
                  }
                : undefined
            }
          />
        )}
        {editable && <ClickToPlace onPick={onChange} />}
        <FollowPin value={value} zoom={16} />
      </MapContainer>
    </div>
  );
}
