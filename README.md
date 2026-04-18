# Broadband Coverage Atlas

Search FCC broadband providers, visualize hex-level fixed coverage on a map, and inspect Census-region metrics for:

- average Google review rating
- median monthly internet price

## Local Run

```bash
npm run build:data
npm start
```

Open `http://localhost:3000`.

## Vercel Deploy

1. Push to GitHub.
2. Import repo into Vercel.
3. Deploy (no env vars required for this starter).

Vercel will serve:

- static frontend from `public/`
- serverless APIs from `api/`

## API Endpoints

- `GET /api/providers?q=xfinity`
- `GET /api/coverage?providerId=130317`
- `GET /api/regions`
- `GET /api/regions?providerId=130317`

## Data Notes

This starter includes a realistic FCC-style snapshot and generated sample hex geometry.

- Provider registry: `data/fcc-providers-snapshot.json`
- Market observations: `data/provider-market-observations.json`
- Generated hexes: `data/coverage-hexes.geojson`
- Generated regional stats: `data/region-metrics.json`

## Refresh Pipelines

```bash
node scripts/build-sample-coverage.mjs
node scripts/build-region-metrics.mjs
```

## Production Upgrade Path

1. Replace `data/fcc-providers-snapshot.json` with official FCC provider snapshot exports.
2. Replace sample `coverage-hexes.geojson` with preprocessed FCC hex geometries per release.
3. Replace `provider-market-observations.json` with normalized ratings + price observations sourced through compliant APIs/licensed datasets.
4. Re-run `npm run build:data` and redeploy.
