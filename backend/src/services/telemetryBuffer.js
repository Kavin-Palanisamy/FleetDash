import Telemetry from '../models/Telemetry.js';
import Vehicle from '../models/Vehicle.js';
import { env } from '../config/env.js';
import { getAllVehicles } from './vehicleCache.js';
import { logger } from '../utils/logger.js';

let buffer = [];
export const addToBuffer = (doc) => buffer.push(doc);

// Batch insert: 1 DB call for many events instead of 1 call per event.
export async function flush() {
  if (!buffer.length) return;
  const batch = buffer; buffer = [];
  try {
    await Telemetry.insertMany(batch, { ordered: false });
    const ops = getAllVehicles().map((v) => ({
      updateOne: { filter: { vehicleId: v.vehicleId },
        update: { status: v.status, lastSeen: v.lastSeen, lastLocation: v.lastLocation, lastSpeed: v.lastSpeed } },
    }));
    if (ops.length) await Vehicle.bulkWrite(ops);
  } catch (err) {
    logger.error('flush failed', err.message); // TODO: retry or re-queue
  }
}
export const startFlushTimer = () => setInterval(flush, env.batchFlushMs);
