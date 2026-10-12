"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Patio } from "@/lib/types";
import type { WeatherSnapshot } from "@/lib/weather";
import { estimateExposure, modeMatchScore } from "@/lib/sun-exposure";
import type { City, ViewMode } from "@/lib/cities";
import { sortPatios, getNeighborhoods } from "@/lib/patios";
import { PatioMap } from "@/components/Map/PatioMap";
import { MapHeader } from "@/components/Map/MapHeader";
import { MapLegend } from "@/components/Map/MapLegend";
import { PatioDetailCard } from "@/components/Map/PatioDetailCard";
import { PatioList } from "@/components/List/PatioList";
import { PatioFilters, type Filters } from "@/components/List/PatioFilters";
import { SunTimeControl } from "@/components/DateTimePicker/SunTimeControl";
import { AdSlot } from "@/components/Ads/AdSlot";
import { WeatherButton } from "@/components/Weather/WeatherButton";

export function HomeView({
  city,
  patios,
  weather,
}: {
  city: City;
  patios: Patio[];
  weather: WeatherSnapshot | null;
}) {
  const [now, setNow] = useState(() => new Date());
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const [mode, setMode] = useState<ViewMode>(city.defaultMode);
  const [filters, setFilters] = useState<Filters>({
    neighborhood: "",
    matchOnly: false,
  });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [locateError, setLocateError] = useState<string | null>(null);
  const locateRef = useRef<(() => void) | null>(null);

  const at = previewAt ?? now;
  const neighborhoods = useMemo(() => getNeighborhoods(patios), [patios]);

  // Live weather only applies to "now" — previewing another time falls back
  // to the pure sun-position model (see lib/weather.ts / lib/sun-exposure.ts).
  const cloudCoverPercent =
    previewAt === null ? weather?.cloudCoverPercent : undefined;

  const visible = useMemo(() => {
    let list = patios;
    if (filters.neighborhood) {
      list = list.filter((p) => p.neighborhood === filters.neighborhood);
    }
    if (filters.matchOnly) {
      list = list.filter(
        (p) =>
          modeMatchScore(
            estimateExposure(p, now, weather?.cloudCoverPercent),
            mode
          ) > 0
      );
    }
    return sortPatios(list, at, cloudCoverPercent, mode);
  }, [patios, filters, at, now, weather, cloudCoverPercent, mode]);

  const selected = patios.find((p) => p.id === selectedId);

  // Stable identity: PatioMap calls this from an effect keyed on the prop.
  const handleLocateReady = useCallback((trigger: () => void) => {
    locateRef.current = trigger;
  }, []);

  const locate = () => {
    setLocateError(null);
    locateRef.current?.();
  };

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative h-[52vh] min-h-[360px] w-full overflow-hidden border-b border-border">
        <MapHeader city={city} />
        <PatioMap
          city={city}
          patios={visible}
          at={at}
          cloudCoverPercent={cloudCoverPercent}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onLocateReady={handleLocateReady}
          onLocateError={setLocateError}
        />
        <MapLegend mode={mode} />
        <button
          onClick={locate}
          className="absolute right-4 top-16 z-20 rounded-full border border-border bg-surface/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur hover:border-accent/60"
        >
          📍 Find me
        </button>
        {locateError && (
          <div
            role="status"
            className="absolute bottom-4 right-4 z-30 max-w-[15rem] rounded-xl border border-border bg-surface/95 p-3 text-xs shadow-lg backdrop-blur"
          >
            <p className="text-foreground">{locateError}</p>
            <button
              onClick={() => setLocateError(null)}
              className="mt-2 text-muted underline hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        )}
        <WeatherButton weather={weather} city={city} />
        {selected && (
          <PatioDetailCard
            patio={selected}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </section>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-col gap-3">
          <ModeToggle mode={mode} onChange={setMode} />
          <SunTimeControl
            timezone={city.timezone}
            mode={mode}
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
            onChange={(next) => {
              if (next.matchOnly && !filters.matchOnly) {
                setPreviewAt(null);
              }
              setFilters(next);
            }}
            resultCount={visible.length}
            mode={mode}
            allAreasLabel={city.areaAllLabel}
            venueNoun={city.venueNoun}
            venueNounPlural={city.venueNounPlural}
          />
        </div>

        <AdSlot placement="home-top" />
        <div className="mt-4">
          <PatioList
            patios={visible}
            at={at}
            cloudCoverPercent={cloudCoverPercent}
            selectedId={selectedId}
            onSelect={setSelectedId}
            mode={mode}
            venueNounPlural={city.venueNounPlural}
          />
        </div>
      </section>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string }[] = [
    { value: "sun", label: "☀ Find sun" },
    { value: "shade", label: "⛱ Find shade" },
  ];
  return (
    <div
      role="group"
      aria-label="What are you looking for?"
      className="inline-flex w-fit rounded-full border border-border bg-surface p-0.5 text-sm"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            mode === o.value
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
