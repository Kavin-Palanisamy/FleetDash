import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ingestTelemetry } from '../controllers/telemetryController.js';
import { requireApiKey } from '../middleware/auth.js';
import { validateTelemetry } from '../middleware/validate.js';
import { env } from '../config/env.js';

// Configurable rate limiter on telemetry ingest (can be disabled via RATE_LIMIT_ENABLED=false)
const telemetryLimiter = env.rateLimitEnabled
  ? rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Rate limit exceeded for telemetry ingest' },
    })
  : (req, res, next) => next();

const r = Router();
r.post('/', telemetryLimiter, requireApiKey, validateTelemetry, ingestTelemetry);

export default r;

