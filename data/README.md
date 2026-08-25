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

**A curated window always wins when both are set** — if a patio has
`sunStartsAt`/`sunEndsAt` *and* `orientation`, the window is used and
orientation is silently ignored. Don't leave a stale/fake window in place
after adding real orientation data, or the orientation never takes effect.

`preciseModelId` is a reserved swap point: when a real shadow-casting model
(City of Toronto building footprints/heights) exists, records carrying it will
use that model instead, and `estimateExposure` gets replaced wholesale with a
same-signature `estimateExposureWithShadows`.

### `obstructionFactor` tiers

Rather than eyeballing a precise decimal, `obstructionFactor` is assigned from
four fixed tiers — fast to judge in the field, honest about the actual
precision available at MVP stage:

| Tier       | `obstructionFactor` | Meaning                                          |
| ---------- | -------------------- | ------------------------------------------------- |
| Open       | 0.9                   | Rooftop or fully open, nothing nearby.             |
| Light      | 0.7                   | Minor obstruction — some trees, a setback.         |
| Moderate   | 0.5                   | Buildings on one side (e.g. Horseshoe Tavern).     |
| Heavy      | 0.3                   | Narrow gap, mostly enclosed.                       |

Patios with an `orientation` but no in-person obstruction check yet default to
**Moderate (0.5)** as a neutral placeholder (see the `satellite-estimated`
batch below).

### Collecting orientation: `/admin/orientation`

Run `npm run dev` and open `/admin/orientation` — a keyboard-driven entry tool
over Mapbox satellite imagery, locked north-up and flat so the compass
judgement stays correct. It lists every seed patio with no `orientation` and no
curated window.

Keys are positioned to match the compass, so judging a direction and pressing
it are the same motion:

```
Q W E     NW  N  NE
A O D  →   W  ·  E     O = OPEN_SKY (rooftop)
Z X C     SW  S  SE
```

`1`–`4` set the obstruction tier and stick until changed, so a run of similar
street-level patios needs one keystroke each. `S`/`→` skips, `Backspace` goes
back. Every entry writes through to `data/orientations.json`.

That file is merged over the seed at read time by `applyOrientationOverrides()`
in [`lib/orientation-overrides.ts`](../lib/orientation-overrides.ts), which
stamps `exposureSource: "satellite-estimated"` and `verifiedAt`. Keeping it out
of `patios.seed.ts` means a fast entry session never rewrites TypeScript
source. A patio still carrying a curated window is refused with a console
warning rather than silently accepting data `estimateExposure` would ignore.

The page and its API route are dev-only — they write to the repo working tree,
which does not exist on a deployed host.

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

## "Best patios" article batch (35 patios)

Sourced from 5 published "best Toronto patios" roundup articles (waterfront,
rooftop, and Bloor-Yorkville lists), cross-checked against both the existing
seed and the citywide Apify export before adding anything new.

- **5 records** (The Porch, Cibo Wine Bar King West, Kost, Bar Caña "The Roof
  at SOCO", Harriet's Rooftop) turned out to already exist in the unused
  citywide Apify export — `source: "apify"`, real `placeId` as `id`, `hours`
  normalized the same way as the King/Queen batch. Two of these needed manual
  disambiguation: the article's "SOCO Kitchen + Bar" mapped to the rooftop
  bar record (Bar Caña), not the ground-floor restaurant, since the article
  was describing the rooftop patio; Harriet's Rooftop had two near-duplicate
  Google Places records ~50m apart at the same address, and the restaurant
  ("Ste C") record was kept.
- **30 records** had no match anywhere in existing data — `source: "manual"`,
  `id`/`slug` both slugified from the name (no `placeId` available). Address
  and coordinates were verified via web search + Mapbox geocoding, not taken
  as-is from the source articles (two article addresses were wrong outright:
  Amsterdam Brewhouse's "45 Esandar Dr" and Dimmi's "Old York Lane" — both
  corrected). Venues confirmed permanently closed (Chabrol, La Société,
  Firkin on Bloor, The One Eighty) were dropped rather than added. Two
  borderline candidates (Scollard Deli — likely just a convenience store;
  Windsor Arms — a hotel without a standalone bar/restaurant patio) were
  excluded as a judgment call.
- Like the King/Queen batch, **no exposure data** — default
  `obstructionFactor: 0.5`, `exposureSource: "manual"`, no
  `orientation`/`sunStartsAt`/`sunEndsAt` yet. Several of these are
  explicitly rooftop venues (Bar Caña, Kost, Writers Room Bar, Stock T.C.,
  Valerie, Kasa Moto, The Pilot, Trattoria Nervosa, Rooftop at Broadview
  Hotel) and are good candidates to prioritize in the next `/admin/orientation`
  pass, since rooftop typically means `OPEN_SKY`/low obstruction.

## User-curated name-list batch (32 patios)

A second batch, sourced from a raw list of ~37 venue names the user typed
directly (no article links) rather than scraped from a source. Same dedup +
verification process as the article batch above:

- **7 records** (National Toronto, Fox on John, RendezViews, Grape Witches at
  Waterworks, Evangeline, LOCAL Public Eatery Adelaide, Steam Whistle Tap
  Room) matched the unused citywide Apify export — `source: "apify"`, real
  `placeId`, hours normalized from the raw per-day data. Steam Whistle had two
  candidate records at the same complex (Tap Room vs. Kitchen); Tap Room was
  chosen as the better fit for a beer-garden-style patio.
- **25 records** — fresh web-verified lookups, `source: "manual"`. One name
  ("Proper") didn't turn up in initial research; the user supplied the
  correct address (392 Roncesvalles Ave) directly, and its hours were pulled
  from public listings rather than left unknown.
- A handful of names from the user's list were already in the dataset and
  skipped entirely: Hemingway's, DROM Taberna, Bar Eugenie, The Pilot, Kasa
  Moto, and "Broadview Hotel" (already covered by the article batch's
  "Rooftop at Broadview Hotel").
- Two candidates were flagged as borderline category fits — a retail wine
  shop (Grape Witches) and a grocery/bodega concept far outside the rest of
  the dataset's geographic cluster (Bodega by City Cottage, Scarborough) —
  and both were included at the user's explicit direction despite the
  mismatch, so don't "clean these up" later without checking back first.
- Same as above: **no exposure data** yet, default `obstructionFactor: 0.5`,
  `exposureSource: "manual"`. Drake Sky Yard and Pauper's Pub are explicitly
  rooftop/dual-patio venues worth prioritizing in the orientation pass.

## Future: full-city Apify import

The rest of the 1105-place export (beyond King/Queen) is still sitting in
`data/dataset_crawler-google-places_2026-08-07_17-40-17-604.json`, unused —
citywide expansion is a separate, larger decision (see the performance
discussion around marker clustering / list virtualization before scaling
much past this point). `scripts/import-apify.ts` (a stub) sketches the same
mapping used for the King/Queen batch above for when that happens.
