import { CITIES, DEFAULT_CITY_ID, type City, type CityId } from "@/lib/cities";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Cookie that records an explicit city choice and beats IP guessing. */
export const CITY_COOKIE = "psc-city";

/** Someone this close to a city's center is treated as being in that city. */
export const LOCATED_IN_CITY_KM = 150;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The closest configured city to a point, and how far away it is. */
export function nearestCity(point: LatLng): { city: City; km: number } {
  let best: { city: City; km: number } | null = null;
  for (const city of Object.values(CITIES)) {
    const km = distanceKm(point, city.coords);
    if (!best || km < best.km) best = { city, km };
  }
  return best ?? { city: CITIES[DEFAULT_CITY_ID], km: Infinity };
}

/** Parses a Vercel IP-geolocation header pair; null when absent or invalid. */
export function pointFromHeaders(
  lat: string | null,
  lng: string | null
): LatLng | null {
  if (lat === null || lng === null) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  const ok =
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180;
  return ok ? point : null;
}

export function isCityIdValue(value: string | undefined): value is CityId {
  return value !== undefined && Object.prototype.hasOwnProperty.call(CITIES, value);
}
