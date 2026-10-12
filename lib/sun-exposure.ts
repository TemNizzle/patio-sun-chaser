import { getPosition, getTimes } from "suncalc";
import { toZonedTime } from "date-fns-tz";
import type { ExposureSource, Orientation, Patio } from "@/lib/types";
import { patioCity } from "@/lib/cities";
import type { ViewMode } from "@/lib/cities";

/** How much to trust a curated sun window, by where it came from. */
const CONFIDENCE_BY_SOURCE: Record<ExposureSource, number> = {
  "mockdata-csv": 0.5,
  manual: 0.6,
  "satellite-estimated": 0.7,
  verified: 0.9,
};

export interface SunSnapshot {
  /** Sun altitude above horizon, degrees. <= 0 means below horizon (night). */
  altitudeDeg: number;
  /** Compass bearing of the sun: 0 = N, 90 = E, 180 = S, 270 = W. */
  azimuthDeg: number;
  isDaytime: boolean;
  /** Null only at extreme latitudes (polar day/night); never null for the cities we cover. */
  sunrise: Date | null;
  sunset: Date | null;
}

/**
 * Layer 1 — pure astronomy for a lat/lng at an instant. Never touches patio
 * data, so it's the stable foundation the swappable heuristic sits on top of.
 */
export function getSunSnapshot(lat: number, lng: number, date: Date): SunSnapshot {
  const pos = getPosition(date, lat, lng);
  const times = getTimes(date, lat, lng);

  // This suncalc build already returns degrees with a north-based compass
  // azimuth (0 = N, 90 = E, 180 = S, 270 = W) and altitude in degrees.
  return {
    altitudeDeg: pos.altitude,
    azimuthDeg: pos.azimuth,
    isDaytime: pos.altitude > 0,
    sunrise: times.sunrise,
    sunset: times.sunset,
  };
}

export type SunStatus = "sunny" | "shaded" | "closed-sky";

export interface ExposureResult {
  status: SunStatus;
  /** 0..1, how much to trust this estimate. */
  confidence: number;
  reason: string;
}

const ORIENTATION_BEARING: Record<Exclude<Orientation, "OPEN_SKY">, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

const DEFAULT_ARC_WIDTH_DEG = 140;

/** Above this sun altitude, partial overhead cover is assumed to shade the seats. Placeholder until real shadow data exists. */
const PARTIAL_COVER_BLOCKS_ABOVE_DEG = 60;

function angularDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Fractional local hour (e.g. 13.5 for 1:30pm) in an IANA timezone, timezone-safe. */
function localHour(date: Date, timezone: string): number {
  const zoned = toZonedTime(date, timezone);
  return zoned.getHours() + zoned.getMinutes() / 60;
}

function parseHour(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h + (m || 0) / 60;
}

/**
 * Layer 2 (PLACEHOLDER MODEL — swap point for future shadow-casting).
 * Combines the real sun position with manually-curated exposure data. No
 * building-footprint/height data is used here; a future model would expose
 * the same ExposureResult shape and replace this function wholesale.
 *
 * `cloudCoverPercent` (0-100) is an optional real-time weather adjustment —
 * only pass it when `date` represents "now" (see lib/weather.ts). It never
 * changes the underlying sun-position math, only discounts the result.
 */
export function estimateExposure(
  patio: Patio,
  date: Date,
  cloudCoverPercent?: number
): ExposureResult {
  const base = estimateSunPositionExposure(patio, date);
  if (cloudCoverPercent === undefined || base.status === "closed-sky") {
    return base;
  }
  return applyCloudCover(base, cloudCoverPercent);
}

const CLOUD_OVERCAST_THRESHOLD = 70;

/** Discounts a sun-position result using live cloud cover (0-100%). */
function applyCloudCover(
  result: ExposureResult,
  cloudCoverPercent: number
): ExposureResult {
  if (cloudCoverPercent <= CLOUD_OVERCAST_THRESHOLD || result.status === "shaded") {
    return result;
  }
  const pct = Math.round(cloudCoverPercent);
  return {
    status: "shaded",
    confidence: Math.min(result.confidence, 0.7),
    reason: `${result.reason} Overcast (${pct}% cloud cover) blocks direct sun.`,
  };
}

