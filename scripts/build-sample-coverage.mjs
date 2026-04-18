import fs from "node:fs";
import path from "node:path";

const outPath = path.join(process.cwd(), "data", "coverage-hexes.geojson");

const providerCenters = [
  { providerId: 130317, center: [-122.3321, 47.6062], count: 22 },
  { providerId: 130076, center: [-78.6382, 35.7796], count: 20 },
  { providerId: 131425, center: [-95.3698, 29.7604], count: 18 },
  { providerId: 130228, center: [-74.1724, 40.7357], count: 15 },
  { providerId: 140266, center: [-112.074, 33.4484], count: 18 },
  { providerId: 190273, center: [-106.6504, 35.0844], count: 12 },
  { providerId: 130196, center: [-117.1611, 32.7157], count: 12 },
  { providerId: 130035, center: [-104.9903, 39.7392], count: 10 },
  { providerId: 130045, center: [-72.6851, 41.7637], count: 10 },
  { providerId: 130174, center: [-93.625, 41.5868], count: 10 },
  { providerId: 130152, center: [-73.7562, 42.6526], count: 10 },
  { providerId: 130399, center: [-94.5786, 39.0997], count: 10 }
];

function hexPolygon([lng, lat], r) {
  const coords = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const dx = r * Math.cos(angle);
    const dy = r * Math.sin(angle);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]);
  return coords;
}

function generateSpokes([lng, lat], count, spacing) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const ring = Math.floor(i / 6) + 1;
    const angle = (i % 6) * (Math.PI / 3);
    const jitter = ((i % 3) - 1) * 0.025;
    points.push([
      lng + Math.cos(angle) * spacing * ring + jitter,
      lat + Math.sin(angle) * spacing * ring + jitter
    ]);
  }
  return points;
}

const features = providerCenters.flatMap((entry) => {
  const points = generateSpokes(entry.center, entry.count, 0.23);
  return points.map((pt, idx) => ({
    type: "Feature",
    properties: {
      providerId: entry.providerId,
      locationId: `${entry.providerId}-${idx + 1}`,
      technology: "Mixed",
      maxDownMbps: 100 + (idx % 5) * 100,
      maxUpMbps: 20 + (idx % 4) * 20
    },
    geometry: {
      type: "Polygon",
      coordinates: [hexPolygon(pt, 0.11)]
    }
  }));
});

const geojson = { type: "FeatureCollection", features };

fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${features.length} hex features to ${outPath}`);
