import type { City } from "@/lib/cities";

export interface WeatherSnapshot {
  cloudCoverPercent: number;
  temperatureC: number;
  /** Rain over the last hour, mm. Showers are frequent in the tropics. */
  precipitationMm: number;
  /** Timestamp the weather provider reports this reading as of. */
  observedAt: Date;
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Current cloud cover, temperature and rain for a city from Open-Meteo (free, no API
 * key). Cached/revalidated by Next's fetch cache so we don't hit the API on
 * every request. Returns null on any failure so callers can fall back to the
 * sun-position-only model rather than breaking the page.
 */
export async function getWeather(city: City): Promise<WeatherSnapshot | null> {
  try {
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set("latitude", String(city.coords.lat));
    url.searchParams.set("longitude", String(city.coords.lng));
    url.searchParams.set("current", "cloud_cover,temperature_2m,precipitation");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data?.current;
    if (!current || typeof current.cloud_cover !== "number") return null;

    return {
      cloudCoverPercent: current.cloud_cover,
      temperatureC: current.temperature_2m,
      precipitationMm:
        typeof current.precipitation === "number" ? current.precipitation : 0,
      observedAt: new Date(current.time),
    };
  } catch {
    return null;
  }
}
