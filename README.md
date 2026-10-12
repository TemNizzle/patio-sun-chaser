# Patio Sun Chaser ☀

Find Toronto bars and restaurants with sunny patios — and know exactly when the
sun will be there, so groups can plan their sun-chasing outings.

## What it does (v1)

- **Live map** of Toronto patios with 3D building massing (Mapbox GL), where
  each marker is colored along a **sun-intensity gradient**: red = in direct
  sun right now, amber = the sun is up but this patio is shaded, green = no
  sun to be had (below the horizon). The scale describes how much sun is
  available, not how good the patio is — sun-seekers and shade-seekers read
  the same colors from opposite ends.
- **Directory / list view** filterable by neighborhood and "sunny now", with
  sponsored listings surfaced first.
- **Patio detail pages** (statically generated, SEO-friendly) with a
  date/time slider to preview when a patio catches the sun.
- **Sun model**: real sun position for Toronto via [`suncalc`](https://github.com/mourner/suncalc),
  combined with a manually-curated per-patio sun window / orientation. This is
  an explicit placeholder for a future building-shadow model driven by City of
  Toronto open data — see [`lib/sun-exposure.ts`](lib/sun-exposure.ts) and
  [`data/README.md`](data/README.md).
- **Live weather**: current Toronto cloud cover from [Open-Meteo](https://open-meteo.com/)
  (free, no API key) discounts the "sunny now" estimate — heavy cloud cover
  forces a patio to "shaded" even if the sun is geometrically in the right
  spot. Only applies to "now"; previewing another time on the slider falls
  back to the pure sun-position model. See [`lib/weather.ts`](lib/weather.ts).
  The weather button (top-right of the map) shows the current reading.

## Cities and modes

The app serves more than one city from one codebase. Each city is a config entry
in [`lib/cities.ts`](lib/cities.ts) (coordinates, timezone, default mode, venue
wording). Toronto stays at `/`; Barbados is at `/barbados`
(`/barbados/patios/<slug>` for detail pages).

- **Find sun / Find shade** toggle on every city. The exposure model is the same;
  the mode only changes ranking, the "…now only" filter and wording. Toronto
  opens in sun mode, Barbados in shade mode.
- **Overhead cover** (`exposure.coverage`: `roofed` | `partial` | `open`) matters
  near the equator, where the sun is often overhead and a compass orientation
  says little. Roofed is shaded at any sun angle; partial cover shades a high
  sun (above 60°) but not a low one; open air is sunny whenever the sun is up.
  Records without `coverage` use the original orientation model unchanged.
- **Rain**: weather includes current precipitation; the weather panel notes it
  and the venue pages say roofed spots stay dry.

**Which city opens.** `proxy.ts` handles `/`: it uses the city the visitor
picked before (the `psc-city` cookie, set by the city switcher), otherwise the
nearest city to their coarse IP location (Vercel's `x-vercel-ip-latitude` /
`x-vercel-ip-longitude` headers, no permission prompt), otherwise Toronto. On
the map, **Find me** switches to the city you are actually in (within 150 km),
so venues, weather and the clock match, then re-centers on you. The IP headers
only exist on Vercel; locally, `/` stays on Toronto.

Add a city: add an entry to `CITIES`, a seed file, and include it in
`allPatios()` in `lib/patios.ts`.

## Getting started

```bash
npm install
cp .env.example .env.local   # add a free Mapbox token to see the map
npm run dev                  # http://localhost:3000
npm test                     # sun-calculation unit tests
npm run build                # production build (SSG for all patio pages)
```

The list view works without a Mapbox token; only the map needs one.

## Deploying to Vercel

This is a zero-config Next.js app — Vercel builds it as-is.

1. At [vercel.com/new](https://vercel.com/new), **Import** the
   `patio-sun-chaser` GitHub repo (authorize the Vercel GitHub app if prompted).
2. Vercel auto-detects Next.js; no build settings to change. Click **Deploy**.
3. Add environment variables (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — a free [Mapbox token](https://account.mapbox.com/access-tokens/), required for the map.
   - `NEXT_PUBLIC_SITE_URL` — *(optional)* your production URL once you have a
     custom domain; otherwise the Vercel URL is used automatically for metadata.
4. Redeploy after adding the token (Deployments → ⋯ → Redeploy) so the map picks
   it up.

Every push to `main` then auto-deploys, with preview deployments per branch/PR.

## Project structure

| Path                          | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `lib/types.ts`                | `Patio` / `ExposureProfile` data model.             |
| `lib/sun-exposure.ts`         | Sun position + exposure estimate (swappable model). |
| `lib/patios.ts`               | Data access + sponsored-first sorting.              |
| `data/patios.seed.ts`         | Seed dataset (curated from real Toronto spots).     |
| `components/Map/`             | Mapbox map, markers, legend, detail card.           |
| `components/List/`            | Directory list, cards, filters.                     |
| `app/patios/[slug]/`          | SEO detail pages.                                   |
| `scripts/import-apify.ts`     | Stub for importing a real scraped patio list.       |

## Roadmap

- Real building-shadow modeling (City of Toronto footprints + heights).
- Weather integration (cloud cover discounts "sunny now").
- Import the full patio list from the Apify export.
- Sponsored-search backend + real ad units (structure is already reserved).
