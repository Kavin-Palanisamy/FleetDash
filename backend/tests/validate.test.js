import test from 'node:test';
import assert from 'node:assert';
import { validateTelemetry } from '../src/middleware/validate.js';

function executeValidation(body) {
  let status = null;
  let responseData = null;
  let nextCalled = false;

  const req = { body };
  const res = {
    status: (s) => {
      status = s;
      return {
        json: (d) => { responseData = d; },
      };
    },
  };
  const next = () => { nextCalled = true; };

  validateTelemetry(req, res, next);
  return { status, responseData, nextCalled };
}

test('Validation: rejects non-object or array body', () => {
  const r1 = executeValidation(null);
  assert.strictEqual(r1.status, 400);

  const r2 = executeValidation([1, 2, 3]);
  assert.strictEqual(r2.status, 400);

  const r3 = executeValidation('raw string');
  assert.strictEqual(r3.status, 400);
});

test('Validation: rejects invalid vehicleId (missing, empty, or too long)', () => {
  const r1 = executeValidation({ timestamp: new Date().toISOString(), lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r1.status, 400);
  assert.ok(r1.responseData.errors.some((e) => e.includes('vehicleId required')));

  const r2 = executeValidation({ vehicleId: '   ', timestamp: new Date().toISOString(), lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r2.status, 400);

  const longId = 'A'.repeat(51);
  const r3 = executeValidation({ vehicleId: longId, timestamp: new Date().toISOString(), lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r3.status, 400);
  assert.ok(r3.responseData.errors.some((e) => e.includes('50 characters')));
});

test('Validation: rejects invalid timestamp format and future/past bounds', () => {
  // Non-ISO string
  const r1 = executeValidation({ vehicleId: 'BUS101', timestamp: 'not-a-date', lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r1.status, 400);

  // Far future (> 5 min)
  const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const r2 = executeValidation({ vehicleId: 'BUS101', timestamp: future, lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r2.status, 400);
  assert.ok(r2.responseData.errors.some((e) => e.includes('5 minutes in the future')));

  // Far past (> 24 hours)
  const past = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const r3 = executeValidation({ vehicleId: 'BUS101', timestamp: past, lat: 11, lng: 78, speed: 50 });
  assert.strictEqual(r3.status, 400);
  assert.ok(r3.responseData.errors.some((e) => e.includes('older than 24 hours')));
});

test('Validation: rejects out-of-range coordinates and NaN values', () => {
  const r1 = executeValidation({
    vehicleId: 'BUS101',
    timestamp: new Date().toISOString(),
    lat: 95,
    lng: -190,
    speed: -10,
  });
  assert.strictEqual(r1.status, 400);
  assert.ok(r1.responseData.errors.some((e) => e.includes('lat')));
  assert.ok(r1.responseData.errors.some((e) => e.includes('lng')));
  assert.ok(r1.responseData.errors.some((e) => e.includes('speed')));

  const r2 = executeValidation({
    vehicleId: 'BUS101',
    timestamp: new Date().toISOString(),
    lat: NaN,
    lng: NaN,
    speed: NaN,
  });
  assert.strictEqual(r2.status, 400);
});

test('Validation: validates optional heading and fuelLevel correctly', () => {
  const invalid = executeValidation({
    vehicleId: 'BUS101',
    timestamp: new Date().toISOString(),
    lat: 11.66,
    lng: 78.14,
    speed: 50,
    heading: 400,
    fuelLevel: -5,
  });
  assert.strictEqual(invalid.status, 400);
  assert.ok(invalid.responseData.errors.some((e) => e.includes('heading')));
  assert.ok(invalid.responseData.errors.some((e) => e.includes('fuelLevel')));

  const valid = executeValidation({
    vehicleId: 'BUS101',
    timestamp: new Date().toISOString(),
    lat: 11.66,
    lng: 78.14,
    speed: 50,
    heading: 180,
    fuelLevel: 75.5,
  });
  assert.strictEqual(valid.status, null);
  assert.strictEqual(valid.nextCalled, true);
});
