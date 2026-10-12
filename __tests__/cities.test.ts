import { describe, expect, it } from "vitest";
import { getCity, cityPath, venuePath, patioCity, isCityId } from "@/lib/cities";
import { getSunSnapshot, estimateExposure, modeMatchScore } from "@/lib/sun-exposure";
import { sortPatios } from "@/lib/patios";
import { patioSunWindow } from "@/lib/format";
import type { Patio } from "@/lib/types";

const BB = getCity("barbados");

function bb(over: Partial<Patio> = {}): Patio {
  return {
    id: "bb1",
    slug: "bb1",
    name: "Test Rum Shop",
    address: "Oistins, Christ Church, Barbados",
    neighborhood: "Christ Church",
    city: "barbados",
    lat: 13.0646,
    lng: -59.5352,
    category: "rum-shop",
    exposure: { obstructionFactor: 0.5, exposureSource: "satellite-estimated" },
    sponsored: false,
    source: "apify",
    ...over,
  };
}

// 2026-04-22 is within days of the zenith passage at 13°N.
const middayApril = new Date("2026-04-22T16:30:00Z"); // 12:30 local (UTC-4)
const lateAfternoon = new Date("2026-04-22T21:30:00Z"); // 17:30 local
const night = new Date("2026-04-23T03:00:00Z"); // 23:00 local

describe("city config", () => {
  it("keeps Toronto at the original routes", () => {
    expect(cityPath("toronto")).toBe("/");
    expect(venuePath("toronto", "bar-raval")).toBe("/patios/bar-raval");
    expect(cityPath("barbados")).toBe("/barbados");
    expect(venuePath("barbados", "x")).toBe("/barbados/patios/x");
  });

  it("opens Barbados in shade mode and Toronto in sun mode", () => {
    expect(getCity("barbados").defaultMode).toBe("shade");
    expect(getCity("toronto").defaultMode).toBe("sun");
  });

  it("treats records without a city as Toronto", () => {
    expect(patioCity({}).id).toBe("toronto");
    expect(patioCity({ city: "barbados" }).id).toBe("barbados");
  });

  it("validates city ids", () => {
    expect(isCityId("barbados")).toBe(true);
    expect(isCityId("constructor")).toBe(false);
  });
});

describe("Barbados sun", () => {
  it("has the sun near the zenith at midday in April", () => {
    const snap = getSunSnapshot(BB.coords.lat, BB.coords.lng, middayApril);
    expect(snap.altitudeDeg).toBeGreaterThan(80);
  });

  it("is dark at 23:00 local", () => {
    const r = estimateExposure(bb({ exposure: { obstructionFactor: 0.5, exposureSource: "manual", coverage: "open" } }), night);
    expect(r.status).toBe("closed-sky");
  });
});

describe("coverage", () => {
  const withCover = (coverage: "open" | "partial" | "roofed", extra = {}) =>
    bb({ exposure: { obstructionFactor: 0.5, exposureSource: "satellite-estimated", coverage, ...extra } });

  it("roofed is shaded at any daytime sun angle", () => {
    expect(estimateExposure(withCover("roofed"), middayApril).status).toBe("shaded");
    expect(estimateExposure(withCover("roofed"), lateAfternoon).status).toBe("shaded");
  });

  it("open air is sunny whenever the sun is up", () => {
    expect(estimateExposure(withCover("open"), middayApril).status).toBe("sunny");
    expect(estimateExposure(withCover("open"), lateAfternoon).status).toBe("sunny");
  });

  it("partial cover shades a high sun but not a low one", () => {
    expect(estimateExposure(withCover("partial"), middayApril).status).toBe("shaded");
    expect(estimateExposure(withCover("partial"), lateAfternoon).status).toBe("sunny");
  });

  it("leaves Toronto records without coverage on the orientation model", () => {
    const toronto: Patio = {
      ...bb(),
      city: undefined,
      lat: 43.6532,
      lng: -79.3832,
      exposure: { orientation: "OPEN_SKY", obstructionFactor: 0.9, exposureSource: "manual" },
    };
    const solarNoon = new Date("2026-06-21T17:10:00Z");
    expect(estimateExposure(toronto, solarNoon).status).toBe("sunny");
  });

  it("uses the venue's own timezone for curated sun windows", () => {
    const curated = bb({
      exposure: { obstructionFactor: 0.5, exposureSource: "manual", sunStartsAt: "15:00", sunEndsAt: "17:00" },
    });
    // 16:00 local in Barbados is 20:00Z; in Toronto's offset it would be outside the window.
    expect(estimateExposure(curated, new Date("2026-04-22T20:00:00Z")).status).toBe("sunny");
    expect(estimateExposure(curated, new Date("2026-04-22T17:00:00Z")).status).toBe("shaded");
  });
});

describe("shade mode", () => {
  const roofed = bb({ id: "r", name: "Roofed", slug: "r", exposure: { obstructionFactor: 0.5, exposureSource: "satellite-estimated", coverage: "roofed" } });
  const open = bb({ id: "o", name: "Open", slug: "o", exposure: { obstructionFactor: 0.9, exposureSource: "satellite-estimated", coverage: "open" } });

  it("scores shaded results in shade mode and sunny ones in sun mode", () => {
    const r = estimateExposure(roofed, middayApril);
    const o = estimateExposure(open, middayApril);
    expect(modeMatchScore(r, "shade")).toBeGreaterThan(0);
    expect(modeMatchScore(r, "sun")).toBe(0);
    expect(modeMatchScore(o, "sun")).toBeGreaterThan(0);
    expect(modeMatchScore(o, "shade")).toBe(0);
  });

  it("ranks the roofed spot first in shade mode and the open one first in sun mode", () => {
    expect(sortPatios([open, roofed], middayApril, undefined, "shade")[0].id).toBe("r");
    expect(sortPatios([roofed, open], middayApril, undefined, "sun")[0].id).toBe("o");
  });

  it("defaults to sun mode so Toronto ordering is unchanged", () => {
    expect(sortPatios([roofed, open], middayApril)[0].id).toBe("o");
  });

  it("shows the sun window in Barbados local time", () => {
    const w = patioSunWindow(open, middayApril);
    expect(w?.isEstimate).toBe(true);
    // Sunrise ~05:45 and sunset ~18:00 local: nothing outside 05:00-19:00.
    const [from, to] = w!.text.split(" – ");
    expect(Number(from.slice(0, 2))).toBeGreaterThanOrEqual(5);
    expect(Number(from.slice(0, 2))).toBeLessThanOrEqual(7);
    expect(Number(to.slice(0, 2))).toBeGreaterThanOrEqual(17);
    expect(Number(to.slice(0, 2))).toBeLessThanOrEqual(19);
  });
});
