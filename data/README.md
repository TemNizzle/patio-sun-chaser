# Patio data

## Runbook: common data tasks

All patio data is checked-in source — there is no database and no CMS. Every
change below is a code edit plus a commit.

**Add a patio.** Append a record to `data/patios.seed.ts`. `id` must be unique
(use the Google `placeId` if the patio came from the Apify export, otherwise a
slugified name); `slug` is the URL segment, so it must be unique too and
shouldn't change once a page is indexed. Set `exposure` to
`{ obstructionFactor: 0.5, exposureSource: "manual" }` if you don't yet know
its orientation, then record one with the tool below. Detail pages are
statically generated, so a new patio needs a rebuild to appear.

**Set or fix a patio's orientation.** Use `/admin/orientation` (see below) —
it writes `data/orientations.json` for you. Commit that file.

**Mark a patio as verified.** After confirming on site or by phone, set its
`exposure` inline in `patios.seed.ts` with `exposureSource: "verified"` and a
`verifiedAt` ISO timestamp, and **delete its entry from
`orientations.json`** — otherwise the override wins and re-stamps it
`satellite-estimated`.

**Mark a patio sponsored.** Set `sponsored: true` plus a `sponsorRank` (lower
sorts first) and optional `sponsorLabel`. Sorting lives in `lib/patios.ts`;
there's no billing or ad-serving backend, this is presentation only.

**Verify a data change.** `npm test` covers the merge logic and sun model but
not the dataset's contents — nothing validates that a new record is
well-formed, so run `npm run dev` and check the patio renders on the map, in
the list, and on its own detail page.

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
| `source`                  | Provenance: `seed` \| `apify` \| `manual` \| `mockdata-csv`. Only `apify` and `manual` actually occur in the data; the other two are legacy values still in the type. |

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

> **Current state:** no patio in the dataset carries a sun window any more —
> all 173 run on the orientation path. The window branch is still live code
> (and still wins if you set one), but nothing exercises it today, so treat it
> as the *legacy* path rather than the primary one. The
> `applyOrientationOverrides` guard and its test exist to stop a
> re-introduced window from silently shadowing collected orientation data.

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

The tier is judged per patio during the satellite pass; it is *not* left at a
blanket default. Current spread across the merged dataset:

| Tier     | Factor | Count |
| -------- | ------ | ----- |
| Open     | 0.9    | 22    |
| Light    | 0.7    | 31    |
| Moderate | 0.5    | 68    |
| Heavy    | 0.3    | 52    |

`OPEN_SKY` always forces 0.9 regardless of the selected tier (see `record()` in
`components/Admin/OrientationTool.tsx`) — a rooftop can't be obstructed.

### Collecting orientation: `/admin/orientation`

Run `npm run dev` and open `/admin/orientation` — a keyboard-driven entry tool
over Mapbox satellite imagery, locked north-up and flat so the compass
judgement stays correct. It lists every seed patio with no `orientation` and no
curated window, and opens on the first one not yet recorded.

> **The collection pass is done.** All 155 patios the tool queues already have
> an entry in `orientations.json`, so a fresh run opens on the first record and
> shows `155 saved` rather than any outstanding work. The tool is still the way
> to *revise* a judgement (navigate with `→`/`Backspace`, press a new
> direction — it overwrites in place) and the way to onboard any patios added
> to the seed later. It needs `NEXT_PUBLIC_MAPBOX_TOKEN` set; without it the
> page renders only a notice, since the satellite view is the whole point.

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

The Confidence column is `CONFIDENCE_BY_SOURCE` in `lib/sun-exposure.ts`.
**It is only read in the curated-sun-window branch**, which no patio currently
takes — so today `exposureSource` does *not* affect the confidence number the
app serves. It still drives the disclaimer/confirmation text on the detail page
(see `exposureSourceNote` in `lib/format.ts`), which is its only live effect.

On the orientation path that every patio actually uses, confidence is derived
geometrically instead:

- `OPEN_SKY` → confidence = `obstructionFactor` (always 0.9 in practice).
- Within the arc → `centeredness × obstructionFactor`, floored at 0.1, where
  `centeredness` falls from 1 at dead-on to 0 at the arc edge.
- Outside the arc → flat 0.6, status `shaded`.
- No orientation at all → 0.2 — currently unreachable, since every patio has one.

The arc is `DEFAULT_ARC_WIDTH_DEG = 140`, i.e. ±70° around the facing bearing.
That's deliberately generous for a placeholder model; narrowing it is the
cheapest knob to turn if patios read as sunny too early or too late.

`verifiedAt` (ISO date-time) records when a `"verified"` or
`"satellite-estimated"` check happened; 156 of the 173 merged records carry one.

## Current dataset

**173 patios** across 28 neighborhoods, 2 of them flagged `sponsored`.

By `source` (where the *record* came from) — note `source` alone doesn't
identify a batch, since three separate batches contributed `apify` records.
The `id` format is the reliable tell:

| `source`   | `id` format            | Count | Batch                                              |
| ---------- | ---------------------- | ----- | -------------------------------------------------- |
| `"manual"` | short numeric (`"65"`) | 16    | Original `mockdata.csv` hand-curated set.           |
| `"apify"`  | Google `placeId`       | 102   | King/Queen (90) + article batch (5) + name-list batch (7). |
| `"manual"` | slugified name         | 55    | Article batch (30) + user name-list batch (25).     |

