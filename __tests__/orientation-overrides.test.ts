import { describe, expect, it, vi } from "vitest";
import { applyOrientationOverrides } from "@/lib/orientation-overrides";
import type { Patio } from "@/lib/types";

function patio(over: Partial<Patio> = {}): Patio {
  return {
    id: "p1",
    slug: "p1",
    name: "Test Patio",
    address: "1 King St W, Toronto",
    neighborhood: "King West",
    lat: 43.6474,
    lng: -79.3871,
    category: "bar",
    exposure: { obstructionFactor: 0.5, exposureSource: "manual" },
    sponsored: false,
    source: "apify",
    ...over,
  };
}

const override = {
  orientation: "SW" as const,
  obstructionFactor: 0.7,
  verifiedAt: "2026-08-20T12:00:00.000Z",
};

describe("applyOrientationOverrides", () => {
  it("merges orientation and re-sources the profile as satellite-estimated", () => {
    const [result] = applyOrientationOverrides([patio()], { p1: override });
    expect(result.exposure.orientation).toBe("SW");
    expect(result.exposure.obstructionFactor).toBe(0.7);
    expect(result.exposure.exposureSource).toBe("satellite-estimated");
    expect(result.exposure.verifiedAt).toBe(override.verifiedAt);
  });

  it("leaves patios without an override untouched", () => {
    const input = patio();
    const [result] = applyOrientationOverrides([input], {});
    expect(result).toBe(input);
  });

  it("refuses to override a patio carrying a curated sun window", () => {
    // A window wins inside estimateExposure(), so applying the override would
    // record data that silently never takes effect.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const withWindow = patio({
      exposure: {
        obstructionFactor: 0.5,
        exposureSource: "mockdata-csv",
        sunStartsAt: "12:00",
        sunEndsAt: "17:00",
      },
    });

    const [result] = applyOrientationOverrides([withWindow], { p1: override });

    expect(result.exposure.orientation).toBeUndefined();
    expect(result.exposure.exposureSource).toBe("mockdata-csv");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("forces open-sky patios to the open obstruction tier", () => {
    const [result] = applyOrientationOverrides([patio()], {
      p1: { ...override, orientation: "OPEN_SKY", obstructionFactor: 0.9 },
    });
    expect(result.exposure.orientation).toBe("OPEN_SKY");
    expect(result.exposure.obstructionFactor).toBe(0.9);
  });
});
