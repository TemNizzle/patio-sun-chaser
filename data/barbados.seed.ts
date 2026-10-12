import type { Patio } from "@/lib/types";

/**
 * Barbados venues (bars, restaurants, beach bars, rum shops).
 *
 * Generated from an Apify Google Places export:
 *   npx tsx scripts/import-apify.ts barbados <export.json> > data/barbados.seed.ts
 *
 * Imported records carry no exposure data, so they read as low-confidence
 * until their `coverage` is set, either here or via data/orientations.json
 * (see data/README.md, "Barbados").
 */
export const barbadosPatios: Patio[] = [];
