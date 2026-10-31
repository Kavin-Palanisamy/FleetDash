import test from 'node:test';
import assert from 'node:assert';
import {
  addToBuffer,
  getBufferSize,
  resetBuffer,
  flush,
} from '../src/services/telemetryBuffer.js';
import Telemetry from '../src/models/Telemetry.js';
import Vehicle from '../src/models/Vehicle.js';
import { metrics } from '../src/services/metrics.js';

test('Buffer: adds events and tracks size', () => {
  resetBuffer();
  assert.strictEqual(getBufferSize(), 0);

  addToBuffer({ vehicleId: 'BUS101', speed: 50 });
  addToBuffer({ vehicleId: 'BUS102', speed: 60 });

  assert.strictEqual(getBufferSize(), 2);
  resetBuffer();
  assert.strictEqual(getBufferSize(), 0);
});

test('Buffer: caps max buffer size and increments dropped metric', () => {
  resetBuffer();
  metrics.resetMetrics();

  // Populate buffer to capacity (10,000)
  for (let i = 0; i < 10_000; i++) {
    addToBuffer({ vehicleId: 'BUS101', seq: i });
  }
  assert.strictEqual(getBufferSize(), 10_000);
  assert.strictEqual(metrics.getMetrics().counters.droppedEvents, 0);

  // Adding 1 more when at max capacity drops the oldest event
  addToBuffer({ vehicleId: 'BUS101', seq: 10_001 });
  assert.strictEqual(getBufferSize(), 10_000);
  assert.strictEqual(metrics.getMetrics().counters.droppedEvents, 1);

  resetBuffer();
  metrics.resetMetrics();
});

test('Buffer: flushes successfully when database is healthy', async () => {
  resetBuffer();
  addToBuffer({ vehicleId: 'BUS101', speed: 50 });
  addToBuffer({ vehicleId: 'BUS102', speed: 55 });

  const originalInsertMany = Telemetry.insertMany;
  const originalBulkWrite = Vehicle.bulkWrite;

  let insertedCount = 0;
  Telemetry.insertMany = async (batch) => {
    insertedCount = batch.length;
    return batch;
  };
  Vehicle.bulkWrite = async (ops) => ops;

  try {
    await flush();
    assert.strictEqual(insertedCount, 2);
    assert.strictEqual(getBufferSize(), 0);
  } finally {
    Telemetry.insertMany = originalInsertMany;
    Vehicle.bulkWrite = originalBulkWrite;
    resetBuffer();
  }
});

test('Buffer: preserves and re-queues batch when insert fails', async () => {
  resetBuffer();
  addToBuffer({ vehicleId: 'BUS101', speed: 70 });
  addToBuffer({ vehicleId: 'BUS102', speed: 75 });

  const originalInsertMany = Telemetry.insertMany;
  Telemetry.insertMany = async () => {
    throw new Error('Database temporarily unavailable');
  };

  try {
    await flush();
    // After failure, items must be put back in the buffer for retry
    assert.strictEqual(getBufferSize(), 2);
  } finally {
    Telemetry.insertMany = originalInsertMany;
    resetBuffer();
  }
});
