/**
 * Integration cover for the camera/geolocation wiring in PatioMap.
 *
 * The real map cannot run in CI (it needs Mapbox tiles over the network), so
 * mapbox-gl is stubbed and we assert on what the component asks it to do.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { Patio } from "@/lib/types";

const handlers = new Map<string, (arg?: unknown) => void>();
const geolocateHandlers = new Map<string, (arg?: unknown) => void>();

const mapInstance = {
  on: vi.fn((ev: string, cb: (arg?: unknown) => void) => handlers.set(ev, cb)),
  off: vi.fn(),
  remove: vi.fn(),
  addControl: vi.fn(),
  addLayer: vi.fn(),
  getStyle: vi.fn(() => ({ layers: [] })),
  getCenter: vi.fn(() => ({ lng: -79.4015, lat: 43.6439 })),
  getZoom: vi.fn(() => 16.5),
  getBearing: vi.fn(() => -18),
  getPitch: vi.fn(() => 55),
  easeTo: vi.fn(),
};

const geolocateTrigger = vi.fn();
// Regular functions, not arrows: these are invoked with `new`.
const mapCtor = vi.fn(function () {
  return mapInstance;
});
const geolocateCtor = vi.fn(function () {
  return {
    trigger: geolocateTrigger,
    on: vi.fn((ev: string, cb: (arg?: unknown) => void) =>
      geolocateHandlers.set(ev, cb)
    ),
  };
});

vi.mock("mapbox-gl", () => ({
  default: {
    accessToken: "",
    Map: mapCtor,
    GeolocateControl: geolocateCtor,
    Marker: vi.fn(function () {
      return {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getElement: vi.fn(() => document.createElement("div")),
      };
    }),
  },
}));
vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

const patios: Patio[] = [];

async function renderMap(props: Record<string, unknown> = {}) {
  const { PatioMap } = await import("@/components/Map/PatioMap");
  return render(
    <PatioMap patios={patios} at={new Date()} onSelect={() => {}} {...props} />
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
  sessionStorage.clear();
  handlers.clear();
  geolocateHandlers.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PatioMap camera persistence", () => {
  it("opens at the Toronto default when nothing is stored", async () => {
    await renderMap();
    expect(mapCtor).toHaveBeenCalledOnce();
    const opts = mapCtor.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.center).toEqual([-79.3832, 43.6532]);
    expect(opts.zoom).toBe(14);
  });

  it("restores a stored camera instead of the default", async () => {
    sessionStorage.setItem(
      "psc:map:camera",
      JSON.stringify({
        center: [-79.42, 43.67],
        zoom: 17,
        bearing: 30,
        pitch: 40,
      })
    );
    await renderMap();
    const opts = mapCtor.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.center).toEqual([-79.42, 43.67]);
    expect(opts.zoom).toBe(17);
    expect(opts.bearing).toBe(30);
    expect(opts.pitch).toBe(40);
  });

  it("ignores a malformed stored camera and falls back to the default", async () => {
    sessionStorage.setItem("psc:map:camera", JSON.stringify({ center: "nope" }));
    await renderMap();
    const opts = mapCtor.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.center).toEqual([-79.3832, 43.6532]);
  });

  it("persists the camera on moveend", async () => {
    await renderMap();
    expect(handlers.has("moveend")).toBe(true);
    handlers.get("moveend")!();
    expect(JSON.parse(sessionStorage.getItem("psc:map:camera")!)).toEqual({
      center: [-79.4015, 43.6439],
      zoom: 16.5,
      bearing: -18,
      pitch: 55,
    });
  });
});

describe("PatioMap geolocation", () => {
  it("registers a tracking GeolocateControl with high accuracy", async () => {
    await renderMap();
    expect(geolocateCtor).toHaveBeenCalledOnce();
    const opts = geolocateCtor.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.trackUserLocation).toBe(true);
    expect(opts.showAccuracyCircle).toBe(true);
    // The Mapbox default is false, which would silently downgrade accuracy.
    expect((opts.positionOptions as PositionOptions).enableHighAccuracy).toBe(true);
    // The app renders its own button in the right rail.
    expect(opts.showButton).toBe(false);
    expect(mapInstance.addControl).toHaveBeenCalled();
  });

  it("hands a working trigger to the parent", async () => {
    const onLocateReady = vi.fn();
    await renderMap({ onLocateReady });
    expect(onLocateReady).toHaveBeenCalledOnce();
    onLocateReady.mock.calls[0][0]();
    expect(geolocateTrigger).toHaveBeenCalledOnce();
  });

  it("reports a denied permission rather than failing silently", async () => {
    const onLocateError = vi.fn();
    await renderMap({ onLocateError });
    geolocateHandlers.get("error")!({ code: 1, PERMISSION_DENIED: 1 });
    expect(onLocateError).toHaveBeenCalledOnce();
    expect(onLocateError.mock.calls[0][0]).toMatch(/permission/i);
  });

  it("reports other geolocation failures too", async () => {
    const onLocateError = vi.fn();
    await renderMap({ onLocateError });
    geolocateHandlers.get("error")!({ code: 3, PERMISSION_DENIED: 1 });
    expect(onLocateError).toHaveBeenCalledOnce();
    expect(onLocateError.mock.calls[0][0]).toMatch(/couldn't get your location/i);
  });
});
