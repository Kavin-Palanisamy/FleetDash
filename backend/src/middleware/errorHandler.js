import { logger } from '../utils/logger.js';
import { metrics } from '../services/metrics.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message || err);

  // If the response headers were already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err.status) || 500;
  if (status >= 500) {
    metrics.incrementErrors();
  }

  const payload = {
    error: err.message || 'Server error',
  };

  if (Array.isArray(err.errors)) {
    payload.errors = err.errors;
  }

  res.status(status).json(payload);
}


