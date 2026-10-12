import { describe, expect, it } from "vitest";
import { distanceKm, nearestCity, pointFromHeaders } from "@/lib/geo";

describe("geo", () => {
  it("measures a known distance", () => {
    // Toronto to Bridgetown is about 3,900 km.
    const km = distanceKm({ lat: 43.6532, lng: -79.3832 }, { lat: 13.1, lng: -59.61 });
    expect(km).toBeGreaterThan(3700);
    expect(km).toBeLessThan(4100);
  });

  it("picks the city a point is in", () => {
    expect(nearestCity({ lat: 13.1, lng: -59.6 }).city.id).toBe("barbados");
    expect(nearestCity({ lat: 43.7, lng: -79.4 }).city.id).toBe("toronto");
  });

  it("picks the nearer city for someone elsewhere", () => {
    // San Juan is closer to Barbados than to Toronto.
    expect(nearestCity({ lat: 18.47, lng: -66.11 }).city.id).toBe("barbados");
    // Chicago is closer to Toronto.
    expect(nearestCity({ lat: 41.88, lng: -87.63 }).city.id).toBe("toronto");
  });

  it("parses Vercel header values and rejects junk", () => {
    expect(pointFromHeaders("13.1", "-59.6")).toEqual({ lat: 13.1, lng: -59.6 });
    expect(pointFromHeaders(null, "-59.6")).toBeNull();
    expect(pointFromHeaders("abc", "1")).toBeNull();
    expect(pointFromHeaders("95", "0")).toBeNull();
  });
});
