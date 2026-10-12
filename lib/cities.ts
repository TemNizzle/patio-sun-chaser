import type { Patio } from "@/lib/types";

export type CityId = "toronto" | "barbados";

/**
 * What the user is looking for. "sun" ranks and filters by direct sun,
 * "shade" by shade. The exposure model is the same either way; only the
 * ranking and wording change.
 */
export type ViewMode = "sun" | "shade";

export interface City {
  id: CityId;
  name: string;
  /** Header brand shown on the map. */
  brand: string;
  coords: { lat: number; lng: number };
  /** IANA timezone; all times shown and curated windows are in this zone. */
  timezone: string;
  /** Mode the city opens in. Users can flip it. */
  defaultMode: ViewMode;
  /** Singular / plural noun for a venue in this city's copy. */
  venueNoun: string;
  venueNounPlural: string;
  /** Short description of the venue types, used in metadata. */
  venueDescription: string;
  /** Label for the neighborhood filter's "all" option. */
  areaAllLabel: string;
  mapZoom: number;
}

export const DEFAULT_CITY_ID: CityId = "toronto";

export const CITIES: Record<CityId, City> = {
  toronto: {
    id: "toronto",
    name: "Toronto",
    brand: "Sun Chaser",
    coords: { lat: 43.6532, lng: -79.3832 },
    timezone: "America/Toronto",
    defaultMode: "sun",
    venueNoun: "patio",
    venueNounPlural: "patios",
    venueDescription: "bars and restaurants with patios",
    areaAllLabel: "All neighborhoods",
    mapZoom: 14,
  },
  barbados: {
    id: "barbados",
    name: "Barbados",
    brand: "Shade Chaser",
    coords: { lat: 13.17, lng: -59.55 },
    timezone: "America/Barbados",
    defaultMode: "shade",
    venueNoun: "spot",
    venueNounPlural: "spots",
    venueDescription: "bars, restaurants, beach bars and rum shops",
    areaAllLabel: "All parishes",
    mapZoom: 11,
  },
};

export function isCityId(value: string): value is CityId {
  return Object.prototype.hasOwnProperty.call(CITIES, value);
}

export function getCity(id: CityId = DEFAULT_CITY_ID): City {
  return CITIES[id];
}

/** Home route for a city. Toronto stays at "/" so existing URLs keep working. */
export function cityPath(id: CityId): string {
  return id === DEFAULT_CITY_ID ? "/" : `/${id}`;
}

/** Detail route for a venue. Toronto keeps its original "/patios/<slug>". */
export function venuePath(id: CityId, slug: string): string {
  return id === DEFAULT_CITY_ID ? `/patios/${slug}` : `/${id}/patios/${slug}`;
}

/** The city a venue belongs to. Records without a `city` are the original Toronto set. */
export function patioCity(patio: Pick<Patio, "city">): City {
  return getCity(patio.city);
}
