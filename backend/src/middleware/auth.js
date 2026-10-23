import { env } from '../config/env.js';
// Simple API-key check for the ingest endpoint. TODO: JWT login if mentor requires it.
export function requireApiKey(req, res, next) {
  if (req.header('x-api-key') !== env.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
