import fs from "node:fs";
import path from "node:path";

let cache = null;

function readJson(fileName) {
  const filePath = path.join(process.cwd(), "data", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadData() {
  if (cache) return cache;

  const providers = readJson("fcc-providers-snapshot.json");
  const coverage = readJson("coverage-hexes.geojson");
  const regionMetrics = readJson("region-metrics.json");

  cache = { providers, coverage, regionMetrics };
  return cache;
}

export function clearCache() {
  cache = null;
}
