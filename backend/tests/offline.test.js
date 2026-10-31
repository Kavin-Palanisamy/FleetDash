import test from 'node:test';
import assert from 'node:assert';
import { checkOfflineVehicles } from '../src/services/offlineMonitor.js';
import { setVehicle, getVehicle } from '../src/services/vehicleCache.js';
import { resetAlertCooldowns } from '../src/services/alertService.js';
import Alert from '../src/models/Alert.js';
import { resetTrips } from '../src/services/tripService.js';

test('OfflineMonitor: marks inactive vehicle offline and triggers alert', async () => {
  resetAlertCooldowns();
  resetTrips();

  // Set vehicle last seen 25 seconds ago (> OFFLINE_AFTER_SECONDS of 15s)
  const silentSince = new Date(Date.now() - 25_000);
  setVehicle('BUS103', {
    vehicleId: 'BUS103',
    name: 'Bus 103',
    status: 'online',
    lastSeen: silentSince,
    speedLimit: 80,
  });

  const originalAlertCreate = Alert.create;
  const createdAlerts = [];
  Alert.create = async (doc) => {
    createdAlerts.push(doc);
    return { _id: 'alert_offline_1', ...doc };
  };

  const emitted = [];
  const mockIo = { emit: (event, data) => emitted.push({ event, data }) };

  try {
    await checkOfflineVehicles(mockIo);

    // Status in vehicle cache must be updated to offline
    const v = getVehicle('BUS103');
    assert.strictEqual(v.status, 'offline');

    // Must emit vehicle:status offline
    const statusEvent = emitted.find((e) => e.event === 'vehicle:status');
    assert.ok(statusEvent, 'Must emit vehicle:status event');
    assert.strictEqual(statusEvent.data.status, 'offline');

    // Must create OFFLINE alert
    assert.strictEqual(createdAlerts.length, 1);
    assert.strictEqual(createdAlerts[0].type, 'OFFLINE');
    assert.ok(createdAlerts[0].message.includes('stopped sending data'));
  } finally {
    Alert.create = originalAlertCreate;
    resetAlertCooldowns();
  }
});

test('OfflineMonitor: does not mark active vehicle offline', async () => {
  // Set vehicle last seen 2 seconds ago (< 15s)
  setVehicle('BUS104', {
    vehicleId: 'BUS104',
    name: 'Bus 104',
    status: 'online',
    lastSeen: new Date(Date.now() - 2000),
    speedLimit: 80,
  });

  const emitted = [];
  const mockIo = { emit: (event, data) => emitted.push({ event, data }) };

  await checkOfflineVehicles(mockIo);

  const v = getVehicle('BUS104');
  assert.strictEqual(v.status, 'online');
  assert.strictEqual(emitted.length, 0);
});
