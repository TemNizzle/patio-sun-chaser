"use client";

export interface Filters {
  neighborhood: string;
  sunnyOnly: boolean;
}

interface Props {
  neighborhoods: string[];
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
}

export function PatioFilters({
  neighborhoods,
  filters,
  onChange,
  resultCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <select
        value={filters.neighborhood}
        onChange={(e) => onChange({ ...filters, neighborhood: e.target.value })}
        className="rounded-lg border border-border bg-surface px-3 py-1.5"
      >
        <option value="">All neighborhoods</option>
        {neighborhoods.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={filters.sunnyOnly}
          onChange={(e) => onChange({ ...filters, sunnyOnly: e.target.checked })}
          className="accent-[var(--sun-sunny)]"
        />
        Sunny now only
      </label>

      <span className="ml-auto text-muted">
        {resultCount} {resultCount === 1 ? "patio" : "patios"}
      </span>
    </div>
  );
}
