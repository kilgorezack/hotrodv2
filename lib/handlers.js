import { getFixedProviderConfig, getFixedProviderTile, searchFixedProviders } from "./fccService.js";
import { getRegionMetrics } from "./services.js";

export async function providersHandler(req) {
  const q = req.query?.q || "";
  const payload = await searchFixedProviders(q);
  return payload;
}

export async function providerConfigHandler(req) {
  const providerId = req.query?.providerId;
  if (!providerId) {
    return { status: 400, payload: { error: "providerId query param is required" } };
  }

  try {
    const data = await getFixedProviderConfig(providerId);
    return data;
  } catch (error) {
    return { status: 404, payload: { error: error.message } };
  }
}

export async function tileHandler(req) {
  const { processUuid, providerId, techCode, z, x, y } = req.params || {};

  try {
    const tile = await getFixedProviderTile({
      processUuid,
      providerId,
      techCode,
      z,
      x,
      y
    });

    return {
      binary: true,
      contentType: tile.contentType,
      cacheControl: tile.cacheControl,
      body: tile.bytes
    };
  } catch (error) {
    return { status: 404, payload: { error: error.message } };
  }
}

export async function regionsHandler(req) {
  try {
    const rows = getRegionMetrics(req.query?.providerId);
    return { regions: rows };
  } catch (error) {
    return { status: 400, payload: { error: error.message } };
  }
}
