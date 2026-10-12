"use client";

import type { ViewMode } from "@/lib/cities";

export interface Filters {
  neighborhood: string;
  /** Show only venues that match the current mode (sunny in sun mode, shaded in shade mode). */
  matchOnly: boolean;
}

interface Props {
  neighborhoods: string[];
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
  mode: ViewMode;
  allAreasLabel: string;
  venueNoun: string;
  venueNounPlural: string;
}

export function PatioFilters({
  neighborhoods,
  filters,
  onChange,
  resultCount,
  mode,
  allAreasLabel,
  venueNoun,
  venueNounPlural,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <select
        value={filters.neighborhood}
        onChange={(e) => onChange({ ...filters, neighborhood: e.target.value })}
        className="rounded-lg border border-border bg-surface px-3 py-1.5"
      >
        <option value="">{allAreasLabel}</option>
        {neighborhoods.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={filters.matchOnly}
          onChange={(e) => onChange({ ...filters, matchOnly: e.target.checked })}
          className="accent-[var(--sun-sunny)]"
        />
        {mode === "shade" ? "Shaded now only" : "Sunny now only"}
      </label>

      <span className="ml-auto text-muted">
        {resultCount} {resultCount === 1 ? venueNoun : venueNounPlural}
      </span>
    </div>
  );
}
