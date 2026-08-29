"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createPinIcon } from "@/lib/map-pin-icon";

export default function LocationPicker({
  initialLat,
  initialLng,
  onLocationChange,
}: {
  initialLat: number;
  initialLng: number;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const safeLat = Number.isFinite(initialLat) ? initialLat : 47.2529;
const safeLng = Number.isFinite(initialLng) ? initialLng : -122.4443;
const map = L.map(containerRef.current).setView([safeLat, safeLng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: createPinIcon(),
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: "220px", width: "100%" }}
      className="rounded-md border-2 border-commons-ink"
    />
  );
}