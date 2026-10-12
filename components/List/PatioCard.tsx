"use client";

import Link from "next/link";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";
import {
  STATUS_META,
  COVERAGE_LABEL,
  formatHours,
  patioSunWindow,
  mapsUrl,
} from "@/lib/format";
import { venuePath, DEFAULT_CITY_ID, type ViewMode } from "@/lib/cities";
import { SponsoredBadge } from "@/components/Ads/SponsoredBadge";

interface Props {
  patio: Patio;
  at: Date;
  cloudCoverPercent?: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  mode?: ViewMode;
}

export function PatioCard({
  patio,
  at,
  cloudCoverPercent,
  selected,
  onSelect,
  mode = "sun",
}: Props) {
  const exposure = estimateExposure(patio, at, cloudCoverPercent);
  const meta = STATUS_META[exposure.status];
  const hours = formatHours(patio.hours);
  const sunWindow = patioSunWindow(patio, at);
  // In shade mode the sun window is context, so word it as when the sun reaches the seats.
  const sunWindowLabel = mode === "shade" ? "In sun" : "Sun";
  const isEstimated = patio.exposure.exposureSource !== "verified";

  return (
    <div
      onClick={() => onSelect?.(patio.id)}
      className={`rounded-xl border bg-surface p-4 transition ${
        selected ? "border-accent ring-1 ring-accent" : "border-border"
      } ${onSelect ? "cursor-pointer hover:border-accent/60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={venuePath(patio.city ?? DEFAULT_CITY_ID, patio.slug)}
              onClick={(e) => e.stopPropagation()}
              className="truncate font-semibold text-foreground hover:underline"
            >
              {patio.name}
            </Link>
            {patio.sponsored && <SponsoredBadge label={patio.sponsorLabel} />}
          </div>
          <div className="mt-0.5 text-sm text-muted">{patio.neighborhood}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
          {isEstimated && (
            <span className="text-[11px] text-muted">Estimated</span>
          )}
          {patio.exposure.coverage && (
            <span className="text-[11px] text-muted">
              {COVERAGE_LABEL[patio.exposure.coverage]}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {sunWindow && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>☀</span>
            {sunWindowLabel} {sunWindow.text}
          </span>
        )}
        {hours && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>🕑</span>
            {hours}
          </span>
        )}
        <a
          href={mapsUrl(patio.address)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto text-accent hover:underline"
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  );
}
