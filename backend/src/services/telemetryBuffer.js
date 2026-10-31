import Telemetry from '../models/Telemetry.js';
import Vehicle from '../models/Vehicle.js';
import { env } from '../config/env.js';
import { getAllVehicles } from './vehicleCache.js';
import { logger } from '../utils/logger.js';
import { metrics } from './metrics.js';

let buffer = [];
let isFlushing = false;
let flushInterval = null;
const MAX_BUFFER_SIZE = 10_000;

export const addToBuffer = (doc) => {
  // If buffer exceeds max capacity (e.g. database has been down), drop oldest to protect memory
  if (buffer.length >= MAX_BUFFER_SIZE) {
    buffer.shift();
    metrics.incrementDropped(1);
    logger.warn('Telemetry buffer reached max capacity; dropped oldest event');
  }
  buffer.push(doc);
};

export const getBufferSize = () => buffer.length;
export const resetBuffer = () => { buffer = []; };

// Batch insert: 1 DB call for many events instead of 1 call per event.
export async function flush() {
  // If nothing to flush or flush already in progress, avoid overlapping executions
  if (!buffer.length || isFlushing) return;

  isFlushing = true;
  const batch = buffer;
  buffer = [];

  try {
    await Telemetry.insertMany(batch, { ordered: false });

    // Update vehicles in database with their latest known state
    const ops = getAllVehicles()
      .filter((v) => v.lastSeen) // Only update vehicles that have recorded activity
      .map((v) => ({
        updateOne: {
          filter: { vehicleId: v.vehicleId },
          update: {
            status: v.status,
            lastSeen: v.lastSeen,
            lastLocation: v.lastLocation,
            lastSpeed: v.lastSpeed,
          },
        },
      }));

    if (ops.length) {
      await Vehicle.bulkWrite(ops);
    }
  } catch (err) {
    logger.error('flush failed:', err.message);
    // Put unsaved batch back to the front of the buffer for the next retry
    buffer = batch.concat(buffer).slice(0, MAX_BUFFER_SIZE);
  } finally {
    isFlushing = false;
  }
}

export const startFlushTimer = () => {
  if (flushInterval) clearInterval(flushInterval);
  flushInterval = setInterval(flush, env.batchFlushMs);
  return flushInterval;
};

export const stopFlushTimer = () => {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
};


