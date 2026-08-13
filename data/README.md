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
2. **Orientation fallback** — `orientation` (`N`…`NW` or `OPEN_SKY`) compared to
   the real sun azimuth (via `suncalc`), scaled by `obstructionFactor` (0..1).

`preciseModelId` is a reserved swap point: when a real shadow-casting model
(City of Toronto building footprints/heights) exists, records carrying it will
use that model instead, and `estimateExposure` gets replaced wholesale with a
same-signature `estimateExposureWithShadows`.

### `exposureSource` and `verifiedAt`

Every `ExposureProfile` declares where its data came from, via `exposureSource`:

| Value                  | Meaning                                                         | Confidence |
| ----------------------- | ---------------------------------------------------------------- | ---------- |
| `"mockdata-csv"`        | Known-fake synthetic window from the scraped CSV.                | 0.5        |
| `"manual"`               | Hand-set default guess, no real verification.                    | 0.6        |
| `"satellite-estimated"`  | Orientation eyeballed from satellite/Street View.                 | 0.7        |
| `"verified"`            | Confirmed directly — phone call or in-person, treated the same.  | 0.9        |

`estimateExposure()` uses this to weight its confidence score for the curated
sun-window branch (see `CONFIDENCE_BY_SOURCE` in `lib/sun-exposure.ts`), and it
determines what disclaimer/confirmation text the detail page shows (see
`exposureSourceNote` in `lib/format.ts`). `verifiedAt` (ISO date-time) records
when a `"verified"` or `"satellite-estimated"` check happened.

## Current seed data (`patios.seed.ts`)

Hand-curated from the user's `mockdata.csv`. **Only genuine bars/restaurants**
were kept — the CSV was assembled by keyword-matching "sun" in business
names/addresses, so it also contained convenience stores, a childcare center,
a blinds retailer, etc., which were dropped. Real `lat`/`lng`/`address`/`hours`
are preserved; `sunStartsAt`/`sunEndsAt` carry the CSV's **synthetic**
placeholder values (they cycle through only a few fixed times and are not from
any real sun calculation), so every record is flagged
`exposure.exposureSource: "mockdata-csv"` and `source: "mockdata-csv"`.

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

## King St / Queen St batch (90 patios, `source: "apify"`)

Added from a real Apify Google Places export
(`data/dataset_crawler-google-places_2026-08-07_17-40-17-604.json`, 1105
places total across Toronto). Filtered to bar/restaurant-category places on
King St W or Queen St W — chosen deliberately for **in-person validation**:
walkable in a short window, unlike the citywide set. Curated down from 106
street matches by dropping ~16 obvious non-candidates (basement-only
locations, fast-casual/counter-service chains, catering/company listings).
The 6 places already in the hand-curated seed set (BarChef, Ruby Soho, One
Star Bar, Bar Hop, Score on Queen, Earls Kitchen + Bar King West) were left
untouched rather than re-added.

`id` is the Google `placeId` (stable, guaranteed-unique). `hours` is
normalized from Apify's per-day 12-hour `openingHours` array down to a single
`"HH:mm-HH:mm"` range (the most common range across the week; `"00:00-00:00"`
if none parsed). **No exposure data** — `exposureSource: "manual"` with
default `obstructionFactor: 0.5` and no `orientation`/`sunStartsAt`/
`sunEndsAt`, so these read as low-confidence/shaded until validated in person
and updated (see the main README for how to edit a patio's exposure by hand).

## Future: full-city Apify import

The rest of the 1105-place export (beyond King/Queen) is still sitting in
`data/dataset_crawler-google-places_2026-08-07_17-40-17-604.json`, unused —
citywide expansion is a separate, larger decision (see the performance
discussion around marker clustering / list virtualization before scaling
much past this point). `scripts/import-apify.ts` (a stub) sketches the same
mapping used for the King/Queen batch above for when that happens.
