import { describe, it, expect } from "vitest";
import { toZonedTime } from "date-fns-tz";
import { getSunSnapshot, estimateExposure } from "@/lib/sun-exposure";
import { TORONTO_COORDS, TORONTO_TIMEZONE } from "@/lib/constants";
import type { Patio } from "@/lib/types";

/** Local Toronto hour of a Date, for asserting sunrise/sunset times. */
function torontoHour(d: Date): number {
  const z = toZonedTime(d, TORONTO_TIMEZONE);
  return z.getHours() + z.getMinutes() / 60;
}

function makePatio(overrides: Partial<Patio>): Patio {
  return {
    id: "test",
    slug: "test",
    name: "Test Patio",
    address: "Toronto, ON",
    neighborhood: "Downtown",
    lat: TORONTO_COORDS.lat,
    lng: TORONTO_COORDS.lng,
    category: "bar",
    exposure: { obstructionFactor: 0.8 },
    sponsored: false,
    source: "manual",
    ...overrides,
  };
}

describe("getSunSnapshot", () => {
  it("matches known Toronto summer-solstice sunrise/sunset within ~15 min", () => {
    // 2025 summer solstice. Published Toronto times: sunrise ~05:36, sunset ~21:03 EDT.
    const noonUtc = new Date("2025-06-21T16:00:00Z");
    const snap = getSunSnapshot(TORONTO_COORDS.lat, TORONTO_COORDS.lng, noonUtc);
    expect(torontoHour(snap.sunrise)).toBeGreaterThan(5.25);
    expect(torontoHour(snap.sunrise)).toBeLessThan(6.0);
    expect(torontoHour(snap.sunset)).toBeGreaterThan(20.75);
    expect(torontoHour(snap.sunset)).toBeLessThan(21.5);
  });

  it("matches known Toronto winter-solstice sunrise/sunset within ~15 min", () => {
    // 2025 winter solstice. Published Toronto times: sunrise ~07:48, sunset ~16:43 EST.
    const noonUtc = new Date("2025-12-21T17:00:00Z");
    const snap = getSunSnapshot(TORONTO_COORDS.lat, TORONTO_COORDS.lng, noonUtc);
    expect(torontoHour(snap.sunrise)).toBeGreaterThan(7.5);
    expect(torontoHour(snap.sunrise)).toBeLessThan(8.25);
    expect(torontoHour(snap.sunset)).toBeGreaterThan(16.25);
    expect(torontoHour(snap.sunset)).toBeLessThan(17.0);
  });

  it("reports night at local midnight", () => {
    const midnightUtc = new Date("2025-06-22T04:00:00Z"); // ~00:00 EDT
    const snap = getSunSnapshot(TORONTO_COORDS.lat, TORONTO_COORDS.lng, midnightUtc);
    expect(snap.isDaytime).toBe(false);
    expect(snap.altitudeDeg).toBeLessThan(0);
  });
});

describe("estimateExposure", () => {
  const solarNoon = new Date("2025-06-21T16:20:00Z"); // ~12:20 EDT, sun near due south

  it("returns closed-sky at night", () => {
    const patio = makePatio({ exposure: { obstructionFactor: 0.8, orientation: "OPEN_SKY" } });
    const midnight = new Date("2025-06-22T04:00:00Z");
    expect(estimateExposure(patio, midnight).status).toBe("closed-sky");
  });

  it("OPEN_SKY patio is sunny whenever the sun is up", () => {
    const patio = makePatio({ exposure: { obstructionFactor: 0.9, orientation: "OPEN_SKY" } });
    expect(estimateExposure(patio, solarNoon).status).toBe("sunny");
  });

  it("south-facing patio is sunny at solar noon but shaded at 7am", () => {
    const patio = makePatio({ exposure: { obstructionFactor: 0.9, orientation: "S" } });
    const morning = new Date("2025-06-21T11:00:00Z"); // ~07:00 EDT, sun in the east
    expect(estimateExposure(patio, solarNoon).status).toBe("sunny");
    expect(estimateExposure(patio, morning).status).toBe("shaded");
  });

  it("honors a curated sun window", () => {
    const patio = makePatio({
      exposure: { obstructionFactor: 0.7, sunStartsAt: "13:00", sunEndsAt: "16:00" },
    });
    const twoPm = new Date("2025-06-21T18:00:00Z"); // ~14:00 EDT
    const tenAm = new Date("2025-06-21T14:00:00Z"); // ~10:00 EDT
    expect(estimateExposure(patio, twoPm).status).toBe("sunny");
    expect(estimateExposure(patio, tenAm).status).toBe("shaded");
  });
});
