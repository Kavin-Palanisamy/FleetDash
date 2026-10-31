import { getVehicle } from './vehicleCache.js';
import { addToBuffer } from './telemetryBuffer.js';
import { createAlertIfNeeded } from './alertService.js';
import { updateTrip } from './tripService.js';
import { metrics } from './metrics.js';

// Core event pipeline: validate (middleware) -> process -> store -> broadcast
export async function processTelemetry(io, event) {
  const startNano = process.hrtime.bigint();
  metrics.incrementReceived();

  const vehicle = getVehicle(event.vehicleId);
  if (!vehicle) {
    metrics.incrementErrors();
    const e = new Error(`Unknown vehicle: ${event.vehicleId}`);
    e.status = 404;
    throw e;
  }

  const ts = new Date(event.timestamp);
  // Duplicate or out-of-order timestamp check
  if (vehicle.lastSeen && ts.getTime() <= new Date(vehicle.lastSeen).getTime()) {
    metrics.incrementIgnored();
    return { ignored: true };
  }

  // Check if vehicle was previously offline so we can notify the dashboard
  const wasOffline = vehicle.status === 'offline';

  // Update in-memory latest state (cheap, zero DB cost)
  vehicle.status = 'online';
  vehicle.lastSeen = ts;
  vehicle.lastLocation = { lat: event.lat, lng: event.lng };
  vehicle.lastSpeed = event.speed;
  if (event.heading !== undefined) vehicle.heading = event.heading;
  if (event.fuelLevel !== undefined) vehicle.fuelLevel = event.fuelLevel;

  addToBuffer({ ...event, timestamp: ts });   // history is buffered for batch insert
  await updateTrip(event);

  if (io) {
    if (wasOffline) {
      io.emit('vehicle:status', { vehicleId: vehicle.vehicleId, status: 'online' });
    }
    io.emit('telemetry:update', {
      ...event,
      timestamp: ts.toISOString(),
      status: 'online',
      speedLimit: vehicle.speedLimit,
    });
  }

  if (event.speed > vehicle.speedLimit) {
    await createAlertIfNeeded(io, {
      vehicleId: event.vehicleId,
      type: 'OVERSPEED',
      value: event.speed,
      limit: vehicle.speedLimit,
      message: `${event.vehicleId} at ${event.speed} km/h (limit ${vehicle.speedLimit})`,
    });
  }

  metrics.incrementProcessed();
  const endNano = process.hrtime.bigint();
  const durationMs = Number(endNano - startNano) / 1_000_000;
  metrics.recordProcessingTime(durationMs);

  return { ok: true };
}


