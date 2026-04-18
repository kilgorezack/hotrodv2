import { getCoverageByProvider, getRegionMetrics, searchProviders } from "./services.js";

export function providersHandler(req) {
  const q = req.query?.q || "";
  return { providers: searchProviders(q) };
}

export function coverageHandler(req) {
  const providerId = req.query?.providerId;
  if (!providerId) {
    return { status: 400, payload: { error: "providerId query param is required" } };
  }

  try {
    const data = getCoverageByProvider(providerId);
    return { provider: data.provider, coverage: data.featureCollection };
  } catch (error) {
    return { status: 404, payload: { error: error.message } };
  }
}

export function regionsHandler(req) {
  try {
    const rows = getRegionMetrics(req.query?.providerId);
    return { regions: rows };
  } catch (error) {
    return { status: 400, payload: { error: error.message } };
  }
}
