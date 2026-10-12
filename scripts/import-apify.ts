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
  /** Barbados puts the parish here ("Christ Church", "St. James"). */
  state?: string;
  city?: string;
  countryCode?: string;
  openingHours?: { day: string; hours: string }[];
}

const COUNTRY: Record<CityId, string> = { toronto: "CA", barbados: "BB" };

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

export function neighborhoodFromAddress(
  address = "",
  city: CityId,
  state?: string
): string {
  if (city === "barbados") {
    // Apify's structured `state` is the most reliable parish source.
    const fromState = state ? matchParish(state) : null;
    if (fromState) return fromState;
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


/** "11 AM to 11 PM" (Google uses narrow no-break spaces) to ["11:00", "23:00"]. */
function parseRange(text: string): [string, string] | null {
  const m = text
    .replace(/[\u202f\u00a0]/g, " ")
    .match(
      /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:to|–|-)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i
    );
  if (!m) return null;
  const to24 = (h: string, min: string | undefined, ap: string): string => {
    let hour = Number(h) % 12;
    if (ap.toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${min ?? "00"}`;
  };
  const endAp = m[6].toUpperCase();
  const startHour = Number(m[1]);
  const endHour = Number(m[4]);
  // Google drops the start's AM/PM when it matches the end's ("5 to 10 PM"),
  // but "5 to 12 AM" means 5 PM to midnight and "11 to 2 PM" means 11 AM.
  let startAp = m[3]?.toUpperCase();
  if (!startAp) {
    if (startHour === 12) startAp = "PM";
    else if (endHour === 12 && endAp === "AM") startAp = "PM";
    else if (startHour > endHour) startAp = endAp === "PM" ? "AM" : "PM";
    else startAp = endAp;
  }
  return [to24(m[1], m[2], startAp), to24(m[4], m[5], endAp)];
}

/**
 * Collapses Apify's per-day opening hours to one "HH:mm-HH:mm" range, the most
 * common one across the week, matching the Toronto batches. Returns undefined
 * when nothing parses so unknown hours stay unknown.
 */
export function normalizeHours(
  openingHours?: { day: string; hours: string }[]
): string | undefined {
  if (!openingHours?.length) return undefined;
  const counts = new Map<string, number>();
  for (const { hours } of openingHours) {
    const text = hours.replace(/[\u202f\u00a0]/g, " ");
    let range: string | null = null;
    if (/open 24 hours/i.test(text)) range = "00:00-23:59";
    else {
      // "11 AM to 2 PM, 5 to 10 PM": first start to last end.
      const parts = text.split(",").map(parseRange).filter((r) => r !== null);
      if (parts.length) range = `${parts[0]![0]}-${parts[parts.length - 1]![1]}`;
    }
    if (range) counts.set(range, (counts.get(range) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [range, n] of counts) {
    if (n > bestCount) {
      best = range;
      bestCount = n;
    }
  }
  return best;
}

export function mapApifyPlace(place: ApifyPlace, city: CityId): Patio | null {
  if (!place.location) return null; // no coordinates = unusable for the map
  if (place.permanentlyClosed) return null;
  // A location search can spill over the border; keep each city's own country.
  if (place.countryCode && place.countryCode.toUpperCase() !== COUNTRY[city]) {
    return null;
  }
  const record: Patio = {
    id: place.placeId ?? slugify(place.title),
    slug: slugify(place.title),
    name: place.title,
    address: place.address ?? "",
    neighborhood: neighborhoodFromAddress(place.address, city, place.state),
    lat: place.location.lat,
    lng: place.location.lng,
    category: mapCategory(place.categoryName ?? place.categories?.[0], place.title),
    rating: place.totalScore,
    phone: place.phone,
    website: place.website,
    photoUrl: place.imageUrl,
    hours: normalizeHours(place.openingHours),
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

export interface ImportReport {
  total: number;
  kept: number;
  noCoords: number;
  closed: number;
  wrongCountry: number;
  notFoodOrDrink: number;
  duplicates: number;
}

/** Same venue listed twice (two Google records at one address): same name within this distance. */
const DUPLICATE_METERS = 75;

function metersBetween(a: Patio, b: Patio): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Maps a whole export. Drops rows without coordinates, closed places, other
 * countries, and (unless `keepOther`) anything that is not a bar, restaurant,
 * cafe, brewery, rum shop or beach bar. De-duplicates by id, then by name and
 * proximity, and keeps slugs unique within the city.
 */
export function importApify(
  places: ApifyPlace[],
  city: CityId,
  options: { keepOther?: boolean; report?: ImportReport } = {}
): Patio[] {
  const report: ImportReport = options.report ?? {
    total: 0, kept: 0, noCoords: 0, closed: 0, wrongCountry: 0, notFoodOrDrink: 0, duplicates: 0,
  };
  const ids = new Set<string>();
  const slugs = new Map<string, number>();
  const out: Patio[] = [];
  for (const place of places) {
    report.total++;
    if (!place.location) { report.noCoords++; continue; }
    if (place.permanentlyClosed) { report.closed++; continue; }
    const patio = mapApifyPlace(place, city);
    if (!patio) { report.wrongCountry++; continue; }
    if (patio.category === "other" && !options.keepOther) { report.notFoodOrDrink++; continue; }
    if (ids.has(patio.id)) { report.duplicates++; continue; }
    const sameName = slugify(patio.name);
    if (out.some((o) => slugify(o.name) === sameName && metersBetween(o, patio) < DUPLICATE_METERS)) {
      report.duplicates++;
      continue;
    }
    ids.add(patio.id);
    // Two venues can share a name (Barbados has plenty of "Rum Shop"s). The
    // slug is a URL segment, so it must stay unique within the city.
    const seen = slugs.get(patio.slug) ?? 0;
    slugs.set(patio.slug, seen + 1);
    if (seen > 0) patio.slug = `${patio.slug}-${seen + 1}`;
    out.push(patio);
    report.kept++;
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
  const keepOther = argv.includes("--keep-other");
  const [cityArg, file] = argv.filter((a) => !a.startsWith("--"));
  if (!cityArg || !isCityId(cityArg) || !file) {
    console.error(
      "Usage: npx tsx scripts/import-apify.ts <barbados|toronto> <export.json> [--keep-other]"
    );
    process.exit(1);
  }
  const places = JSON.parse(readFileSync(file, "utf8")) as ApifyPlace[];
  const report: ImportReport = {
    total: 0, kept: 0, noCoords: 0, closed: 0, wrongCountry: 0, notFoodOrDrink: 0, duplicates: 0,
  };
  const patios = importApify(places, cityArg, { keepOther, report });
  process.stdout.write(emit(patios, cityArg));
  // Report on stderr so stdout stays a clean TypeScript file.
  console.error(
    `Read ${report.total}, kept ${report.kept}. Dropped: ${report.noCoords} no coordinates, ` +
      `${report.closed} permanently closed, ${report.wrongCountry} wrong country, ` +
      `${report.notFoodOrDrink} not food or drink, ${report.duplicates} duplicates.`
  );
}

// Only run as a CLI, never when imported by a test.
if (process.argv[1]?.endsWith("import-apify.ts")) main(process.argv.slice(2));
