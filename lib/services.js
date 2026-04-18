import { loadData } from "./dataStore.js";

function normalizeQuery(query = "") {
  return String(query).trim().toLowerCase();
}

export function searchProviders(query = "") {
  const { providers } = loadData();
  const q = normalizeQuery(query);
  const list = q
    ? providers.filter((p) =>
        p.brandName.toLowerCase().includes(q) ||
        p.holdingCompany.toLowerCase().includes(q) ||
        String(p.providerId).includes(q)
      )
    : providers;

  return list
    .slice()
    .sort((a, b) => a.brandName.localeCompare(b.brandName))
    .slice(0, 40);
}

export function getCoverageByProvider(providerId) {
  const { coverage, providers } = loadData();
  const parsedId = Number(providerId);
  if (!Number.isInteger(parsedId)) {
    throw new Error("providerId must be an integer");
  }

  const provider = providers.find((p) => p.providerId === parsedId);
  if (!provider) {
    throw new Error(`Unknown providerId: ${providerId}`);
  }

  return {
    provider,
    featureCollection: {
      type: "FeatureCollection",
      features: coverage.features.filter((f) => f.properties.providerId === parsedId)
    }
  };
}

export function getRegionMetrics(providerId) {
  const { regionMetrics } = loadData();

  if (!providerId) return regionMetrics;

  const parsedId = Number(providerId);
  if (!Number.isInteger(parsedId)) {
    throw new Error("providerId must be an integer");
  }

  return regionMetrics.map((region) => {
    const providerRecord = region.providers.find((p) => p.providerId === parsedId) || null;
    return {
      region: region.region,
      regionAverageGoogleRating: region.regionAverageGoogleRating,
      regionMedianMonthlyPrice: region.regionMedianMonthlyPrice,
      providerCount: region.providerCount,
      selectedProvider: providerRecord
    };
  });
}
