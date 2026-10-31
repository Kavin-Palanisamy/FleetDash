import test from 'node:test';
import assert from 'node:assert';
import { processTelemetry } from '../src/services/telemetryProcessor.js';
import { setVehicle, getVehicle } from '../src/services/vehicleCache.js';
import { resetAlertCooldowns } from '../src/services/alertService.js';
import Alert from '../src/models/Alert.js';
import { resetBuffer } from '../src/services/telemetryBuffer.js';

test('Pipeline: rejects unknown vehicle with 404 error', async () => {
  const io = { emit: () => {} };
  await assert.rejects(
    async () => {
      await processTelemetry(io, {
        vehicleId: 'NONEXISTENT_999',
        timestamp: new Date().toISOString(),
        lat: 11.66,
        lng: 78.14,
        speed: 50,
      });
    },
    (err) => {
      assert.strictEqual(err.status, 404);
      assert.ok(err.message.includes('Unknown vehicle'));
      return true;
    }
  );
});

test('Pipeline: ignores duplicate or older timestamp events with { ignored: true }', async () => {
  const now = new Date();
  setVehicle('BUS101', {
    vehicleId: 'BUS101',
    name: 'Bus 101',
    speedLimit: 80,
    status: 'online',
    lastSeen: now,
  });

  const io = { emit: () => {} };

  // Send an event with an older timestamp
  const olderTimestamp = new Date(now.getTime() - 5000).toISOString();
  const res = await processTelemetry(io, {
    vehicleId: 'BUS101',
    timestamp: olderTimestamp,
    lat: 11.66,
    lng: 78.14,
    speed: 55,
  });

  assert.deepStrictEqual(res, { ignored: true });
});

test('Pipeline: processes valid telemetry, updates state, and emits telemetry:update', async () => {
  const now = new Date(Date.now() - 10_000);
  setVehicle('BUS101', {
    vehicleId: 'BUS101',
    name: 'Bus 101',
    speedLimit: 80,
    status: 'offline',
    lastSeen: now,
  });

  const emitted = [];
  const mockIo = {
    emit: (event, data) => emitted.push({ event, data }),
  };

  const newTime = new Date().toISOString();
  const res = await processTelemetry(mockIo, {
    vehicleId: 'BUS101',
    timestamp: newTime,
    lat: 11.665,
    lng: 78.145,
    speed: 65,
    heading: 90,
    fuelLevel: 85,
  });

  assert.strictEqual(res.ok, true);

  // In-memory cache must be updated
  const v = getVehicle('BUS101');
  assert.strictEqual(v.status, 'online');
  assert.strictEqual(v.lastSpeed, 65);
  assert.deepStrictEqual(v.lastLocation, { lat: 11.665, lng: 78.145 });

  // Must emit vehicle:status online because it transitioned from offline
  const statusEvent = emitted.find((e) => e.event === 'vehicle:status');
  assert.ok(statusEvent, 'vehicle:status must be emitted');
  assert.strictEqual(statusEvent.data.status, 'online');

  // Must emit telemetry:update with speedLimit
  const updateEvent = emitted.find((e) => e.event === 'telemetry:update');
  assert.ok(updateEvent, 'telemetry:update must be emitted');
  assert.strictEqual(updateEvent.data.speedLimit, 80);
  assert.strictEqual(updateEvent.data.speed, 65);

  resetBuffer();
});

test('Pipeline: triggers OVERSPEED alert and respects 30-second cooldown', async () => {
  resetAlertCooldowns();
  setVehicle('BUS102', {
    vehicleId: 'BUS102',
    name: 'Bus 102',
    speedLimit: 80,
    status: 'online',
    lastSeen: new Date(Date.now() - 20_000),
  });

  const originalAlertCreate = Alert.create;
  const createdAlerts = [];
  Alert.create = async (doc) => {
    const alertObj = { _id: 'alert_id_1', ...doc, createdAt: new Date() };
    createdAlerts.push(alertObj);
    return alertObj;
  };

  const emitted = [];
  const mockIo = { emit: (event, data) => emitted.push({ event, data }) };

  try {
    // 1st overspeed event: speed 95 > limit 80
    await processTelemetry(mockIo, {
      vehicleId: 'BUS102',
      timestamp: new Date(Date.now() - 5000).toISOString(),
      lat: 11.66,
      lng: 78.14,
      speed: 95,
    });

    assert.strictEqual(createdAlerts.length, 1);
    assert.strictEqual(createdAlerts[0].type, 'OVERSPEED');
    assert.strictEqual(createdAlerts[0].value, 95);
    assert.ok(emitted.some((e) => e.event === 'alert:new'));

    // 2nd overspeed event right after (within 30s cooldown): should not create new alert
    await processTelemetry(mockIo, {
      vehicleId: 'BUS102',
      timestamp: new Date().toISOString(),
      lat: 11.67,
      lng: 78.15,
      speed: 100,
    });

    assert.strictEqual(createdAlerts.length, 1, 'Cooldown must suppress immediate second alert');
  } finally {
    Alert.create = originalAlertCreate;
    resetAlertCooldowns();
    resetBuffer();
  }
});
