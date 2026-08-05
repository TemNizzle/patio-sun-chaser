"use client";

import { useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";

function cloudIcon(cloudCoverPercent: number): string {
  if (cloudCoverPercent > 70) return "☁️";
  if (cloudCoverPercent >= 30) return "⛅";
  return "☀️";
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WeatherButton({
  weather,
}: {
  weather: WeatherSnapshot | null;
}) {
  const [open, setOpen] = useState(false);

  if (!weather) return null;

  return (
    <div className="absolute right-4 top-28 z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Current weather"
        className="rounded-full border border-border bg-surface/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur hover:border-accent/60"
      >
        {cloudIcon(weather.cloudCoverPercent)} {Math.round(weather.temperatureC)}°
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface/95 p-3 text-sm shadow-lg backdrop-blur">
          <div className="font-semibold text-foreground">
            {cloudIcon(weather.cloudCoverPercent)} Toronto weather
          </div>
          <div className="mt-1 text-muted">
            {Math.round(weather.cloudCoverPercent)}% cloud cover
          </div>
          <div className="text-muted">
            {Math.round(weather.temperatureC)}°C
          </div>
          <div className="mt-2 text-xs text-muted">
            As of {timeLabel(weather.observedAt)} · adjusting sunny/partial/
            shaded estimates
          </div>
        </div>
      )}
    </div>
  );
}
