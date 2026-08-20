"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Orientation, Patio } from "@/lib/types";
import type { OrientationOverrides } from "@/lib/orientation-overrides";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Keys are laid out so their physical position on the keyboard matches the
 * compass direction — Q is north-west, D is east, X is south. Judging a
 * direction and pressing it become the same motion.
 */
const COMPASS: { key: string; value: Orientation; label: string }[] = [
  { key: "q", value: "NW", label: "NW" },
  { key: "w", value: "N", label: "N" },
  { key: "e", value: "NE", label: "NE" },
  { key: "a", value: "W", label: "W" },
  { key: "o", value: "OPEN_SKY", label: "Open sky" },
  { key: "d", value: "E", label: "E" },
  { key: "z", value: "SW", label: "SW" },
  { key: "x", value: "S", label: "S" },
  { key: "c", value: "SE", label: "SE" },
];

const TIERS: { key: string; factor: number; label: string; hint: string }[] = [
  { key: "1", factor: 0.9, label: "Open", hint: "Rooftop, nothing nearby" },
  { key: "2", factor: 0.7, label: "Light", hint: "Some trees, a setback" },
  { key: "3", factor: 0.5, label: "Moderate", hint: "Buildings one side" },
  { key: "4", factor: 0.3, label: "Heavy", hint: "Narrow gap, enclosed" },
];

interface Props {
  patios: Patio[];
  initialOverrides: OrientationOverrides;
}

export function OrientationTool({ patios, initialOverrides }: Props) {
  const [entries, setEntries] = useState<OrientationOverrides>(initialOverrides);
  const [index, setIndex] = useState(() => {
    const first = patios.findIndex((p) => !initialOverrides[p.id]);
    return first === -1 ? 0 : first;
  });
  const [factor, setFactor] = useState(0.5);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patio = patios[index];
  const done = Object.keys(entries).length;

  // Debounced write-through to data/orientations.json.
  const persist = useCallback((next: OrientationOverrides) => {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/admin/orientations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setStatus("saved");
    }, 600);
  }, []);

  const record = useCallback(
    (orientation: Orientation) => {
      if (!patio) return;
      const next: OrientationOverrides = {
        ...entries,
        [patio.id]: {
          orientation,
          obstructionFactor: orientation === "OPEN_SKY" ? 0.9 : factor,
          verifiedAt: new Date().toISOString(),
        },
      };
      setEntries(next);
      persist(next);
      setIndex((i) => Math.min(i + 1, patios.length - 1));
    },
    [patio, entries, factor, persist, patios.length]
  );

  // Map init. Locked north-up and flat — a rotated or tilted view would make
  // the compass judgement wrong.
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [patios[0]?.lng ?? -79.3832, patios[0]?.lat ?? 43.6532],
      zoom: 18.5,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [patios]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !patio) return;
    map.jumpTo({ center: [patio.lng, patio.lat], zoom: 18.5 });
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.4)";
      markerRef.current = new mapboxgl.Marker({ element: el });
    }
    markerRef.current.setLngLat([patio.lng, patio.lat]).addTo(map);
  }, [patio]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();

      const dir = COMPASS.find((c) => c.key === k);
      if (dir) {
        e.preventDefault();
        record(dir.value);
        return;
      }
      const tier = TIERS.find((t) => t.key === k);
      if (tier) {
        e.preventDefault();
        setFactor(tier.factor);
        return;
      }
      if (k === "s" || e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, patios.length - 1));
      }
      if (e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record, patios.length]);

  if (!TOKEN) {
    return (
      <p className="p-8 text-muted">
        NEXT_PUBLIC_MAPBOX_TOKEN is not set — the satellite view needs it.
      </p>
    );
  }

  if (!patio) return <p className="p-8 text-muted">No patios to review.</p>;

  const current = entries[patio.id];
  const streetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${patio.lat},${patio.lng}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">{patio.name}</h1>
          <p className="text-sm text-muted">{patio.address}</p>
        </div>
        <div className="text-right text-sm text-muted">
          <div className="font-mono tabular-nums">
            {index + 1} / {patios.length} · {done} saved
          </div>
          <div className="text-xs">
            {status === "saving"
              ? "saving…"
              : status === "saved"
                ? "saved to orientations.json"
                : " "}
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(done / patios.length) * 100}%` }}
        />
      </div>

      <div
        ref={containerRef}
        className="h-[52vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-border"
      />

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={streetView}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-accent hover:border-accent/60"
        >
          Street View ↗
        </a>
        {current && (
          <span className="text-sm text-muted">
            Recorded{" "}
            <strong className="text-foreground">{current.orientation}</strong> at
            obstruction {current.obstructionFactor}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">
            Which way does the patio face?
          </p>
          <div className="grid w-fit grid-cols-3 gap-1.5">
            {COMPASS.map((c) => (
              <button
                key={c.key}
                onClick={() => record(c.value)}
                className={`h-16 w-20 rounded-lg border text-sm font-semibold transition ${
                  current?.orientation === c.value
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-surface text-foreground hover:border-accent/60"
                }`}
              >
                <span className="block">{c.label}</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">
                  {c.key}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">
            Obstruction — sticks until changed
          </p>
          <div className="flex flex-col gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFactor(t.factor)}
                className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  factor === t.factor
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface hover:border-accent/60"
                }`}
              >
                <span className="font-mono text-[11px] text-muted">{t.key}</span>
                <span className="font-semibold text-foreground">{t.label}</span>
                <span className="text-xs text-muted">{t.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            <span className="font-mono">S</span> or <span className="font-mono">→</span> skip ·{" "}
            <span className="font-mono">Backspace</span> back · Open sky forces
            obstruction 0.9
          </p>
        </div>
      </div>
    </div>
  );
}
