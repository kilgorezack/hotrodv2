import { regionsHandler } from "../lib/handlers.js";

export default function handler(req, res) {
  const result = regionsHandler(req);
  const status = result.status || 200;
  res.status(status).json(result.payload || result);
}
