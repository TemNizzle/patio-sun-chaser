"use client";

import { useMemo, useState } from "react";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";
import { sortPatios, getNeighborhoods } from "@/lib/patios";
import { PatioMap } from "@/components/Map/PatioMap";
import { MapHeader } from "@/components/Map/MapHeader";
import { MapLegend } from "@/components/Map/MapLegend";
import { PatioDetailCard } from "@/components/Map/PatioDetailCard";
import { PatioList } from "@/components/List/PatioList";
import { PatioFilters, type Filters } from "@/components/List/PatioFilters";
import { SunTimeControl } from "@/components/DateTimePicker/SunTimeControl";
import { AdSlot } from "@/components/Ads/AdSlot";

export function HomeView({ patios }: { patios: Patio[] }) {
  const [now, setNow] = useState(() => new Date());
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>({
    neighborhood: "",
    sunnyOnly: false,
  });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const at = previewAt ?? now;
  const neighborhoods = useMemo(() => getNeighborhoods(patios), [patios]);

  const visible = useMemo(() => {
    let list = patios;
    if (filters.neighborhood) {
      list = list.filter((p) => p.neighborhood === filters.neighborhood);
    }
    if (filters.sunnyOnly) {
      list = list.filter((p) => estimateExposure(p, at).status === "sunny");
    }
    return sortPatios(list, at);
  }, [patios, filters, at]);

  const selected = patios.find((p) => p.id === selectedId);

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative h-[52vh] min-h-[360px] w-full overflow-hidden border-b border-border">
        <MapHeader />
        <PatioMap
          patios={visible}
          at={at}
          selectedId={selectedId}
          onSelect={setSelectedId}
          userLocation={userLocation}
        />
        <MapLegend />
        <button
          onClick={locate}
          className="absolute right-4 top-16 z-20 rounded-full border border-border bg-surface/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur hover:border-accent/60"
        >
          📍 Find me
        </button>
        {selected && (
          <PatioDetailCard
            patio={selected}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </section>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-col gap-3">
          <SunTimeControl
            value={at}
            onChange={setPreviewAt}
            onReset={() => {
              setPreviewAt(null);
              setNow(new Date());
            }}
            isNow={previewAt === null}
          />
          <PatioFilters
            neighborhoods={neighborhoods}
            filters={filters}
            onChange={setFilters}
            resultCount={visible.length}
          />
        </div>

        <AdSlot placement="home-top" />
        <div className="mt-4">
          <PatioList
            patios={visible}
            at={at}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </section>
    </div>
  );
}