function estimateSunPositionExposure(patio: Patio, date: Date): ExposureResult {
  const snap = getSunSnapshot(patio.lat, patio.lng, date);

  if (!snap.isDaytime) {
    return { status: "closed-sky", confidence: 1, reason: "Sun is below the horizon." };
  }

  const { sunStartsAt, sunEndsAt, orientation, obstructionFactor, coverage } =
    patio.exposure;

  // Overhead cover. A roof shades the seating at any sun angle; this is what
  // matters in the tropics, where the sun is often near the zenith and a
  // compass orientation tells you little.
  if (coverage === "roofed") {
    return {
      status: "shaded",
      confidence: CONFIDENCE_BY_SOURCE[patio.exposure.exposureSource],
      reason: "Roofed: shaded at any sun angle.",
    };
  }
  // An awning or trees block a high sun but let a low one in sideways.
  if (coverage === "partial" && snap.altitudeDeg >= PARTIAL_COVER_BLOCKS_ABOVE_DEG) {
    return {
      status: "shaded",
      confidence: 0.6,
      reason: `Partly covered: sun is high (${Math.round(snap.altitudeDeg)}°) so overhead cover shades it.`,
    };
  }

  // A curated/mock sun window takes priority when present.
  if (sunStartsAt && sunEndsAt) {
    const hourNow = localHour(date, patioCity(patio).timezone);
    const from = parseHour(sunStartsAt);
    const to = parseHour(sunEndsAt);
    const inWindow = hourNow >= from && hourNow < to;
    const confidence = CONFIDENCE_BY_SOURCE[patio.exposure.exposureSource];
    return {
      status: inWindow ? "sunny" : "shaded",
      confidence,
      reason: inWindow
        ? `Within curated sun window (${sunStartsAt}–${sunEndsAt}).`
        : `Outside curated sun window (${sunStartsAt}–${sunEndsAt}).`,
    };
  }

  // Cover tagged but no compass direction (the usual case in Barbados): with
  // nothing overhead the seating is in the sun whenever the sun is up; with
  // partial cover the low sun, below the threshold above, still reaches it.
  if (!orientation && coverage === "open") {
    return {
      status: "sunny",
      confidence: obstructionFactor,
      reason: "Open air with nothing overhead.",
    };
  }
  if (!orientation && coverage === "partial") {
    return {
      status: "sunny",
      confidence: 0.4,
      reason: "Partly covered, but the sun is low enough to reach the seats.",
    };
  }

  if (orientation === "OPEN_SKY") {
    return {
      status: "sunny",
      confidence: obstructionFactor,
      reason: "Open sky / rooftop.",
    };
  }

  if (!orientation) {
    return { status: "shaded", confidence: 0.2, reason: "No exposure data available." };
  }

  const targetBearing = ORIENTATION_BEARING[orientation];
  const diff = angularDiff(snap.azimuthDeg, targetBearing);
  const halfArc = DEFAULT_ARC_WIDTH_DEG / 2;

  if (diff <= halfArc) {
    const centeredness = 1 - diff / halfArc;
    const confidence = Math.max(0.1, centeredness * obstructionFactor);
    return {
      status: "sunny",
      confidence,
      reason: `Sun bearing ${Math.round(snap.azimuthDeg)}° within ${orientation} arc.`,
    };
  }

  return {
    status: "shaded",
    confidence: 0.6,
    reason: `Sun bearing ${Math.round(snap.azimuthDeg)}° outside ${orientation} arc.`,
  };
}

/**
 * Estimated sun window for a calendar date: scans sunrise -> sunset in fixed
 * steps and returns the first/last sunny instant.
 */
export function estimateSunWindow(
  patio: Patio,
  date: Date
): { start: Date | null; end: Date | null } {
  const snap = getSunSnapshot(patio.lat, patio.lng, date);
  if (!snap.sunrise || !snap.sunset) return { start: null, end: null };
  const stepMs = 15 * 60 * 1000;
  let start: Date | null = null;
  let end: Date | null = null;

  for (let t = snap.sunrise.getTime(); t <= snap.sunset.getTime(); t += stepMs) {
    const d = new Date(t);
    const result = estimateExposure(patio, d);
    if (result.status === "sunny") {
      if (!start) start = d;
      end = d;
    }
  }

  return { start, end };
}

/**
 * How well a result matches what the user is looking for, 0..1. In sun mode a
 * sunny result scores by its confidence; in shade mode a shaded one does.
 * Night matches neither.
 */
export function modeMatchScore(result: ExposureResult, mode: ViewMode): number {
  const wanted = mode === "sun" ? "sunny" : "shaded";
  return result.status === wanted ? result.confidence : 0;
}
