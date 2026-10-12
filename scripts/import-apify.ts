/**
 * Apify Google Places importer.
 *
 * Maps an Apify "Google Maps scraper" export to `Patio` records for a city and
 * prints a TypeScript seed file to stdout. Exposure is NOT in scraped data, so
 * every record gets safe defaults and a review flag; nothing ships with made-up
 * sun data. Set cover and orientation afterwards with /admin/orientation
 * (`?city=barbados` for Barbados).
 *
 * Usage:
 *   npx tsx scripts/import-apify.ts barbados <export.json> > data/barbados.seed.ts
 *   npx tsx scripts/import-apify.ts toronto  <export.json> > data/patios.imported.ts
 *
 * The importer is a pure function (`mapApifyPlace`, `importApify`) so it can be
 * tested without files; the CLI wrapper at the bottom does the I/O.
 */
import { readFileSync } from "node:fs";
import { isCityId, type CityId } from "@/lib/cities";
import type { Patio, PatioCategory } from "@/lib/types";

export interface ApifyPlace {
  title: string;
  address?: string;
  location?: { lat: number; lng: number };
  categoryName?: string;
  categories?: string[];
  totalScore?: number;
  phone?: string;
  website?: string;
  imageUrl?: string;
  placeId?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
}

export const BARBADOS_PARISHES = [
  "Christ Church",
  "St. Michael",
  "St. James",
  "St. Peter",
  "St. Lucy",
  "St. Andrew",
  "St. Joseph",
  "St. John",
  "St. Philip",
  "St. George",
  "St. Thomas",
] as const;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** "St Lawrence"/"Saint Lawrence" style spellings all map onto the canonical parish name. */
function matchParish(text: string): string | null {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\bsaint\b/g, "st").replace(/[.\s]+/g, " ").trim();
  const haystack = norm(text);
  for (const parish of BARBADOS_PARISHES) {
    if (new RegExp(`\\b${norm(parish)}\\b`).test(haystack)) return parish;
  }
  return null;
}

export function neighborhoodFromAddress(address = "", city: CityId): string {
  if (city === "barbados") {
    // "Hastings Main Rd, Hastings, Christ Church, Barbados": the parish is the
    // component before the country.
    const parts = address.split(",").map((p) => p.trim());
    const beforeCountry = parts.filter((p) => !/^barbados$/i.test(p)).at(-1) ?? "";
    return matchParish(beforeCountry) ?? matchParish(address) ?? "Barbados";
  }
  // Toronto: the city component before the province code.
  const match = address.match(/,\s*([^,]+),\s*ON/);
  return match ? match[1].trim() : "Toronto";
}

export function mapCategory(raw = "", title = ""): PatioCategory {
  const c = raw.toLowerCase();
  const t = title.toLowerCase();
  if (/rum[\s-]?shop/.test(t) || /rum[\s-]?shop/.test(c)) return "rum-shop";
  if (/beach/.test(t) && /bar|grill|club/.test(c + " " + t)) return "beach-bar";
  if (c.includes("brew")) return "brewery";
  if (c.includes("bar") || c.includes("pub")) return "bar";
  if (c.includes("cafe") || c.includes("coffee")) return "cafe";
  if (c.includes("restaurant") || c.includes("grill")) return "restaurant";
  return "other";
}

export function mapApifyPlace(place: ApifyPlace, city: CityId): Patio | null {
  if (!place.location) return null; // no coordinates = unusable for the map
  if (place.permanentlyClosed) return null;
  const record: Patio = {
    id: place.placeId ?? slugify(place.title),
    slug: slugify(place.title),
    name: place.title,
    address: place.address ?? "",
    neighborhood: neighborhoodFromAddress(place.address, city),
    lat: place.location.lat,
    lng: place.location.lng,
    category: mapCategory(place.categoryName ?? place.categories?.[0], place.title),
    rating: place.totalScore,
    phone: place.phone,
    website: place.website,
    photoUrl: place.imageUrl,
    // Not present in scraped data: safe defaults pending manual curation.
    exposure: {
      obstructionFactor: 0.5,
      notes: "NEEDS EXPOSURE REVIEW",
      exposureSource: "manual",
    },
    sponsored: false,
    source: "apify",
  };
  if (city !== "toronto") record.city = city;
  return record;
}

/** Maps a whole export: drops unusable rows and de-duplicates by id, then by slug. */
export function importApify(places: ApifyPlace[], city: CityId): Patio[] {
  const ids = new Set<string>();
  const slugs = new Map<string, number>();
  const out: Patio[] = [];
  for (const place of places) {
    const patio = mapApifyPlace(place, city);
    if (!patio || ids.has(patio.id)) continue;
    ids.add(patio.id);
    // Two venues can share a name (Barbados has plenty of "Rum Shop"s). The
    // slug is a URL segment, so it must stay unique within the city.
    const seen = slugs.get(patio.slug) ?? 0;
    slugs.set(patio.slug, seen + 1);
    if (seen > 0) patio.slug = `${patio.slug}-${seen + 1}`;
    out.push(patio);
  }
  return out;
}

function emit(patios: Patio[], city: CityId): string {
  const exportName = city === "barbados" ? "barbadosPatios" : "importedPatios";
  return [
    'import type { Patio } from "@/lib/types";',
    "",
    `// Generated by scripts/import-apify.ts (${patios.length} venues). Review exposure before shipping.`,
    `export const ${exportName}: Patio[] = ${JSON.stringify(patios, null, 2)};`,
    "",
  ].join("\n");
}

function main(argv: string[]): void {
  const [cityArg, file] = argv;
  if (!cityArg || !isCityId(cityArg) || !file) {
    console.error("Usage: npx tsx scripts/import-apify.ts <barbados|toronto> <export.json>");
    process.exit(1);
  }
  const places = JSON.parse(readFileSync(file, "utf8")) as ApifyPlace[];
  process.stdout.write(emit(importApify(places, cityArg), cityArg));
}

// Only run as a CLI, never when imported by a test.
if (process.argv[1]?.endsWith("import-apify.ts")) main(process.argv.slice(2));
