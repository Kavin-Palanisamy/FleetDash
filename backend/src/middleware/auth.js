import crypto from 'crypto';
import { env } from '../config/env.js';

// Constant-time API key check to prevent timing analysis attacks
export function requireApiKey(req, res, next) {
  const provided = req.header('x-api-key') || '';
  const expected = env.apiKey || '';

  // Hash both keys to fixed 32-byte digests so timingSafeEqual never leaks length
  const providedHash = crypto.createHash('sha256').update(String(provided)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();

  if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

