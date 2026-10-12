import { describe, expect, it } from "vitest";
import {
  importApify,
  mapApifyPlace,
  neighborhoodFromAddress,
  mapCategory,
  normalizeHours,
  type ImportReport,
} from "@/scripts/import-apify";

const place = {
  title: "Pelican Rum Shop",
  address: "Main Rd, Oistins, Christ Church, Barbados",
  location: { lat: 13.0646, lng: -59.5352 },
  categoryName: "Bar",
  placeId: "abc",
};

describe("import-apify", () => {
  it("tags Barbados records with the city and a parish neighborhood", () => {
    const p = mapApifyPlace(place, "barbados")!;
    expect(p.city).toBe("barbados");
    expect(p.neighborhood).toBe("Christ Church");
    expect(p.category).toBe("rum-shop");
    expect(p.exposure.notes).toBe("NEEDS EXPOSURE REVIEW");
    expect(p.exposure.coverage).toBeUndefined();
  });

  it("leaves Toronto records without a city field, as in the original dataset", () => {
    const p = mapApifyPlace(
      { ...place, address: "1 King St W, Toronto, ON M5H, Canada" },
      "toronto"
    )!;
    expect(p.city).toBeUndefined();
    expect(p.neighborhood).toBe("Toronto");
  });

  it("finds the parish for different spellings", () => {
    expect(neighborhoodFromAddress("Holetown, Saint James, Barbados", "barbados")).toBe("St. James");
    expect(neighborhoodFromAddress("Speightstown, St Peter, Barbados", "barbados")).toBe("St. Peter");
    expect(neighborhoodFromAddress("Somewhere, Barbados", "barbados")).toBe("Barbados");
  });

  it("classifies beach bars and plain bars", () => {
    expect(mapCategory("Bar", "Sunset Beach Bar")).toBe("beach-bar");
    expect(mapCategory("Restaurant", "Fish Pot")).toBe("restaurant");
  });

  it("drops closed and coordinate-less rows and keeps slugs unique", () => {
    const farAway = { lat: 13.1, lng: -59.6 };
    const out = importApify(
      [
        place,
        { ...place, placeId: "def", location: farAway },
        { ...place, placeId: "ghi", permanentlyClosed: true },
        { title: "No coords" },
        { ...place, placeId: "abc" },
      ],
      "barbados"
    );
    expect(out.map((p) => p.id)).toEqual(["abc", "def"]);
    expect(out.map((p) => p.slug)).toEqual(["pelican-rum-shop", "pelican-rum-shop-2"]);
  });

  it("collapses the same venue listed twice at one spot", () => {
    const report = {} as ImportReport;
    Object.assign(report, { total: 0, kept: 0, noCoords: 0, closed: 0, wrongCountry: 0, notFoodOrDrink: 0, duplicates: 0 });
    const out = importApify([place, { ...place, placeId: "other-id" }], "barbados", { report });
    expect(out).toHaveLength(1);
    expect(report.duplicates).toBe(1);
  });

  it("drops non food-and-drink places unless asked to keep them", () => {
    const shop = { ...place, placeId: "s", title: "Wine Shop", categoryName: "Liquor store", location: { lat: 13.2, lng: -59.5 } };
    expect(importApify([place, shop], "barbados")).toHaveLength(1);
    expect(importApify([place, shop], "barbados", { keepOther: true })).toHaveLength(2);
  });

  it("drops places from another country", () => {
    const stray = { ...place, placeId: "x", countryCode: "US", location: { lat: 13.3, lng: -59.4 } };
    expect(importApify([place, stray], "barbados").map((p) => p.id)).toEqual(["abc"]);
  });

  it("takes the parish from Apify's structured state field", () => {
    expect(neighborhoodFromAddress("Somewhere, Barbados", "barbados", "St. Peter")).toBe("St. Peter");
    expect(neighborhoodFromAddress("Somewhere, Barbados", "barbados", "Saint Michael")).toBe("St. Michael");
  });
});

describe("normalizeHours", () => {
  // Real Apify format: narrow no-break spaces around AM/PM.
  const day = (hours: string) => ({ day: "Monday", hours });
  const sp = "\u202f";

  it("picks the most common daily range", () => {
    const week = [
      day(`11${sp}AM to 11${sp}PM`),
      day(`11${sp}AM to 11${sp}PM`),
      day(`11${sp}AM to 12${sp}AM`),
      day("Closed"),
    ];
    expect(normalizeHours(week)).toBe("11:00-23:00");
  });

  it("handles a missing meridiem on the start and midnight closes", () => {
    expect(normalizeHours([day(`5 to 12${sp}AM`)])).toBe("17:00-00:00");
    expect(normalizeHours([day(`10:30${sp}AM to 9:15${sp}PM`)])).toBe("10:30-21:15");
  });

  it("spans split shifts and 24-hour venues", () => {
    expect(normalizeHours([day(`11${sp}AM to 2${sp}PM, 5 to 10${sp}PM`)])).toBe("11:00-22:00");
    expect(normalizeHours([day("Open 24 hours")])).toBe("00:00-23:59");
  });

  it("returns undefined when nothing parses", () => {
    expect(normalizeHours(undefined)).toBeUndefined();
    expect(normalizeHours([day("Closed")])).toBeUndefined();
  });
});
