import test from 'node:test';
import assert from 'node:assert';
import { metrics } from '../src/services/metrics.js';

test('Metrics: counters increment accurately and reset cleanly', () => {
  metrics.resetMetrics();

  metrics.incrementReceived();
  metrics.incrementReceived();
  metrics.incrementProcessed();
  metrics.incrementIgnored();
  metrics.incrementRejected();
  metrics.incrementErrors();
  metrics.incrementDropped(5);
  metrics.incrementSockets();

  const data = metrics.getMetrics({ bufferSize: 12 });

  assert.strictEqual(data.counters.eventsReceived, 2);
  assert.strictEqual(data.counters.eventsProcessed, 1);
  assert.strictEqual(data.counters.eventsIgnored, 1);
  assert.strictEqual(data.counters.eventsRejected, 1);
  assert.strictEqual(data.counters.errors, 1);
  assert.strictEqual(data.counters.droppedEvents, 5);
  assert.strictEqual(data.connectedSockets, 1);
  assert.strictEqual(data.bufferSize, 12);
  assert.ok(data.uptimeSeconds >= 0);
  assert.ok(data.memory.rssMb > 0);

  metrics.decrementSockets();
  assert.strictEqual(metrics.getMetrics().connectedSockets, 0);

  metrics.resetMetrics();
  assert.strictEqual(metrics.getMetrics().counters.eventsReceived, 0);
});

test('Metrics: calculates avg and p95 latency on recorded samples', () => {
  metrics.resetMetrics();

  // Record latencies: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ms
  for (let i = 1; i <= 10; i++) {
    metrics.recordProcessingTime(i * 10);
  }

  const data = metrics.getMetrics();
  // Average of 10..100 = 55
  assert.strictEqual(data.processingTimeMs.avg, 55);
  // 95th percentile index in 10 items (idx 9) is 100
  assert.strictEqual(data.processingTimeMs.p95, 100);
  assert.strictEqual(data.processingTimeMs.samplesCount, 10);

  metrics.resetMetrics();
});
