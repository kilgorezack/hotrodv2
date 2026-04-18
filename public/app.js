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

const techPalette = ["#ef6f38", "#2d8f7b", "#296f9f", "#b16f2f", "#9a4f78", "#4d7b2f"];

let selectedProvider = null;
let popup = null;
let activeSourceIds = [];
let activeLayerIds = [];

map.on("load", async () => {
  await loadProviders();
  await loadRegionMetrics();
});

map.on("mousemove", (event) => {
  if (!activeLayerIds.length) return;

  const features = map.queryRenderedFeatures(event.point, { layers: activeLayerIds });
  if (!features.length) {
    map.getCanvas().style.cursor = "";
    if (popup) {
      popup.remove();
      popup = null;
    }
    return;
  }

  map.getCanvas().style.cursor = "pointer";
  const feature = features[0];
  const props = feature.properties || {};
  const coveragePct = Number(props.unit_pct);
  const coverageText = Number.isFinite(coveragePct) ? `${(coveragePct * 100).toFixed(2)}%` : "N/A";

  if (popup) popup.remove();
  popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
    .setLngLat(event.lngLat)
    .setHTML(`
      <strong>${selectedProvider?.brandName || "Provider"}</strong><br />
      Tech: ${props.tech_desc || props.technology || "N/A"}<br />
      Hex coverage: ${coverageText}
    `)
    .addTo(map);
});

map.on("mouseleave", () => {
  map.getCanvas().style.cursor = "";
  if (popup) {
    popup.remove();
    popup = null;
  }
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

  if (!payload.providers.length) {
    providerResults.innerHTML = '<p class="muted">No providers found.</p>';
  }
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

function clearCoverageLayers() {
  activeLayerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(`${layerId}-line`)) map.removeLayer(`${layerId}-line`);
  });

  activeSourceIds.forEach((sourceId) => {
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });

  activeLayerIds = [];
  activeSourceIds = [];
}

function addCoverageLayers(config) {
  clearCoverageLayers();

  const techs = config.technologies || [];
  techs.forEach((tech, index) => {
    const sourceId = `fcc-${tech.code}-${tech.speedTier}-${index}`;
    const layerId = `${sourceId}-fill`;
    const color = techPalette[index % techPalette.length];

    map.addSource(sourceId, {
      type: "vector",
      tiles: [
        `/api/fcc/fixed/tile/${config.processUuid}/${config.provider.providerId}/${tech.code}/{z}/{x}/{y}.pbf`
      ],
      minzoom: 0,
      maxzoom: 14
    });

    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      "source-layer": "fixedproviderhex",
      paint: {
        "fill-color": color,
        "fill-opacity": 0.3
      }
    });

    map.addLayer({
      id: `${layerId}-line`,
      type: "line",
      source: sourceId,
      "source-layer": "fixedproviderhex",
      paint: {
        "line-color": color,
        "line-width": 0.8,
        "line-opacity": 0.9
      }
    });

    activeSourceIds.push(sourceId);
    activeLayerIds.push(layerId);
  });
}

async function selectProvider(provider) {
  selectedProvider = provider;
  providerNameEl.textContent = provider.brandName;
  providerMetaEl.textContent = `Loading FCC provider geometry for ID ${provider.providerId}...`;

  const config = await api(`/api/provider-config?providerId=${provider.providerId}`);
  addCoverageLayers(config);

  providerMetaEl.textContent = `Provider ID ${provider.providerId} | ${provider.holdingCompany} | ${config.technologies.length} technologies`;

  if (Array.isArray(config.bounds) && config.bounds.length === 4) {
    const bounds = new maplibregl.LngLatBounds(
      [config.bounds[0], config.bounds[1]],
      [config.bounds[2], config.bounds[3]]
    );

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 9, duration: 500 });
    }
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
