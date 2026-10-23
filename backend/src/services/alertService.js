import Alert from '../models/Alert.js';

const lastAlertAt = new Map(); // `${vehicleId}:${type}` -> ms. Cooldown avoids alert spam.
const COOLDOWN_MS = 30_000;

export async function createAlertIfNeeded(io, { vehicleId, type, message, value, limit }) {
  const key = `${vehicleId}:${type}`;
  const now = Date.now();
  if (now - (lastAlertAt.get(key) || 0) < COOLDOWN_MS) return null;
  lastAlertAt.set(key, now);
  const alert = await Alert.create({ vehicleId, type, message, value, limit });
  io.emit('alert:new', alert);
  return alert;
}
