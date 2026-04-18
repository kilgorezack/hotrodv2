import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coverageHandler, providersHandler, regionsHandler } from "./lib/handlers.js";
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

function routeApi(req, res, parsed) {
  const wrappedReq = { query: parsed.query, method: req.method };
  let result;

  if (parsed.pathname === "/api/providers") {
    result = providersHandler(wrappedReq);
  } else if (parsed.pathname === "/api/coverage") {
    result = coverageHandler(wrappedReq);
  } else if (parsed.pathname === "/api/regions") {
    result = regionsHandler(wrappedReq);
  } else {
    sendError(res, 404, "Unknown API endpoint");
    return;
  }

  sendJson(res, result.status || 200, result.payload || result);
}

const server = http.createServer((req, res) => {
  const parsed = parseUrl(req.url || "/");

  if (parsed.pathname.startsWith("/api/")) {
    routeApi(req, res, parsed);
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
