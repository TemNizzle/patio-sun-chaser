import { seedPatios } from "@/data/patios.seed";
import { barbadosPatios } from "@/data/barbados.seed";
import type { Patio } from "@/lib/types";
import type { CityId, ViewMode } from "@/lib/cities";
import { DEFAULT_CITY_ID } from "@/lib/cities";
import { estimateExposure, modeMatchScore } from "@/lib/sun-exposure";
import { applyOrientationOverrides } from "@/lib/orientation-overrides";

/** Seed data with data/orientations.json merged over it. */
function allPatios(): Patio[] {
  return applyOrientationOverrides([...seedPatios, ...barbadosPatios]);
}

/** Thin data-access layer. Swap the body for a DB query later; callers stay unchanged. */
export async function getAllPatios(): Promise<Patio[]> {
  return allPatios();
}

/** Venues for one city. Records with no `city` are the original Toronto set. */
export async function getPatiosForCity(city: CityId): Promise<Patio[]> {
  return allPatios().filter((p) => (p.city ?? DEFAULT_CITY_ID) === city);
}

export async function getPatioBySlug(
  slug: string,
  city: CityId = DEFAULT_CITY_ID
): Promise<Patio | undefined> {
  return allPatios().find(
    (p) => p.slug === slug && (p.city ?? DEFAULT_CITY_ID) === city
  );
}

export function getNeighborhoods(patios: Patio[]): string[] {
  return Array.from(new Set(patios.map((p) => p.neighborhood))).sort();
}

/**
 * Default ordering: sponsored patios first (by sponsorRank), then everyone
 * else by how well they match the mode (sunny in "sun", shaded in "shade"),
 * then alphabetically. Pure and testable.
 * `cloudCoverPercent` is an optional live-weather adjustment (see lib/weather.ts).
 */
export function sortPatios(
  patios: Patio[],
  at: Date,
  cloudCoverPercent?: number,
  mode: ViewMode = "sun"
): Patio[] {
  const confidenceNow = (p: Patio): number =>
    modeMatchScore(estimateExposure(p, at, cloudCoverPercent), mode);

  return [...patios].sort((a, b) => {
    if (a.sponsored !== b.sponsored) return a.sponsored ? -1 : 1;
    if (a.sponsored && b.sponsored) {
      return (a.sponsorRank ?? Infinity) - (b.sponsorRank ?? Infinity);
    }
    const conf = confidenceNow(b) - confidenceNow(a);
    if (Math.abs(conf) > 0.001) return conf;
    return a.name.localeCompare(b.name);
  });
}
