/**
 * STUB — Apify export importer.
 *
 * The real Apify list isn't wired in yet. When it arrives (a JSON array from
 * the Apify Google Maps scraper), this script maps each raw record to our
 * `Patio` type and writes draft records for manual exposure curation.
 *
 * Usage (once implemented):
 *   npx tsx scripts/import-apify.ts <path-to-apify-export.json> > data/patios.imported.json
 *
 * Fields Apify provides vs. fields we must curate by hand are documented in
 * data/README.md. Everything under `exposure.*`, plus `sponsored*`, is NOT in
 * scraped data — imported records get safe defaults and a review flag so
 * nothing ships with fake sun data.
 */
import type { Patio, PatioCategory } from "@/lib/types";

interface ApifyPlace {
  title: string;
  address?: string;
  location?: { lat: number; lng: number };
  categoryName?: string;
  totalScore?: number;
  phone?: string;
  website?: string;
  imageUrl?: string;
  placeId?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function neighborhoodFromAddress(address = ""): string {
  // Best-effort: the city component before the province code.
  const match = address.match(/,\s*([^,]+),\s*ON/);
  return match ? match[1].trim() : "Toronto";
}

function mapCategory(raw = ""): PatioCategory {
  const c = raw.toLowerCase();
  if (c.includes("bar")) return "bar";
  if (c.includes("cafe") || c.includes("coffee")) return "cafe";
  if (c.includes("brew")) return "brewery";
  if (c.includes("restaurant")) return "restaurant";
  return "other";
}

export function mapApifyPlace(place: ApifyPlace): Patio | null {
  if (!place.location) return null; // no coordinates = unusable for the map
  return {
    id: place.placeId ?? slugify(place.title),
    slug: slugify(place.title),
    name: place.title,
    address: place.address ?? "",
    neighborhood: neighborhoodFromAddress(place.address),
    lat: place.location.lat,
    lng: place.location.lng,
    category: mapCategory(place.categoryName),
    rating: place.totalScore,
    phone: place.phone,
    website: place.website,
    photoUrl: place.imageUrl,
    // Not present in scraped data — safe defaults pending manual curation.
    exposure: {
      obstructionFactor: 0.5,
      notes: "NEEDS EXPOSURE REVIEW",
      exposureSource: "manual",
    },
    sponsored: false,
    source: "apify",
  };
}

// TODO: read the file passed as argv[2], JSON.parse, map, and emit.
// Intentionally left unimplemented until a real Apify export is available.
