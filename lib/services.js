import { loadData } from "./dataStore.js";

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
