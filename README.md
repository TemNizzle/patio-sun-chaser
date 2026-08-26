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
- **Map camera persistence + "find me"**: panning/zooming/rotating the map is
  remembered for the tab session (`sessionStorage`, so it doesn't follow the
  user across days) instead of snapping back to the Toronto default on every
  reload — mobile browsers routinely reload backgrounded tabs. A
  `GeolocateControl`-backed "find me" button centers on the user's real
  location, with a denied/failed-permission message surfaced in the UI rather
  than failing silently. See [`lib/map-camera.ts`](lib/map-camera.ts) and
  [`components/Map/PatioMap.tsx`](components/Map/PatioMap.tsx).

## Getting started

```bash
npm install
cp .env.example .env.local   # add a free Mapbox token to see the map
npm run dev                  # http://localhost:3000
npm test                     # unit + component test suite, see Testing below
npm run lint                 # eslint
npm run build                # production build (SSG for all patio pages)
```

The list view works without a Mapbox token; only the map needs one.

## Testing

`npm test` runs the full Vitest suite (`vitest run`, jsdom environment, config
in [`vitest.config.ts`](vitest.config.ts)). There's no e2e/browser suite yet —
these are unit and component tests only, so still click through the app in a
browser after any UI change.

| File                                     | Covers                                                                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/sun-exposure.test.ts`          | Sun position math (`getSunSnapshot`) against known Toronto solstice sunrise/sunset times; `estimateExposure`'s orientation-arc, curated-window, and cloud-cover logic; confidence-by-source weighting.       |
| `__tests__/map-camera.test.ts`            | `readCamera`/`writeCamera` round-tripping, every malformed/out-of-range shape (rejected before it can reach Mapbox and crash the map), and storage-unavailable fallbacks.                                    |
| `__tests__/patio-map-camera.test.tsx`     | Integration test for `PatioMap`'s camera + `GeolocateControl` wiring, with `mapbox-gl` mocked (the real map needs live network tiles, so it can't run in CI). Asserts default vs. restored camera, that moves get persisted, and that geolocation errors are surfaced rather than swallowed. |
| `__tests__/orientation-overrides.test.ts` | `applyOrientationOverrides` — merging an override, leaving unmatched patios untouched, and refusing to apply an override onto a patio that already has a curated sun window (which would otherwise silently never take effect). |

When adding a new `lib/` module with non-trivial logic (date/timezone math,
storage parsing, data merging), add a matching Vitest file alongside these —
that's the existing pattern to follow.

## Admin / data-entry tools

`/admin/orientation` (dev-only — run `npm run dev`, then open
`http://localhost:3000/admin/orientation`; it 404s under
`NODE_ENV=production`, including on any deployed Vercel build) is a
keyboard-driven tool for eyeballing each patio's sun orientation from Mapbox
satellite imagery. It writes to `data/orientations.json` in the repo working
tree via `app/api/admin/orientations/route.ts`, which is why it can't run on a
deployed host — there's no working tree to write to there. Full field-by-field
docs, the keyboard layout, and how the data flows into `estimateExposure()`
live in [`data/README.md`](data/README.md#collecting-orientation-adminorientation).

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

| Path                                    | Purpose                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `lib/types.ts`                          | `Patio` / `ExposureProfile` data model.                                 |
| `lib/sun-exposure.ts`                   | Sun position + exposure estimate (swappable model).                    |
| `lib/patios.ts`                         | Data access (seed + orientation overrides merged) + sponsored-first sorting. |
| `lib/orientation-overrides.ts`          | Merges `data/orientations.json` over the seed at read time.            |
| `lib/weather.ts`                        | Open-Meteo cloud-cover fetch for the "sunny now" discount.              |
| `lib/map-camera.ts`                     | Session-scoped map camera read/write, validated before reaching Mapbox. |
| `lib/format.ts`                         | Status colors/labels, hours formatting, sun-window/source display text. |
| `lib/site.ts`                           | Canonical site URL resolution for metadata.                             |
| `lib/constants.ts`                      | Toronto coordinates + timezone.                                        |
| `data/patios.seed.ts`                   | Seed dataset (curated from real Toronto spots + the King/Queen Apify batch). |
| `data/orientations.json`                | Orientation overrides collected via `/admin/orientation`.               |
| `components/Map/`                       | Mapbox map (camera + geolocation), markers, legend, header, detail card. |
| `components/List/`                      | Directory list, cards, filters.                                        |
| `components/DateTimePicker/`            | Date/time slider for previewing sun exposure at another time.          |
| `components/PatioExposurePanel.tsx`     | Sun-status + time-slider block on a patio detail page.                 |
| `components/Weather/WeatherButton.tsx`  | Current-weather readout button on the map.                             |
| `components/Ads/`                       | Placeholder ad slot + sponsored badge (structure reserved, no real ad network wired in). |
| `components/Admin/OrientationTool.tsx`  | Keyboard-driven orientation entry UI (see Admin tools above).           |
| `components/HomeView.tsx`               | Top-level client component wiring map/list/filters/slider together.    |
| `app/page.tsx`                          | Home route — fetches patios + weather, renders `HomeView`.             |
| `app/patios/[slug]/`                    | SEO detail pages (SSG, revalidated daily since sun windows depend on the date). |
| `app/admin/orientation/`                | Dev-only orientation entry tool page.                                  |
| `app/api/admin/orientations/`           | Dev-only read/write API backing the orientation tool.                  |
| `scripts/import-apify.ts`               | Stub for importing the remaining citywide scraped patio list.          |

## Roadmap

- Real building-shadow modeling (City of Toronto footprints + heights).
- In-person exposure validation for the King/Queen Apify batch (currently
  `exposureSource: "manual"` with a neutral default — see [`data/README.md`](data/README.md)).
- Import the full citywide patio list from the Apify export (needs marker
  clustering / list virtualization first — see `data/README.md`).
- Sponsored-search backend + real ad units (structure is already reserved).
