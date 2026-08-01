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

export interface ExposureProfile {
  /** Which direction has open sky. Only used as a fallback when no manual sun window is set. */
  orientation?: Orientation;
  /** 0..1 fudge factor standing in for real building-shadow data. */
  obstructionFactor: number;
  /** "HH:mm" Toronto local time — curated/mock daily sun window start. */
  sunStartsAt?: string;
  /** "HH:mm" Toronto local time — curated/mock daily sun window end. */
  sunEndsAt?: string;
  notes?: string;
  /** Future swap-point flag: presence signals a precise shadow model should be used instead. */
  preciseModelId?: string;
  /** True when sunStartsAt/sunEndsAt came from mockdata.csv's synthetic placeholder values. */
  isMockExposure?: boolean;
}

export type PatioCategory =
  | "bar"
  | "restaurant"
  | "cafe"
  | "brewery"
  | "rooftop"
  | "other";

export interface Patio {
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
