"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CITIES, DEFAULT_CITY_ID, type ViewMode } from "@/lib/cities";

interface Props {
  value: Date;
  onChange: (next: Date) => void;
  onReset: () => void;
  isNow: boolean;
  /** IANA timezone of the city being viewed. Defaults to Toronto. */
  timezone?: string;
  mode?: ViewMode;
}

/**
 * Preview sun or shade at a chosen date/time. All display is in the city's
 * local time; edits rebuild a Date from the wall-clock the user picked.
 */
export function SunTimeControl({
  value,
  onChange,
  onReset,
  isNow,
  timezone = CITIES[DEFAULT_CITY_ID].timezone,
  mode = "sun",
}: Props) {
  const dateStr = formatInTimeZone(value, timezone, "yyyy-MM-dd");
  const hour = Number(formatInTimeZone(value, timezone, "H"));
  const timeLabel = formatInTimeZone(value, timezone, "h:mm a");

  const rebuild = (nextDate: string, nextHour: number) => {
    // Construct the instant matching the chosen wall-clock time in the city.
    const offset = formatInTimeZone(value, timezone, "XXX"); // e.g. -04:00
    const hh = String(nextHour).padStart(2, "0");
    onChange(new Date(`${nextDate}T${hh}:00:00${offset}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <span className="font-semibold text-foreground">
        {mode === "shade" ? "Preview shade at" : "Preview sun at"}
      </span>
      <input
        type="date"
        value={dateStr}
        onChange={(e) => rebuild(e.target.value, hour)}
        className="rounded-lg border border-border bg-surface-muted px-2 py-1"
      />
      <label className="flex flex-1 items-center gap-2 min-w-[200px]">
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => rebuild(dateStr, Number(e.target.value))}
          className="flex-1 accent-[var(--sun-accent)]"
        />
        <span className="w-20 tabular-nums text-muted">{timeLabel}</span>
      </label>
      {!isNow && (
        <button
          onClick={onReset}
          className="rounded-lg bg-accent/15 px-3 py-1 font-medium text-accent"
        >
          Now
        </button>
      )}
    </div>
  );
}
