import { getVehicle } from './vehicleCache.js';
import { addToBuffer } from './telemetryBuffer.js';
import { createAlertIfNeeded } from './alertService.js';
import { updateTrip } from './tripService.js';

// Core event pipeline: validate (middleware) -> process -> store -> broadcast
export async function processTelemetry(io, event) {
  const vehicle = getVehicle(event.vehicleId);
  if (!vehicle) { const e = new Error('Unknown vehicle'); e.status = 404; throw e; }

  const ts = new Date(event.timestamp);
  // duplicate / out-of-order check
  if (vehicle.lastSeen && ts <= new Date(vehicle.lastSeen)) return { ignored: true };

  // update in-memory latest state (cheap, no DB)
  vehicle.status = 'online';
  vehicle.lastSeen = ts;
  vehicle.lastLocation = { lat: event.lat, lng: event.lng };
  vehicle.lastSpeed = event.speed;

  addToBuffer({ ...event, timestamp: ts });   // history is written in batches
  await updateTrip(event);

  io.emit('telemetry:update', { ...event, status: 'online', speedLimit: vehicle.speedLimit });

  if (event.speed > vehicle.speedLimit) {
    await createAlertIfNeeded(io, {
      vehicleId: event.vehicleId, type: 'OVERSPEED', value: event.speed, limit: vehicle.speedLimit,
      message: `${event.vehicleId} at ${event.speed} km/h (limit ${vehicle.speedLimit})`,
    });
  }
  return { ok: true };
}
