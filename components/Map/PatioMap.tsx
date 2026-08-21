"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";
import { STATUS_META } from "@/lib/format";
import { TORONTO_COORDS } from "@/lib/constants";
import { readCamera, writeCamera } from "@/lib/map-camera";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Props {
  patios: Patio[];
  at: Date;
  cloudCoverPercent?: number;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Hands the parent a function that starts geolocation, so the app's own
   *  button can drive the Mapbox control. */
  onLocateReady?: (trigger: () => void) => void;
  onLocateError?: (message: string) => void;
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
  onLocateReady,
  onLocateError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const readyRef = useRef(false);
  const onLocateErrorRef = useRef(onLocateError);

  // Keep the newest error callback reachable from the map's own listener
  // without re-running the init effect.
  useEffect(() => {
    onLocateErrorRef.current = onLocateError;
  }, [onLocateError]);

  // Init map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    // Resume where this tab left off; the map is destroyed on unmount and
    // mobile browsers reload backgrounded pages, which otherwise dumps the
    // user back downtown.
    const saved = readCamera();
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: saved?.center ?? [TORONTO_COORDS.lng, TORONTO_COORDS.lat],
      zoom: saved?.zoom ?? 14,
      pitch: saved?.pitch ?? 55,
      bearing: saved?.bearing ?? -18,
      antialias: true,
    });
    mapRef.current = map;

    const persist = () => {
      const c = map.getCenter();
      writeCamera({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };
    map.on("moveend", persist);

    // showButton: false because the right rail already carries the app's own
    // "Find me" and weather buttons; HomeView drives this via trigger().
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 8000 },
      trackUserLocation: true,
      showAccuracyCircle: true,
      showUserLocation: true,
      showButton: false,
    });
    geolocateRef.current = geolocate;
    map.addControl(geolocate);

    geolocate.on("error", (err: GeolocationPositionError) => {
      onLocateErrorRef.current?.(
        err.code === err.PERMISSION_DENIED
          ? "Location permission is off. Enable it in your browser settings to see patios near you."
          : "Couldn't get your location. Try again in a moment."
      );
    });

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
      map.off("moveend", persist);
      map.remove();
      mapRef.current = null;
      geolocateRef.current = null;
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

  // Hand the trigger up so the app's own button can start geolocation.
  useEffect(() => {
    if (!TOKEN || !onLocateReady) return;
    onLocateReady(() => geolocateRef.current?.trigger());
  }, [onLocateReady]);

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
