import { describe, expect, it } from "vitest";
import { importApify, mapApifyPlace, neighborhoodFromAddress, mapCategory } from "@/scripts/import-apify";

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
    const out = importApify(
      [
        place,
        { ...place, placeId: "def" },
        { ...place, placeId: "ghi", permanentlyClosed: true },
        { title: "No coords" },
        { ...place, placeId: "abc" },
      ],
      "barbados"
    );
    expect(out.map((p) => p.id)).toEqual(["abc", "def"]);
    expect(out.map((p) => p.slug)).toEqual(["pelican-rum-shop", "pelican-rum-shop-2"]);
  });
});
