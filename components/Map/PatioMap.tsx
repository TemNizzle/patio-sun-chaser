"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";
import { STATUS_META } from "@/lib/format";
import { TORONTO_COORDS } from "@/lib/constants";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Props {
  patios: Patio[];
  at: Date;
  cloudCoverPercent?: number;
  selectedId?: string;
  onSelect: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
}

function dotEl(color: string, ring: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = ring ? "3px solid #f5a623" : "2px solid #ffffff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
  el.style.cursor = "pointer";
  return el;
}

export function PatioMap({
  patios,
  at,
  cloudCoverPercent,
  selectedId,
  onSelect,
  userLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const readyRef = useRef(false);

  // Init map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [TORONTO_COORDS.lng, TORONTO_COORDS.lat],
      zoom: 14,
      pitch: 55,
      bearing: -18,
      antialias: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      // 3D building extrusion for the tilted, massing look.
      const layers = map.getStyle().layers ?? [];
      const labelLayer = layers.find(
        (l) => l.type === "symbol" && l.layout && "text-field" in l.layout
      );
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": "#cbd3de",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.75,
          },
        },
        labelLayer?.id
      );
      readyRef.current = true;
      renderMarkers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render patio markers when data, time, or selection changes.
  function renderMarkers() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const seen = new Set<string>();
    for (const patio of patios) {
      seen.add(patio.id);
      const status = estimateExposure(patio, at, cloudCoverPercent).status;
      const color = STATUS_META[status].color;
      const ring = patio.sponsored || patio.id === selectedId;

      let marker = markersRef.current.get(patio.id);
      if (!marker) {
        const el = dotEl(color, ring);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(patio.id);
        });
        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([patio.lng, patio.lat])
          .addTo(map);
        markersRef.current.set(patio.id, marker);
      } else {
        const el = marker.getElement();
        el.style.background = color;
        el.style.border = ring ? "3px solid #f5a623" : "2px solid #ffffff";
      }
    }

    // Remove markers for patios no longer present (e.g. filtered out).
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }

  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patios, at, cloudCoverPercent, selectedId]);

  // User location marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = dotEl("#2f6fed", false);
      el.style.border = "3px solid #ffffff";
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    }
    map.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 16, duration: 600 });
  }, [userLocation]);

  // Pan to selected patio.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const patio = patios.find((p) => p.id === selectedId);
    if (patio) map.easeTo({ center: [patio.lng, patio.lat], duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-muted p-8 text-center text-sm text-muted">
        <div className="max-w-md">
          <div className="mb-2 text-2xl">🗺️</div>
          <p className="font-semibold text-foreground">Map needs a Mapbox token</p>
          <p className="mt-1">
            Add{" "}
            <code className="rounded bg-surface px-1 py-0.5">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            to <code className="rounded bg-surface px-1 py-0.5">.env.local</code>{" "}
            (free tier) to see the 3D patio map. The list view below works
            without it.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
