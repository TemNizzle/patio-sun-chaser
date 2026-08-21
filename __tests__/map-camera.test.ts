import { afterEach, describe, expect, it, vi } from "vitest";
import { readCamera, writeCamera, type Camera } from "@/lib/map-camera";

const KEY = "psc:map:camera";

const camera: Camera = {
  center: [-79.4015, 43.6439],
  zoom: 16,
  bearing: -18,
  pitch: 55,
};

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("readCamera / writeCamera", () => {
  it("round-trips a camera", () => {
    writeCamera(camera);
    expect(readCamera()).toEqual(camera);
  });

  it("returns null when nothing is stored", () => {
    expect(readCamera()).toBeNull();
  });

  it("returns null on unparseable JSON", () => {
    sessionStorage.setItem(KEY, "{not json");
    expect(readCamera()).toBeNull();
  });

  // A malformed camera must not reach Mapbox — it throws on out-of-range
  // values, which would take the whole map down on load.
  it.each([
    ["missing center", { zoom: 16, bearing: 0, pitch: 55 }],
    ["center not a pair", { center: [1], zoom: 16, bearing: 0, pitch: 55 }],
    ["center not numeric", { center: ["a", "b"], zoom: 16, bearing: 0, pitch: 55 }],
    ["longitude out of range", { center: [-181, 43.6], zoom: 16, bearing: 0, pitch: 55 }],
    ["latitude out of range", { center: [-79.4, 91], zoom: 16, bearing: 0, pitch: 55 }],
    ["NaN in center", { center: [Number.NaN, 43.6], zoom: 16, bearing: 0, pitch: 55 }],
    ["zoom too high", { center: [-79.4, 43.6], zoom: 99, bearing: 0, pitch: 55 }],
    ["negative zoom", { center: [-79.4, 43.6], zoom: -1, bearing: 0, pitch: 55 }],
    ["pitch beyond mapbox max", { center: [-79.4, 43.6], zoom: 16, bearing: 0, pitch: 120 }],
    ["negative pitch", { center: [-79.4, 43.6], zoom: 16, bearing: 0, pitch: -5 }],
    ["zoom missing", { center: [-79.4, 43.6], bearing: 0, pitch: 55 }],
  ])("returns null for %s", (_label, stored) => {
    sessionStorage.setItem(KEY, JSON.stringify(stored));
    expect(readCamera()).toBeNull();
  });

  it("accepts the boundary values Mapbox allows", () => {
    const edge: Camera = {
      center: [-180, -90],
      zoom: 0,
      bearing: 360,
      pitch: 85,
    };
    writeCamera(edge);
    expect(readCamera()).toEqual(edge);
  });

  // Storage access itself throws when site data is blocked; the map must
  // still come up.
  it("returns null instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readCamera()).not.toThrow();
    expect(readCamera()).toBeNull();
  });

  it("swallows write failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeCamera(camera)).not.toThrow();
  });
});
