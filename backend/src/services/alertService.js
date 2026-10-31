import Alert from '../models/Alert.js';

// Cooldown tracker: `${vehicleId}:${type}` -> timestamp in milliseconds
// Prevents generating dozens of duplicate alerts within a short window
const lastAlertAt = new Map();
const COOLDOWN_MS = 30_000;

export async function createAlertIfNeeded(io, { vehicleId, type, message, value, limit }) {
  const key = `${vehicleId}:${type}`;
  const now = Date.now();

  // If an alert of this type was sent recently for this vehicle, skip
  if (now - (lastAlertAt.get(key) || 0) < COOLDOWN_MS) {
    return null;
  }

  lastAlertAt.set(key, now);
  const alert = await Alert.create({ vehicleId, type, message, value, limit });

  // Guard io so service can function safely without active socket connections (e.g. in tests)
  if (io) {
    io.emit('alert:new', alert);
  }

  return alert;
}

// Reset cooldowns (used in automated tests or system reset)
export const resetAlertCooldowns = () => lastAlertAt.clear();

