import { coverageHandler } from "../lib/handlers.js";

export default function handler(req, res) {
  const result = coverageHandler(req);
  const status = result.status || 200;
  res.status(status).json(result.payload || result);
}
