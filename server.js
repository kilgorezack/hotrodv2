import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { providersHandler, providerConfigHandler, regionsHandler, tileHandler } from "./lib/handlers.js";
import { sendError, sendJson } from "./lib/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);

function parseUrl(reqUrl) {
  const url = new URL(reqUrl, "http://localhost");
  return {
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries())
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendError(res, 404, "Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType(filePath)
    });
    res.end(content);
  });
}

async function routeApi(req, res, parsed) {
  const wrappedReq = { query: parsed.query, method: req.method };
  let result;

  if (parsed.pathname === "/api/providers") {
    result = await providersHandler(wrappedReq);
  } else if (parsed.pathname === "/api/provider-config") {
    result = await providerConfigHandler(wrappedReq);
  } else if (parsed.pathname === "/api/regions") {
    result = await regionsHandler(wrappedReq);
  } else if (parsed.pathname.startsWith("/api/fcc/fixed/tile/")) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    // /api/fcc/fixed/tile/:processUuid/:providerId/:techCode/:z/:x/:y.pbf
    if (parts.length !== 10) {
      sendError(res, 400, "Invalid tile path");
      return;
    }

    const yRaw = parts[9];
    const y = yRaw.endsWith(".pbf") ? yRaw.slice(0, -4) : yRaw;

    result = await tileHandler({
      params: {
        processUuid: parts[4],
        providerId: parts[5],
        techCode: parts[6],
        z: parts[7],
        x: parts[8],
        y
      }
    });

    if (result.binary) {
      res.writeHead(200, {
        "Content-Type": result.contentType || "application/x-protobuf",
        "Cache-Control": result.cacheControl || "public, max-age=300",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(result.body);
      return;
    }
  } else {
    sendError(res, 404, "Unknown API endpoint");
    return;
  }

  sendJson(res, result.status || 200, result.payload || result);
}

const server = http.createServer((req, res) => {
  const parsed = parseUrl(req.url || "/");

  if (parsed.pathname.startsWith("/api/")) {
    routeApi(req, res, parsed).catch((error) => {
      sendError(res, 500, error.message || "Unexpected API error");
    });
    return;
  }

  let filePath = path.join(publicDir, parsed.pathname);
  if (parsed.pathname === "/") {
    filePath = path.join(publicDir, "index.html");
  }

  if (!filePath.startsWith(publicDir)) {
    sendError(res, 400, "Invalid path");
    return;
  }

  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Hotrod broadband map running on http://localhost:${port}`);
});
