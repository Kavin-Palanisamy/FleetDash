import { env } from '../config/env.js';
import { getAllVehicles } from './vehicleCache.js';
import { createAlertIfNeeded } from './alertService.js';

// Every 5s: any vehicle silent for too long becomes "offline".
export function startOfflineMonitor(io) {
  setInterval(async () => {
    const now = Date.now();
    for (const v of getAllVehicles()) {
      if (v.status === 'online' && v.lastSeen && now - new Date(v.lastSeen) > env.offlineAfterSeconds * 1000) {
        v.status = 'offline';
        io.emit('vehicle:status', { vehicleId: v.vehicleId, status: 'offline' });
        await createAlertIfNeeded(io, { vehicleId: v.vehicleId, type: 'OFFLINE', message: `${v.vehicleId} stopped sending data` });
      }
    }
  }, 5000);
}
