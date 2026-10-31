import Trip from '../models/Trip.js';
import { distanceKm } from '../utils/geo.js';
import { logger } from '../utils/logger.js';

// In-memory active trips: vehicleId -> active trip object
const activeTrips = new Map();

// Trip ends after 2 minutes of zero speed
const STOPPED_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Updates or begins an in-memory trip upon receiving a telemetry event.
 * Avoids constant database writes while vehicle is moving.
 */
export async function updateTrip(event) {
  const { vehicleId, speed, lat, lng } = event;
  const eventTime = new Date(event.timestamp);

  let trip = activeTrips.get(vehicleId);

  // 1. Vehicle starts moving and has no active trip -> start one
  if (!trip && speed > 0) {
    trip = {
      vehicleId,
      startTime: eventTime,
      lastLocation: { lat, lng },
      distanceKm: 0,
      maxSpeed: speed,
      stoppedSince: null,
    };
    activeTrips.set(vehicleId, trip);
    return trip;
  }

  // If no trip exists and speed is 0, do nothing
  if (!trip) return null;

  // 2. Active trip exists: update maxSpeed
  trip.maxSpeed = Math.max(trip.maxSpeed, speed);

  if (speed > 0) {
    // Reset stopped counter since vehicle is moving
    trip.stoppedSince = null;

    // Accumulate distance using haversine calculation
    if (trip.lastLocation && (trip.lastLocation.lat !== lat || trip.lastLocation.lng !== lng)) {
      const delta = distanceKm(trip.lastLocation, { lat, lng });
      // Guard against unrealistic GPS teleportation jumps (> 5 km in one 2-sec interval)
      if (delta > 0 && delta < 5) {
        trip.distanceKm = Number((trip.distanceKm + delta).toFixed(3));
      }
    }
    trip.lastLocation = { lat, lng };
  } else {
    // speed is 0: track when the stop started
    if (!trip.stoppedSince) {
      trip.stoppedSince = eventTime.getTime();
    } else if (eventTime.getTime() - trip.stoppedSince >= STOPPED_THRESHOLD_MS) {
      // Vehicle has been stationary for >= 2 minutes: complete the trip
      return await completeTrip(vehicleId, eventTime);
    }
  }

  return trip;
}

/**
 * Completes and persists an active trip to MongoDB (e.g. after stopping or going offline).
 */
export async function completeTrip(vehicleId, endTime = new Date()) {
  const trip = activeTrips.get(vehicleId);
  if (!trip) return null;

  activeTrips.delete(vehicleId);

  try {
    const saved = await Trip.create({
      vehicleId: trip.vehicleId,
      startTime: trip.startTime,
      endTime,
      distanceKm: trip.distanceKm,
      maxSpeed: trip.maxSpeed,
      status: 'completed',
    });
    return saved;
  } catch (err) {
    logger.error(`Failed to save completed trip for ${vehicleId}:`, err.message);
    return null;
  }
}

// Helpers for testing and diagnostics
export const getActiveTrip = (vehicleId) => activeTrips.get(vehicleId);
export const getAllActiveTrips = () => Array.from(activeTrips.values());
export const resetTrips = () => activeTrips.clear();
