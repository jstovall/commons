"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createPinIcon } from "@/lib/map-pin-icon";

export default function PileMapPreview({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    }).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng], { icon: createPinIcon() }).addTo(map);

    return () => {
      map.remove();
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height: "160px", width: "100%" }}
      className="rounded-md border-2 border-commons-ink"
    />
  );
}