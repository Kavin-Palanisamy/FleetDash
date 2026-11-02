import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import Vehicle from '../src/models/Vehicle.js';
import Telemetry from '../src/models/Telemetry.js';
import Alert from '../src/models/Alert.js';
import { loadVehicles, clearCache } from '../src/services/vehicleCache.js';

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Seed sample vehicle for integration tests
  await Vehicle.create({
    vehicleId: 'BUS101',
    name: 'Bus 101',
    type: 'bus',
    speedLimit: 80,
    status: 'offline',
  });

  await loadVehicles();

  // Attach mock Socket.IO instance to app for testing
  app.set('io', {
    emit: () => {},
  });
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  clearCache();
});

test('Integration: GET /api/health returns 200 and connected status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.mongo, 'connected');
  assert.equal(typeof res.body.uptimeSeconds, 'number');
});

test('Integration: POST /api/telemetry rejects wrong or missing API key with 401', async () => {
  const resNoKey = await request(app)
    .post('/api/telemetry')
    .send({ vehicleId: 'BUS101' });
  assert.equal(resNoKey.status, 401);
  assert.ok(resNoKey.body.error);

  const resWrongKey = await request(app)
    .post('/api/telemetry')
    .set('x-api-key', 'wrong-key-value')
    .send({ vehicleId: 'BUS101' });
  assert.equal(resWrongKey.status, 401);
  assert.equal(resWrongKey.body.error, 'Unauthorized: Invalid API key');
});

test('Integration: POST /api/telemetry rejects unknown vehicle with 404', async () => {
  const payload = {
    vehicleId: 'UNKNOWN999',
    timestamp: new Date().toISOString(),
    lat: 11.6643,
    lng: 78.1460,
    speed: 45.0,
  };

  const res = await request(app)
    .post('/api/telemetry')
    .set('x-api-key', 'change-me')
    .send(payload);

  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'Unknown vehicle: UNKNOWN999');
});

test('Integration: POST /api/telemetry rejects invalid payload with 400 and error list', async () => {
  const invalidPayload = {
    vehicleId: 'BUS101',
    timestamp: 'not-a-valid-date',
    lat: 150.0, // out of range
    lng: 'invalid-lng',
    speed: -20, // negative speed
  };

  const res = await request(app)
    .post('/api/telemetry')
    .set('x-api-key', 'change-me')
    .send(invalidPayload);

  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.errors));
  assert.ok(res.body.errors.length >= 3);
});

test('Integration: POST /api/telemetry accepts valid event with 202 Accepted', async () => {
  const now = new Date();
  const validPayload = {
    vehicleId: 'BUS101',
    timestamp: now.toISOString(),
    lat: 11.6643,
    lng: 78.1460,
    speed: 55.0,
    heading: 180,
    fuelLevel: 85.5,
  };

  const res = await request(app)
    .post('/api/telemetry')
    .set('x-api-key', 'change-me')
    .send(validPayload);

  assert.equal(res.status, 202);
  assert.equal(res.body.ok, true);
});

test('Integration: POST /api/telemetry ignores duplicate or older timestamp with 200 { ignored: true }', async () => {
  const pastTimestamp = new Date(Date.now() - 60_000).toISOString();
  const duplicatePayload = {
    vehicleId: 'BUS101',
    timestamp: pastTimestamp,
    lat: 11.6643,
    lng: 78.1460,
    speed: 50.0,
  };

  const res = await request(app)
    .post('/api/telemetry')
    .set('x-api-key', 'change-me')
    .send(duplicatePayload);

  assert.equal(res.status, 200);
  assert.equal(res.body.ignored, true);
});

test('Integration: GET /api/vehicles returns list of vehicles with in-memory state', async () => {
  const res = await request(app).get('/api/vehicles');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  const bus101 = res.body.find((v) => v.vehicleId === 'BUS101');
  assert.ok(bus101);
  assert.equal(bus101.speedLimit, 80);
});

test('Integration: GET /api/vehicles/:id/telemetry returns telemetry points', async () => {
  // Directly insert a persisted telemetry record to verify querying
  await Telemetry.create({
    vehicleId: 'BUS101',
    timestamp: new Date(),
    lat: 11.6650,
    lng: 78.1470,
    speed: 52.0,
    heading: 90,
    fuelLevel: 84.0,
  });

  const res = await request(app).get('/api/vehicles/BUS101/telemetry?limit=10');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 1);
  assert.equal(res.body[0].vehicleId, 'BUS101');
});

test('Integration: GET /api/alerts returns alerts list', async () => {
  const alertDoc = await Alert.create({
    vehicleId: 'BUS101',
    type: 'OVERSPEED',
    message: 'BUS101 at 92 km/h (limit 80)',
    value: 92,
    limit: 80,
    resolved: false,
  });

  const res = await request(app).get('/api/alerts');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  const found = res.body.find((a) => a._id.toString() === alertDoc._id.toString());
  assert.ok(found);
  assert.equal(found.resolved, false);
});

test('Integration: PATCH /api/alerts/:id/resolve resolves an alert', async () => {
  const alertDoc = await Alert.create({
    vehicleId: 'BUS101',
    type: 'OFFLINE',
    message: 'BUS101 went offline',
    resolved: false,
  });

  const res = await request(app).patch(`/api/alerts/${alertDoc._id}/resolve`);
  assert.equal(res.status, 200);
  assert.equal(res.body.resolved, true);

  const updated = await Alert.findById(alertDoc._id);
  assert.equal(updated.resolved, true);
});

test('Integration: GET /api/metrics returns event counters and processing metrics', async () => {
  const res = await request(app).get('/api/metrics');
  assert.equal(res.status, 200);
  assert.ok(res.body.counters);
  assert.ok(typeof res.body.counters.eventsReceived === 'number');
  assert.ok(typeof res.body.counters.eventsProcessed === 'number');
  assert.ok(typeof res.body.processingTimeMs.p95 === 'number');
  assert.ok(typeof res.body.bufferSize === 'number');
});
