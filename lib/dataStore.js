import fs from "node:fs";
import path from "node:path";

let cache = null;

function readJson(fileName) {
  const filePath = path.join(process.cwd(), "data", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadData() {
  if (cache) return cache;

  const regionMetrics = readJson("region-metrics.json");

  cache = { regionMetrics };
  return cache;
}

export function clearCache() {
  cache = null;
}
