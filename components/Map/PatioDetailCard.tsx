"use client";

import Link from "next/link";
import type { Patio } from "@/lib/types";
import { formatHours, patioSunWindow, mapsUrl } from "@/lib/format";

interface Props {
  patio: Patio;
  onClose: () => void;
}

export function PatioDetailCard({ patio, onClose }: Props) {
  const hours = formatHours(patio.hours);
  const sunWindow = patioSunWindow(patio, new Date());

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 p-3">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/patios/${patio.slug}`}
              className="text-lg font-bold text-foreground hover:underline"
            >
              {patio.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>🕑</span>
                {hours ?? "Hours unavailable"}
              </span>
              {sunWindow && (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <span aria-hidden>☀</span>
                  {sunWindow.text}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full px-2 py-0.5 text-muted hover:bg-surface-muted"
          >
            ✕
          </button>
        </div>

        <a
          href={mapsUrl(patio.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted py-2.5 text-sm font-medium text-foreground hover:border-accent/60"
        >
          <span aria-hidden>➤</span> Open in Maps
        </a>
      </div>
    </div>
  );
}
