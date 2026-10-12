import type { CityId } from "@/lib/cities";
import { CITY_COOKIE } from "@/lib/geo";

/** Remember an explicit city choice for a year. Never throws; cookies may be blocked. */
export function setCityCookie(city: CityId): void {
  try {
    document.cookie = `${CITY_COOKIE}=${city}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Blocked cookies just mean "/" falls back to IP detection next time.
  }
}

const LOCATE_FLAG = "psc:locate-on-load";

/** Ask the next page to run "Find me" itself once its map is up. */
export function requestLocateOnLoad(): void {
  try {
    sessionStorage.setItem(LOCATE_FLAG, "1");
  } catch {
    // Non-fatal: the user can press Find me again.
  }
}

/** True once, if the previous page asked for it. */
export function consumeLocateOnLoad(): boolean {
  try {
    const v = sessionStorage.getItem(LOCATE_FLAG);
    sessionStorage.removeItem(LOCATE_FLAG);
    return v === "1";
  } catch {
    return false;
  }
}
