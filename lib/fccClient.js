const FCC_BASE = "https://broadbandmap.fcc.gov";
const FCC_NBM_BASE = `${FCC_BASE}/nbm/`;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let sessionCookie = null;
let sessionExpiresAt = 0;

function buildHeaders(extra = {}) {
  return {
    "user-agent": USER_AGENT,
    "accept": "application/json, text/plain, */*",
    "origin": FCC_BASE,
    "referer": `${FCC_BASE}/provider-detail/fixed`,
    ...(sessionCookie ? { cookie: sessionCookie } : {}),
    ...extra
  };
}

async function refreshSession() {
  const response = await fetch(`${FCC_BASE}/`, {
    headers: {
      "user-agent": USER_AGENT,
      "accept": "text/html"
    }
  });

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("FCC did not return a session cookie");
  }

  sessionCookie = setCookie.split(";")[0];
  sessionExpiresAt = Date.now() + 8 * 60 * 1000;
}

async function ensureSession() {
  if (!sessionCookie || Date.now() >= sessionExpiresAt) {
    await refreshSession();
  }
}

export async function fccJson(path, retries = 1) {
  await ensureSession();

  const url = `${FCC_NBM_BASE}${path.replace(/^\//, "")}`;
  const response = await fetch(url, { headers: buildHeaders() });

  if (response.status === 403 && retries > 0) {
    await refreshSession();
    return fccJson(path, retries - 1);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FCC request failed (${response.status}): ${body.slice(0, 180)}`);
  }

  return response.json();
}

export async function fccBinary(path, retries = 1) {
  await ensureSession();

  const url = `${FCC_NBM_BASE}${path.replace(/^\//, "")}`;
  const response = await fetch(url, { headers: buildHeaders({ accept: "application/x-protobuf,*/*" }) });

  if (response.status === 403 && retries > 0) {
    await refreshSession();
    return fccBinary(path, retries - 1);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FCC tile request failed (${response.status}): ${body.slice(0, 180)}`);
  }

  const contentType = response.headers.get("content-type") || "application/x-protobuf";
  const cacheControl = response.headers.get("cache-control") || "public, max-age=300";
  const bytes = Buffer.from(await response.arrayBuffer());

  return { bytes, contentType, cacheControl };
}
