import { fccBinary, fccJson } from "./fccClient.js";

let cachedPuid = null;
let cachedPuidAt = 0;

function filingDateValue(label = "") {
  const dt = new Date(label);
  return Number.isFinite(dt.valueOf()) ? dt.valueOf() : 0;
}

export async function getLatestFixedProcessUuid() {
  if (cachedPuid && Date.now() - cachedPuidAt < 15 * 60 * 1000) {
    return cachedPuid;
  }

  const payload = await fccJson("map/api/published/filing");
  const filings = Array.isArray(payload.data) ? payload.data : [];
  if (!filings.length) {
    throw new Error("FCC published filings list is empty");
  }

  const latest = [...filings].sort((a, b) => filingDateValue(b.filing_subtype) - filingDateValue(a.filing_subtype))[0];
  cachedPuid = latest.process_uuid;
  cachedPuidAt = Date.now();

  return cachedPuid;
}

function normalizeProviderRows(rows) {
  const seen = new Set();
  const output = [];

  rows.forEach((row) => {
    const providerId = Number(row.provider_id);
    if (!Number.isInteger(providerId) || seen.has(providerId)) return;

    seen.add(providerId);
    output.push({
      providerId,
      brandName: row.provider_name || `Provider ${providerId}`,
      holdingCompany: row.holding_company || row.provider_name || "Unknown"
    });
  });

  return output.sort((a, b) => a.brandName.localeCompare(b.brandName));
}

export async function searchFixedProviders(query = "") {
  const puid = await getLatestFixedProcessUuid();

  const q = String(query || "").trim();
  const path = q
    ? `map/api/provider/list/${puid}/${encodeURIComponent(q)}`
    : `map/api/provider/lookup/${puid}/1`;

  const payload = await fccJson(path);
  const rows = Array.isArray(payload.data) ? payload.data : [];

  return {
    processUuid: puid,
    providers: normalizeProviderRows(rows).slice(0, 60)
  };
}

export async function getFixedProviderConfig(providerId) {
  const puid = await getLatestFixedProcessUuid();
  const pid = Number(providerId);
  if (!Number.isInteger(pid)) {
    throw new Error("providerId must be an integer");
  }

  const [providersPayload, techPayload] = await Promise.all([
    fccJson(`map/api/provider/lookup/${puid}/1`),
    fccJson(`map/api/technology/lookup/${puid}/1/${pid}`)
  ]);

  const providerRows = Array.isArray(providersPayload.data) ? providersPayload.data : [];
  const provider = normalizeProviderRows(providerRows).find((row) => row.providerId === pid);

  if (!provider) {
    throw new Error(`Unknown providerId: ${providerId}`);
  }

  const techRows = Array.isArray(techPayload.data) ? techPayload.data : [];
  const technologies = techRows
    .map((row) => ({
      code: String(row.technology_code),
      speedTier: Number(row.speed_tier || 1),
      name: row.type || `Technology ${row.technology_code}`
    }))
    .filter((row) => row.code)
    .sort((a, b) => a.code.localeCompare(b.code));

  const extentResponses = await Promise.all(
    technologies.map((tech) =>
      fccJson(`map/api/provider/fixed/extent/${puid}/${pid}/${tech.code}/r/25/3`).catch(() => null)
    )
  );

  const bounds = extentResponses
    .map((payload) => payload?.data?.[0]?.bounds)
    .filter((b) => Array.isArray(b) && b.length === 4);

  const mergedBounds = bounds.length
    ? [
        Math.min(...bounds.map((b) => b[0])),
        Math.min(...bounds.map((b) => b[1])),
        Math.max(...bounds.map((b) => b[2])),
        Math.max(...bounds.map((b) => b[3]))
      ]
    : null;

  return {
    processUuid: puid,
    provider,
    technologies,
    bounds: mergedBounds
  };
}

export async function getFixedProviderTile({ processUuid, providerId, techCode, z, x, y, down = 25, up = 3 }) {
  const puid = processUuid || (await getLatestFixedProcessUuid());
  const pid = Number(providerId);
  const zoom = Number(z);
  const tileX = Number(x);
  const tileY = Number(y);
  const technology = String(techCode || "").trim();

  if (!Number.isInteger(pid) || !Number.isInteger(zoom) || !Number.isInteger(tileX) || !Number.isInteger(tileY) || !technology) {
    throw new Error("Invalid tile request parameters");
  }

  const downMbps = Number(down);
  const upMbps = Number(up);
  if (!Number.isFinite(downMbps) || !Number.isFinite(upMbps)) {
    throw new Error("Invalid fixed speed threshold parameters");
  }

  const path = `map/api/fixed/provider/hex/tile/${puid}/${pid}/${technology}/r/${downMbps}/${upMbps}/${zoom}/${tileX}/${tileY}`;
  return fccBinary(path);
}
