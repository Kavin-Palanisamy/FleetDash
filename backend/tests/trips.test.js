import test from 'node:test';
import assert from 'node:assert';
import {
  updateTrip,
  completeTrip,
  getActiveTrip,
  resetTrips,
} from '../src/services/tripService.js';
import Trip from '../src/models/Trip.js';

test('TripService: starts a new trip when speed > 0 and no active trip exists', async () => {
  resetTrips();

  const now = new Date();
  const trip = await updateTrip({
    vehicleId: 'BUS105',
    speed: 45,
    lat: 11.6643,
    lng: 78.1460,
    timestamp: now.toISOString(),
  });

  assert.ok(trip);
  assert.strictEqual(trip.vehicleId, 'BUS105');
  assert.strictEqual(trip.maxSpeed, 45);
  assert.strictEqual(trip.distanceKm, 0);

  const active = getActiveTrip('BUS105');
  assert.ok(active);
  assert.strictEqual(active.maxSpeed, 45);

  resetTrips();
});

test('TripService: accumulates distance and updates maxSpeed while vehicle is moving', async () => {
  resetTrips();

  const t1 = new Date();
  await updateTrip({
    vehicleId: 'BUS105',
    speed: 40,
    lat: 11.6600,
    lng: 78.1400,
    timestamp: t1.toISOString(),
  });

  // Second event: moving ~100m north, speed increases to 60
  const t2 = new Date(t1.getTime() + 2000);
  const updated = await updateTrip({
    vehicleId: 'BUS105',
    speed: 60,
    lat: 11.6609,
    lng: 78.1400,
    timestamp: t2.toISOString(),
  });

  assert.strictEqual(updated.maxSpeed, 60);
  assert.ok(updated.distanceKm > 0.08 && updated.distanceKm < 0.12);

  resetTrips();
});

test('TripService: completes trip after stationary for 2 minutes and persists record', async () => {
  resetTrips();

  const originalTripCreate = Trip.create;
  const savedTrips = [];
  Trip.create = async (doc) => {
    savedTrips.push(doc);
    return { _id: 'trip_123', ...doc };
  };

  try {
    const start = new Date(Date.now() - 3 * 60 * 1000);
    // Start trip
    await updateTrip({
      vehicleId: 'BUS106',
      speed: 50,
      lat: 11.66,
      lng: 78.14,
      timestamp: start.toISOString(),
    });

    // Speed drops to 0 at T + 30s
    const stoppedAt = new Date(start.getTime() + 30_000);
    await updateTrip({
      vehicleId: 'BUS106',
      speed: 0,
      lat: 11.67,
      lng: 78.15,
      timestamp: stoppedAt.toISOString(),
    });

    // Still 0 speed, but stationary for 2 minutes and 5 seconds
    const twoMinLater = new Date(stoppedAt.getTime() + 125_000);
    const completed = await updateTrip({
      vehicleId: 'BUS106',
      speed: 0,
      lat: 11.67,
      lng: 78.15,
      timestamp: twoMinLater.toISOString(),
    });

    assert.ok(completed);
    assert.strictEqual(savedTrips.length, 1);
    assert.strictEqual(savedTrips[0].vehicleId, 'BUS106');
    assert.strictEqual(savedTrips[0].status, 'completed');
    assert.strictEqual(savedTrips[0].maxSpeed, 50);

    // Active trips map must be clean
    assert.strictEqual(getActiveTrip('BUS106'), undefined);
  } finally {
    Trip.create = originalTripCreate;
    resetTrips();
  }
});
