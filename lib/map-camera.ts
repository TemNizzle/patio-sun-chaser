/**
 * Map camera persistence.
 *
 * The map is torn down on unmount (`map.remove()`) and re-created from a fixed
 * default, so anything the user had panned or located to was lost whenever the
 * page reloaded — which mobile browsers do routinely after backgrounding the
 * tab. Persisting the camera per tab session means a reload resumes where the
 * user was instead of snapping back downtown.
 *
 * sessionStorage rather than localStorage: "where I was just looking" should
 * expire with the tab, not follow the user back days later.
 */

const KEY = "psc:map:camera";

export interface Camera {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

function isLngLat(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    v[0] >= -180 &&
    v[0] <= 180 &&
    v[1] >= -90 &&
    v[1] <= 90
  );
}

function isAngle(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -max && v <= max;
}

/**
 * Last camera for this tab session, or null when absent, unreadable or
 * malformed. Never throws: storage access itself raises in some privacy modes,
 * and a broken camera must not take the map down with it.
 */
export function readCamera(): Camera | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { center, zoom, bearing, pitch } = parsed as Record<string, unknown>;

    if (!isLngLat(center)) return null;
    if (typeof zoom !== "number" || !Number.isFinite(zoom)) return null;
    if (zoom < 0 || zoom > 24) return null;
    if (!isAngle(bearing, 360)) return null;
    // Mapbox rejects pitch outside 0..85.
    if (typeof pitch !== "number" || !Number.isFinite(pitch)) return null;
    if (pitch < 0 || pitch > 85) return null;

    return { center, zoom, bearing, pitch };
  } catch {
    return null;
  }
}

/** Persist the camera. Silently does nothing if storage is unavailable. */
export function writeCamera(camera: Camera): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(camera));
  } catch {
    // Private browsing, blocked site data, quota — all non-fatal here.
  }
}
