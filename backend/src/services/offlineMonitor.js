import { env } from '../config/env.js';
import { getAllVehicles } from './vehicleCache.js';
import { createAlertIfNeeded } from './alertService.js';
import { completeTrip } from './tripService.js';

let monitorInterval = null;

// Checks for any vehicle that hasn't sent data within OFFLINE_AFTER_SECONDS
export async function checkOfflineVehicles(io) {
  const now = Date.now();
  for (const v of getAllVehicles()) {
    if (v.status === 'online' && v.lastSeen && now - new Date(v.lastSeen).getTime() > env.offlineAfterSeconds * 1000) {
      v.status = 'offline';

      // Complete active trip when vehicle drops offline
      await completeTrip(v.vehicleId, new Date(v.lastSeen || now));

      if (io) {
        io.emit('vehicle:status', { vehicleId: v.vehicleId, status: 'offline' });
      }

      await createAlertIfNeeded(io, {
        vehicleId: v.vehicleId,
        type: 'OFFLINE',
        message: `${v.vehicleId} stopped sending data`,
      });
    }
  }
}

// Every 5s: run offline check across all tracked vehicles
export function startOfflineMonitor(io) {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(() => checkOfflineVehicles(io), 5000);
  return monitorInterval;
}

export function stopOfflineMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}


