const providerSearch = document.getElementById("provider-search");
const providerResults = document.getElementById("provider-results");
const providerNameEl = document.getElementById("provider-name");
const providerMetaEl = document.getElementById("provider-meta");
const regionCardsEl = document.getElementById("region-cards");

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [-98.5795, 39.8283],
  zoom: 3.3
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

let selectedProvider = null;
let popup = null;

map.on("load", async () => {
  map.addSource("coverage", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: "coverage-fill",
    type: "fill",
    source: "coverage",
    paint: {
      "fill-color": "#ef6f38",
      "fill-opacity": 0.38
    }
  });

  map.addLayer({
    id: "coverage-line",
    type: "line",
    source: "coverage",
    paint: {
      "line-color": "#9a3610",
      "line-width": 1.1
    }
  });

  map.on("mousemove", "coverage-fill", (event) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = event.features?.[0];
    if (!feature) return;

    const props = feature.properties || {};
    if (popup) popup.remove();

    popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
      .setLngLat(event.lngLat)
      .setHTML(`
        <strong>${selectedProvider?.brandName || "Provider"}</strong><br />
        Down: ${props.maxDownMbps || "N/A"} Mbps<br />
        Up: ${props.maxUpMbps || "N/A"} Mbps
      `)
      .addTo(map);
  });

  map.on("mouseleave", "coverage-fill", () => {
    map.getCanvas().style.cursor = "";
    if (popup) {
      popup.remove();
      popup = null;
    }
  });

  await loadProviders();
  await loadRegionMetrics();
});

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function providerButton(provider) {
  const button = document.createElement("button");
  button.className = "provider-option";
  button.innerHTML = `
    ${provider.brandName}
    <small>ID ${provider.providerId} | ${provider.holdingCompany}</small>
  `;
  button.addEventListener("click", () => selectProvider(provider));
  return button;
}

async function loadProviders(q = "") {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const payload = await api(`/api/providers${params}`);

  providerResults.innerHTML = "";
  payload.providers.forEach((provider) => {
    providerResults.appendChild(providerButton(provider));
  });
}

function renderRegionCards(rows) {
  regionCardsEl.innerHTML = "";

  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "region-card";

    const providerRating = row.selectedProvider?.averageGoogleRating;
    const providerMedian = row.selectedProvider?.medianMonthlyPrice;

    card.innerHTML = `
      <h4>${row.region}</h4>
      <p class="metric-row"><span>Region Avg Google Rating</span><strong>${formatNum(row.regionAverageGoogleRating)}</strong></p>
      <p class="metric-row"><span>Region Median Price</span><strong>${formatPrice(row.regionMedianMonthlyPrice)}</strong></p>
      <p class="metric-row"><span>Providers in Region</span><code>${row.providerCount}</code></p>
      <p class="metric-row"><span>Selected Provider Rating</span><strong>${formatNum(providerRating)}</strong></p>
      <p class="metric-row"><span>Selected Provider Median Price</span><strong>${formatPrice(providerMedian)}</strong></p>
    `;

    regionCardsEl.appendChild(card);
  });
}

async function loadRegionMetrics(providerId = "") {
  const params = providerId ? `?providerId=${providerId}` : "";
  const payload = await api(`/api/regions${params}`);
  renderRegionCards(payload.regions);
}

function formatNum(value) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

function formatPrice(value) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

async function selectProvider(provider) {
  selectedProvider = provider;
  providerNameEl.textContent = provider.brandName;
  providerMetaEl.textContent = `Provider ID ${provider.providerId} | ${provider.holdingCompany}`;

  const payload = await api(`/api/coverage?providerId=${provider.providerId}`);
  const source = map.getSource("coverage");
  source.setData(payload.coverage);

  const bounds = new maplibregl.LngLatBounds();
  payload.coverage.features.forEach((feature) => {
    const coords = feature.geometry.coordinates?.[0] || [];
    coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
  });

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 50, maxZoom: 8, duration: 500 });
  }

  await loadRegionMetrics(provider.providerId);
}

let searchTimer = null;
providerSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadProviders(providerSearch.value.trim()).catch((err) => {
      providerResults.innerHTML = `<p class="muted">${err.message}</p>`;
    });
  }, 180);
});
