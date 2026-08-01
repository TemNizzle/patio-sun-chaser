import { seedPatios } from "@/data/patios.seed";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";

/** Thin data-access layer. Swap the body for a DB query later; callers stay unchanged. */
export async function getAllPatios(): Promise<Patio[]> {
  return seedPatios;
}

export async function getPatioBySlug(slug: string): Promise<Patio | undefined> {
  return seedPatios.find((p) => p.slug === slug);
}

export function getNeighborhoods(patios: Patio[]): string[] {
  return Array.from(new Set(patios.map((p) => p.neighborhood))).sort();
}

/**
 * Default ordering: sponsored patios first (by sponsorRank), then everyone
 * else by current sun confidence, then alphabetically. Pure and testable.
 */
export function sortPatios(patios: Patio[], at: Date): Patio[] {
  const confidenceNow = (p: Patio): number => {
    const r = estimateExposure(p, at);
    return r.status === "sunny" || r.status === "partial" ? r.confidence : 0;
  };

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
