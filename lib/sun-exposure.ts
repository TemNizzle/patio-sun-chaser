import { getPosition, getTimes } from "suncalc";
import { toZonedTime } from "date-fns-tz";
import type { Orientation, Patio } from "@/lib/types";
import { TORONTO_TIMEZONE } from "@/lib/constants";

export interface SunSnapshot {
  /** Sun altitude above horizon, degrees. <= 0 means below horizon (night). */
  altitudeDeg: number;
  /** Compass bearing of the sun: 0 = N, 90 = E, 180 = S, 270 = W. */
  azimuthDeg: number;
  isDaytime: boolean;
  /** Null only at extreme latitudes (polar day/night); never null for Toronto. */
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

export type SunStatus = "sunny" | "partial" | "shaded" | "closed-sky";

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

function angularDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Fractional Toronto-local hour (e.g. 13.5 for 1:30pm), timezone-safe. */
function torontoLocalHour(date: Date): number {
  const zoned = toZonedTime(date, TORONTO_TIMEZONE);
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
 */
export function estimateExposure(patio: Patio, date: Date): ExposureResult {
  const snap = getSunSnapshot(patio.lat, patio.lng, date);

  if (!snap.isDaytime) {
    return { status: "closed-sky", confidence: 1, reason: "Sun is below the horizon." };
  }

  const { sunStartsAt, sunEndsAt, orientation, obstructionFactor } = patio.exposure;

  // A curated/mock sun window takes priority when present.
  if (sunStartsAt && sunEndsAt) {
    const localHour = torontoLocalHour(date);
    const from = parseHour(sunStartsAt);
    const to = parseHour(sunEndsAt);
    const inWindow = localHour >= from && localHour < to;
    const confidence = patio.exposure.isMockExposure ? 0.5 : 0.8;
    return {
      status: inWindow ? "sunny" : "shaded",
      confidence,
      reason: inWindow
        ? `Within curated sun window (${sunStartsAt}–${sunEndsAt}).`
        : `Outside curated sun window (${sunStartsAt}–${sunEndsAt}).`,
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
    const status: SunStatus = confidence > 0.4 ? "sunny" : "partial";
    return {
      status,
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
 * steps and returns the first/last sunny-or-partial instant.
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
    if (result.status === "sunny" || result.status === "partial") {
      if (!start) start = d;
      end = d;
    }
  }

  return { start, end };
}
