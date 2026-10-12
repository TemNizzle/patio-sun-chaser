import type { CityId } from "@/lib/cities";

export type Orientation =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW"
  | "OPEN_SKY";

/**
 * Provenance of an ExposureProfile's data — drives how much estimateExposure()
 * trusts it (see CONFIDENCE_BY_SOURCE in lib/sun-exposure.ts) and what
 * disclaimer (if any) the detail page shows.
 */
export type ExposureSource =
  | "mockdata-csv" // known-fake synthetic window from the scraped CSV
  | "manual" // hand-set default guess, no real verification
  | "satellite-estimated" // orientation eyeballed from satellite/Street View
  | "verified"; // confirmed directly — phone call or in-person, treated the same

/**
 * How much of the seating is under a roof or awning. Matters most near the
 * equator, where the sun is often overhead and compass orientation says little.
 */
export type Coverage = "open" | "partial" | "roofed";

export interface ExposureProfile {
  /** Overhead cover. Absent means unknown; the orientation model is used as before. */
  coverage?: Coverage;
  /** Which direction has open sky. Only used as a fallback when no manual sun window is set. */
  orientation?: Orientation;
  /** 0..1 fudge factor standing in for real building-shadow data. */
  obstructionFactor: number;
  /** "HH:mm" local time in the patio's city — curated/mock daily sun window start. */
  sunStartsAt?: string;
  /** "HH:mm" local time in the patio's city — curated/mock daily sun window end. */
  sunEndsAt?: string;
  notes?: string;
  /** Future swap-point flag: presence signals a precise shadow model should be used instead. */
  preciseModelId?: string;
  /** Where this exposure data came from; determines confidence and detail-page disclaimer. */
  exposureSource: ExposureSource;
  /** ISO date-time of the phone call / satellite check, when applicable. */
  verifiedAt?: string;
}

export type PatioCategory =
  | "bar"
  | "restaurant"
  | "cafe"
  | "brewery"
  | "rooftop"
  | "rum-shop"
  | "beach-bar"
  | "other";

export interface Patio {
  /** Which city this venue belongs to. Absent means Toronto (the original dataset). */
  city?: CityId;
  id: string;
  slug: string;
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  category: PatioCategory;
  priceLevel?: 1 | 2 | 3 | 4;
  rating?: number;
  phone?: string;
  website?: string;
  photoUrl?: string;
  /** Raw "HH:mm-HH:mm" business hours; "00:00-00:00" means unknown. */
  hours?: string;
  exposure: ExposureProfile;
  sponsored: boolean;
  sponsorRank?: number;
  sponsorLabel?: string;
  source: "seed" | "apify" | "manual" | "mockdata-csv";
  lastVerifiedAt?: string;
}
