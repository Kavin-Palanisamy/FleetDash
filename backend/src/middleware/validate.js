import { metrics } from '../services/metrics.js';

// ISO-8601 regex pattern (e.g. 2026-10-31T09:00:00.000Z or 2026-10-31T09:00:00+05:30)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function validateTelemetry(req, res, next) {
  // Ensure req.body exists and is a plain JSON object (not array or primitive)
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    metrics.incrementRejected();
    return res.status(400).json({ errors: ['Request body must be a JSON object'] });
  }

  const { vehicleId, timestamp, lat, lng, speed, heading, fuelLevel } = req.body;
  const errors = [];

  // vehicleId: non-empty trimmed string, max 50 chars
  if (typeof vehicleId !== 'string' || !vehicleId.trim()) {
    errors.push('vehicleId required');
  } else if (vehicleId.trim().length > 50) {
    errors.push('vehicleId must not exceed 50 characters');
  }

  // timestamp: valid ISO date, not > 5 min in the future, not older than 24 h
  if (typeof timestamp !== 'string' || !ISO_DATE_REGEX.test(timestamp)) {
    errors.push('timestamp must be a valid ISO-8601 string');
  } else {
    const parsedTime = Date.parse(timestamp);
    if (Number.isNaN(parsedTime)) {
      errors.push('timestamp is not a valid date');
    } else {
      const now = Date.now();
      if (parsedTime > now + FIVE_MINUTES_MS) {
        errors.push('timestamp cannot be more than 5 minutes in the future');
      }
      if (parsedTime < now - TWENTY_FOUR_HOURS_MS) {
        errors.push('timestamp cannot be older than 24 hours');
      }
    }
  }

  // coordinates & speed must pass Number.isFinite to reject NaN / Infinity
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push('lat must be a number between -90 and 90');
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push('lng must be a number between -180 and 180');
  }
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0 || speed > 300) {
    errors.push('speed must be a number between 0 and 300');
  }

  // Optional heading: 0..360
  if (heading !== undefined && heading !== null) {
    if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0 || heading > 360) {
      errors.push('heading must be a number between 0 and 360');
    }
  }

  // Optional fuelLevel: 0..100
  if (fuelLevel !== undefined && fuelLevel !== null) {
    if (typeof fuelLevel !== 'number' || !Number.isFinite(fuelLevel) || fuelLevel < 0 || fuelLevel > 100) {
      errors.push('fuelLevel must be a number between 0 and 100');
    }
  }

  if (errors.length) {
    metrics.incrementRejected();
    return res.status(400).json({ errors });
  }

  next();
}


