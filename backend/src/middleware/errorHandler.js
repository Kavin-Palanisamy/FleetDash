import { logger } from '../utils/logger.js';
export function notFound(req, res) { res.status(404).json({ error: 'Not found' }); }
export function errorHandler(err, req, res, next) {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}
