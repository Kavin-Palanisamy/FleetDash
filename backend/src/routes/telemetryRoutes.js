import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ingestTelemetry } from '../controllers/telemetryController.js';
import { requireApiKey } from '../middleware/auth.js';
import { validateTelemetry } from '../middleware/validate.js';
import { env } from '../config/env.js';

// Configurable rate limiter on telemetry ingest (configured via env.rateLimitMax)
const telemetryLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for telemetry ingest' },
});

const r = Router();
r.post('/', telemetryLimiter, requireApiKey, validateTelemetry, ingestTelemetry);

export default r;

