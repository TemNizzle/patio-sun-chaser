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
