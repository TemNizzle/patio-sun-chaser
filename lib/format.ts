import { formatInTimeZone } from "date-fns-tz";
import { estimateSunWindow, type SunStatus } from "@/lib/sun-exposure";
import type { ExposureProfile, Patio } from "@/lib/types";
import { TORONTO_TIMEZONE } from "@/lib/constants";

/**
 * Status colours describe *how much sun is available*, not how good the patio
 * is — red (most direct sun) through amber (sun is up, this patio is shaded)
 * to green (no sun to be had). Sun-seekers and shade-seekers read the same
 * scale from opposite ends; neither is the "good" colour.
 *
 * Hex, not `var(--sun-*)`, because call sites append an alpha suffix
 * (`${color}22`) to derive tints — that only works on a hex literal. The CSS
 * variables in app/globals.css mirror these and must be kept in sync.
 */
export const STATUS_META: Record<
  SunStatus,
  { label: string; color: string; dot: string }
> = {
  sunny: { label: "Sunny now", color: "#ef4444", dot: "🔴" },
  shaded: { label: "In shade", color: "#f59e0b", dot: "🟠" },
  "closed-sky": { label: "No sun", color: "#16a34a", dot: "🟢" },
};

/** "00:00-00:00" is the CSV's sentinel for unknown hours. */
export function formatHours(hours?: string): string | null {
  if (!hours || hours === "00:00-00:00") return null;
  return hours.replace("-", " – ");
}

export function formatSunWindow(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  return `${start} – ${end}`;
}

export interface SunWindowDisplay {
  text: string;
  /** True when derived from orientation rather than a curated window. */
  isEstimate: boolean;
}

/**
 * Scanning sunrise→sunset in 15-minute steps costs ~50 sun-position solves per
 * patio, and the list view renders 100+ of them on every time-slider tick. The
 * window only depends on the calendar date, so cache on (patio, day).
 */
const windowCache = new Map<string, SunWindowDisplay | null>();

function dayKey(date: Date): string {
  return formatInTimeZone(date, TORONTO_TIMEZONE, "yyyy-MM-dd");
}

/**
 * The sun window to show for a patio: its curated window when one exists,
 * otherwise the window computed from orientation. Patios carrying only
 * orientation used to render no window at all.
 */
export function patioSunWindow(patio: Patio, date: Date): SunWindowDisplay | null {
  const curated = formatSunWindow(
    patio.exposure.sunStartsAt,
    patio.exposure.sunEndsAt
  );
  if (curated) return { text: curated, isEstimate: false };

  const key = `${patio.id}|${dayKey(date)}`;
  const cached = windowCache.get(key);
  if (cached !== undefined) return cached;

  const { start, end } = estimateSunWindow(patio, date);
  const computed =
    start && end
      ? {
          text: `${formatInTimeZone(start, TORONTO_TIMEZONE, "HH:mm")} – ${formatInTimeZone(
            end,
            TORONTO_TIMEZONE,
            "HH:mm"
          )}`,
          isEstimate: true,
        }
      : null;
  windowCache.set(key, computed);
  return computed;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

/** Detail-page disclaimer/confirmation copy for an exposure profile's data source. */
export function exposureSourceNote(exposure: ExposureProfile): string | null {
  const verifiedDate = exposure.verifiedAt
    ? new Date(exposure.verifiedAt).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  switch (exposure.exposureSource) {
    case "mockdata-csv":
      return "Sun times shown are placeholder estimates from seed data, not yet verified against real sun-angle and building-shadow modeling.";
    case "verified":
      return verifiedDate
        ? `Sun exposure verified in person on ${verifiedDate}.`
        : "Sun exposure verified in person.";
    case "satellite-estimated":
      return "Sun exposure estimated from satellite imagery, not yet confirmed with staff.";
    case "manual":
      return null;
  }
}