By `exposure.exposureSource` **after** `orientations.json` is merged in — this
is what the app actually serves:

| `exposureSource`        | Count | Notes                                                     |
| ----------------------- | ----- | ---------------------------------------------------------- |
| `"satellite-estimated"` | 155   | Collected via `/admin/orientation`; carries `verifiedAt`.   |
| `"verified"`            | 17    | Orientation hand-set in the seed (16 original CSV records + 1 apify). |
| `"manual"`              | 1     | `charlotte-s-room` — the lone oddity: orientation set inline in the seed but never re-confirmed, so it has no override and keeps `manual`. |

Categories: 100 restaurant, 64 bar, 6 brewery, 1 cafe, 2 other.

Merged orientation spread — note it skews north, which reads oddly for a
sun-patio dataset and is worth spot-checking against reality if the estimates
start looking wrong: N 64, S 39, W 23, E 18, `OPEN_SKY` 16, SE 5, NE 3, NW 2.

**No record carries `mockdata-csv` or a synthetic sun window any more** — the
placeholder CSV times were fully replaced by the orientation pass.

### History: `mockdata.csv` (superseded)

The **16 short-numeric-id records** came from the user's `mockdata.csv`. **Only
genuine bars/restaurants** were kept — the CSV was assembled by keyword-matching
"sun" in business names/addresses, so it also contained convenience stores, a
childcare center, a blinds retailer, etc., which were dropped. Real
`lat`/`lng`/`address`/`hours` were preserved; the CSV's `sun_starts_at` /
`sun_ends_at` were **synthetic** placeholders (cycling through a few fixed
times, not from any real sun calculation) and were flagged
`exposureSource: "mockdata-csv"` until real orientation data replaced them —
all 16 are now `"verified"`. The CSV itself is no longer in the repo and
nothing reads from it; this section exists only to explain the odd numeric
`id`s. Everything below documents batches added after it.

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
if none parsed).

These records landed with **no exposure data** — `exposureSource: "manual"`,
default `obstructionFactor: 0.5`, no `orientation`/`sunStartsAt`/`sunEndsAt`.
They have since been covered by the satellite orientation pass and now serve as
`satellite-estimated`. **None have been validated in person yet** — that was the
original reason for picking a walkable strip, and it's still the highest-value
next step on the data side. To upgrade one: confirm it on site, then move its
entry out of `orientations.json` and into `patios.seed.ts` with
`exposureSource: "verified"` (leaving it in both places is harmless but the
override would win, re-stamping it `satellite-estimated`).

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

## Orientation pass for both new batches (67 patios)

Immediately after the two batches above landed, all 67 of their patios (the
35 article-batch + 32 name-list-batch entries — everything lacking a curated
window or existing override) went through an orientation pass, the same as
the original King/Queen batch: satellite imagery judged for compass
orientation + obstruction tier, written to `data/orientations.json` via the
same `OrientationOverride` shape the `/admin/orientation` tool produces.

This pass judged imagery directly rather than using the interactive
`/admin/orientation` UI — same north-up, zoom-locked Mapbox satellite view,
same 4-tier obstruction scale, same output shape, just driven programmatically
across all 67 at once instead of one keystroke at a time. A few venues needed
judgment calls documented here rather than in commit history:

- Confirmed/named rooftop patios (Bar Caña, Kost, Rooftop at Broadview Hotel,
  Valerie, Kasa Moto, The Pilot, Drake Sky Yard, and others) were defaulted
  to `OPEN_SKY` at the Open tier unless imagery showed a taller adjacent
  building that would plausibly overshadow them (e.g. Stock T.C. and Writers
  Room Bar were judged to have taller neighbors, so they got a direction +
  lower tier instead of a blanket `OPEN_SKY`).
- Venues with **multiple physical patios** (Trattoria Nervosa, Hemingway's,
  Pauper's Pub — each has a rooftop *and* a separate ground-level patio;
  Madison Avenue Pub has 5 patio levels) were judged only for their
  ground-level/primary space from satellite imagery, since a rooftop's real
  exposure can't be read from a top-down building-footprint image. The
  rooftop option on these is very likely better (`OPEN_SKY`/Open) than what's
  recorded — worth a manual look via `/admin/orientation` if these come up as
  false "shaded" results later.
- After this pass, **all 173 patios in the dataset have some orientation
  coverage** (18 hand-curated inline + 155 in `data/orientations.json`) — the
  same "0 missing" state the original King/Queen batch reached. None of this
  data has been in-person/phone verified yet, so it all still carries
  `exposureSource: "satellite-estimated"`, one tier below `"verified"`.

## Future: full-city Apify import

Most of the 1105-place export is still sitting unused in
`data/dataset_crawler-google-places_2026-08-07_17-40-17-604.json`. Only 102 of
its records are in the dataset: the 90-strong King/Queen batch, plus 12 pulled
out individually when the article and name-list batches turned out to match
places already in the export.

Citywide expansion is a separate, larger decision — settle the performance
question first (marker clustering and list virtualization; 173 markers is fine,
1105 is not) before scaling much past this point.
`scripts/import-apify.ts` is **still a stub** — it documents the intended
mapping but has no working implementation, so every batch so far was mapped by
hand. Implementing it is a prerequisite for a citywide import.
