import test from 'node:test';
import assert from 'node:assert';
import { validateTelemetry } from '../src/middleware/validate.js';

test('rejects bad speed', () => {
  let status;
  const res = { status: (s) => { status = s; return { json() {} }; } };
  validateTelemetry({ body: { vehicleId: 'BUS101', timestamp: new Date().toISOString(), lat: 11, lng: 78, speed: -5 } }, res, () => {});
  assert.strictEqual(status, 400);
});
// TODO: more tests (duplicates, overspeed alert, unknown vehicle)
