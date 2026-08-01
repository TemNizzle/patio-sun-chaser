# Patio data

## Schema

Every patio conforms to the `Patio` type in [`lib/types.ts`](../lib/types.ts).
Key fields:

| Field                     | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `id`, `slug`, `name`      | Identity. `slug` is the URL segment (`/patios/<slug>`).                  |
| `lat`, `lng`, `address`   | Location. `neighborhood` is derived from the address city component.    |
| `hours`                   | Raw `"HH:mm-HH:mm"`. `"00:00-00:00"` means **unknown** (shown as blank). |
| `exposure`                | How/when this patio gets sun (see below).                               |
| `sponsored`, `sponsorRank`, `sponsorLabel` | Monetization. Sponsored patios sort first (lowest rank first). |
| `source`                  | Provenance: `seed` \| `apify` \| `manual` \| `mockdata-csv`.            |

### `ExposureProfile`

The v1 sun model is a **placeholder**. It has no building-shadow simulation.
Exposure is derived two ways, in priority order (see `estimateExposure` in
[`lib/sun-exposure.ts`](../lib/sun-exposure.ts)):

1. **Curated sun window** — `sunStartsAt` / `sunEndsAt` (Toronto local `"HH:mm"`).
   If set, the patio is "sunny" between those hours while the sun is up.
   `isMockExposure: true` marks windows taken from placeholder data.
2. **Orientation fallback** — `orientation` (`N`…`NW` or `OPEN_SKY`) compared to
   the real sun azimuth (via `suncalc`), scaled by `obstructionFactor` (0..1).

`preciseModelId` is a reserved swap point: when a real shadow-casting model
(City of Toronto building footprints/heights) exists, records carrying it will
use that model instead, and `estimateExposure` gets replaced wholesale with a
same-signature `estimateExposureWithShadows`.

## Current seed data (`patios.seed.ts`)

Hand-curated from the user's `mockdata.csv`. **Only genuine bars/restaurants**
were kept — the CSV was assembled by keyword-matching "sun" in business
names/addresses, so it also contained convenience stores, a childcare center,
a blinds retailer, etc., which were dropped. Real `lat`/`lng`/`address`/`hours`
are preserved; `sunStartsAt`/`sunEndsAt` carry the CSV's **synthetic**
placeholder values (they cycle through only a few fixed times and are not from
any real sun calculation), so every record is flagged `isMockExposure: true`
and `source: "mockdata-csv"`.

### mockdata.csv → `Patio` mapping

| CSV column                | `Patio` field                    |
| ------------------------- | -------------------------------- |
| `id`                      | `id`                             |
| `name`                    | `name` (+ derived `slug`)        |
| `lat`, `lng`              | `lat`, `lng`                     |
| `address`                 | `address` (+ derived `neighborhood`) |
| `hours`                   | `hours`                          |
| `sun_starts_at`           | `exposure.sunStartsAt` (mock)    |
| `sun_ends_at`             | `exposure.sunEndsAt` (mock)      |
| —                         | `exposure.orientation` (curate later) |
| —                         | `sponsored*` (set for a few demo rows) |

## Future: real Apify import

The user's real scraped list will be imported via
[`scripts/import-apify.ts`](../scripts/import-apify.ts) (currently a stub).
The Apify Google Maps scraper typically emits: `title`, `address`,
`location.{lat,lng}`, `categoryName`, `totalScore`, `phone`, `website`,
`imageUrl`, `placeId`. **None** of the `exposure.*` fields or `sponsored*` come
from scraped data — imported records get `obstructionFactor: 0.5` and a
`NEEDS EXPOSURE REVIEW` note so nothing ships with fabricated sun data until a
human (or the future shadow model) curates it.
