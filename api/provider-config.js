import { providerConfigHandler } from "../lib/handlers.js";

export default async function handler(req, res) {
  const result = await providerConfigHandler(req);
  const status = result.status || 200;
  res.status(status).json(result.payload || result);
}
