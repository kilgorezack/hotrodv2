import fs from "node:fs";
import path from "node:path";
import { CENSUS_REGION_BY_STATE, CENSUS_REGIONS } from "../lib/censusRegions.js";

const root = process.cwd();
const providers = JSON.parse(fs.readFileSync(path.join(root, "data", "fcc-providers-snapshot.json"), "utf8"));
const observations = JSON.parse(fs.readFileSync(path.join(root, "data", "provider-market-observations.json"), "utf8"));

const byProvider = new Map(providers.map((p) => [p.providerId, p]));

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)) : sorted[mid];
}

function average(values) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
}

const grouped = {};
for (const region of CENSUS_REGIONS) grouped[region] = {};

for (const row of observations) {
  const region = CENSUS_REGION_BY_STATE[row.state];
  if (!region) continue;
  if (!grouped[region][row.providerId]) {
    grouped[region][row.providerId] = {
      providerId: row.providerId,
      providerName: byProvider.get(row.providerId)?.brandName || `Provider ${row.providerId}`,
      ratings: [],
      prices: [],
      markets: 0
    };
  }

  grouped[region][row.providerId].markets += 1;
  if (typeof row.googleRating === "number") grouped[region][row.providerId].ratings.push(row.googleRating);
  if (typeof row.monthlyPrice === "number") grouped[region][row.providerId].prices.push(row.monthlyPrice);
}

const result = CENSUS_REGIONS.map((region) => {
  const providersInRegion = Object.values(grouped[region]).map((item) => ({
    providerId: item.providerId,
    providerName: item.providerName,
    averageGoogleRating: average(item.ratings),
    medianMonthlyPrice: median(item.prices),
    marketCount: item.markets
  }));

  const regionRatings = providersInRegion
    .map((item) => item.averageGoogleRating)
    .filter((v) => typeof v === "number");
  const regionPrices = providersInRegion
    .map((item) => item.medianMonthlyPrice)
    .filter((v) => typeof v === "number");

  return {
    region,
    regionAverageGoogleRating: average(regionRatings),
    regionMedianMonthlyPrice: median(regionPrices),
    providerCount: providersInRegion.length,
    providers: providersInRegion.sort((a, b) => a.providerName.localeCompare(b.providerName))
  };
});

const outPath = path.join(root, "data", "region-metrics.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${result.length} region rows to ${outPath}`);
