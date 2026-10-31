import test from 'node:test';
import assert from 'node:assert';
import { distanceKm } from '../src/utils/geo.js';

test('Geo: distance between identical coordinates is 0', () => {
  const p = { lat: 11.6643, lng: 78.1460 };
  const d = distanceKm(p, p);
  assert.strictEqual(d, 0);
});

test('Geo: calculates approximate distance accurately between two locations', () => {
  // Salem (11.6643, 78.1460) to Coimbatore (11.0168, 76.9558) is approx ~145-155 km straight-line
  const salem = { lat: 11.6643, lng: 78.1460 };
  const coimbatore = { lat: 11.0168, lng: 76.9558 };
  const d = distanceKm(salem, coimbatore);

  assert.ok(d > 140 && d < 160, `Expected distance ~150km, got ${d}`);
});

test('Geo: calculates short movement distances correctly', () => {
  const p1 = { lat: 11.6600, lng: 78.1400 };
  const p2 = { lat: 11.6609, lng: 78.1400 }; // roughly 0.0009 deg lat is ~100 meters (0.1 km)
  const d = distanceKm(p1, p2);

  assert.ok(d > 0.08 && d < 0.12, `Expected distance ~0.1km, got ${d}`);
});
