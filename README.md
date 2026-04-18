# Broadband Coverage Atlas

Search FCC broadband providers, visualize FCC fixed hex-level coverage on a map, and inspect Census-region metrics for:

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
- `GET /api/provider-config?providerId=130317`
- `GET /api/fcc/fixed/tile/:processUuid/:providerId/:techCode/:z/:x/:y.pbf`
- `GET /api/regions`
- `GET /api/regions?providerId=130317`

## Data Notes

FCC provider search and fixed hex geometry are fetched live from FCC National Broadband Map APIs.

- FCC process + provider lookup + technology lookup + fixed extent/tiles are proxied through backend routes.
- Market observations (for ratings/price): `data/provider-market-observations.json`
- Generated regional stats: `data/region-metrics.json`

## Refresh Pipelines

```bash
node scripts/build-region-metrics.mjs
```

## Production Upgrade Path

1. Replace `provider-market-observations.json` with normalized ratings + price observations sourced through compliant APIs/licensed datasets.
2. Re-run `npm run build:data` and redeploy.
