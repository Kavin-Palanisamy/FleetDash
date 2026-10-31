/**
 * FleetDash Load Testing Tool
 * Ramps through vehicle stages (e.g. 5 -> 50 -> 200 -> 1000),
 * queries /api/metrics before and after, measures real client latency,
 * and outputs a verified performance comparison table.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const API_URL = `${API_BASE}/api/telemetry`;
const METRICS_URL = `${API_BASE}/api/metrics`;
const API_KEY = process.env.API_KEY || 'change-me';

// Configurable test stages and duration per stage
const STAGES = (process.env.STAGES || '5,50,200,500')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isInteger(n) && n > 0);

const STAGE_DURATION_SEC = parseInt(process.env.STAGE_DURATION_SEC || '15', 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '1000', 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchMetrics() {
  try {
    const res = await fetch(METRICS_URL);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[LoadTest] Could not fetch server metrics:', err.message);
  }
  return null;
}

function calculatePercentile(numbers, p) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * (p / 100)));
  return Number(sorted[idx].toFixed(2));
}

async function runStage(vehicleCount) {
  console.log(`\n======================================================`);
  console.log(`>>> Starting stage: ${vehicleCount} concurrent vehicles for ${STAGE_DURATION_SEC}s`);
  console.log(`======================================================`);

  const initialMetrics = await fetchMetrics();

  const vehicles = Array.from({ length: vehicleCount }, (_, i) => ({
    vehicleId: `BUS${101 + i}`,
    lat: 11.66 + Math.random() * 0.05,
    lng: 78.14 + Math.random() * 0.05,
    speed: 30 + Math.random() * 40,
    heading: Math.floor(Math.random() * 360),
    fuelLevel: 90,
  }));

  const latencies = [];
  let totalSent = 0;
  let successful = 0;
  let failed = 0;
  let running = true;

  // Worker loop for each vehicle
  const timers = vehicles.map((v) => {
    return setInterval(async () => {
      if (!running) return;

      v.speed = Math.max(0, Math.min(100, v.speed + (Math.random() - 0.5) * 10));
      v.heading = (v.heading + 10) % 360;
      v.lat += 0.0001;
      v.lng += 0.0001;

      const payload = {
        vehicleId: v.vehicleId,
        timestamp: new Date().toISOString(),
        lat: Number(v.lat.toFixed(6)),
        lng: Number(v.lng.toFixed(6)),
        speed: Number(v.speed.toFixed(1)),
        heading: v.heading,
        fuelLevel: v.fuelLevel,
      };

      totalSent += 1;
      const start = performance.now();

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify(payload),
        });

        const elapsed = performance.now() - start;
        latencies.push(elapsed);

        if (res.status === 200 || res.status === 202) {
          successful += 1;
        } else {
          failed += 1;
        }
      } catch (err) {
        failed += 1;
      }
    }, INTERVAL_MS);
  });

  // Wait for stage duration
  await sleep(STAGE_DURATION_SEC * 1000);
  running = false;
  timers.forEach((t) => clearInterval(t));

  // Small delay to let in-flight HTTP requests finish
  await sleep(1500);

  const finalMetrics = await fetchMetrics();

  const durationSec = STAGE_DURATION_SEC;
  const eventsPerSec = Number((successful / durationSec).toFixed(1));
  const errorRate = totalSent > 0 ? Number(((failed / totalSent) * 100).toFixed(2)) : 0;
  const avgLatency = latencies.length
    ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2))
    : 0;
  const p95Latency = calculatePercentile(latencies, 95);

  const serverProcessed = finalMetrics && initialMetrics
    ? (finalMetrics.counters.eventsProcessed - initialMetrics.counters.eventsProcessed)
    : 'N/A';
  const serverP95 = finalMetrics?.processingTimeMs?.p95 ?? 'N/A';
  const bufferSize = finalMetrics?.bufferSize ?? 'N/A';
  const memoryRssMb = finalMetrics?.memory?.rssMb ?? 'N/A';

  return {
    'Vehicles': vehicleCount,
    'Sent': totalSent,
    'Success': successful,
    'Events/sec': eventsPerSec,
    'Error %': `${errorRate}%`,
    'Client Avg (ms)': avgLatency,
    'Client p95 (ms)': p95Latency,
    'Server p95 (ms)': serverP95,
    'Server Buf': bufferSize,
    'RAM (MB)': memoryRssMb,
  };
}

async function runLoadTest() {
  console.log(`Starting FleetDash Load Test against ${API_BASE}`);
  console.log(`Stages: ${STAGES.join(', ')} vehicles (${STAGE_DURATION_SEC}s per stage)`);

  const initialCheck = await fetchMetrics();
  if (!initialCheck) {
    console.error(`ERROR: Cannot reach backend at ${API_BASE}. Make sure server is running first!`);
    process.exit(1);
  }

  const results = [];

  for (const stageCount of STAGES) {
    const row = await runStage(stageCount);
    results.push(row);
    // Cool-down interval between stages
    await sleep(2000);
  }

  console.log('\n======================================================');
  console.log('                 LOAD TEST SUMMARY RESULTS             ');
  console.log('======================================================');
  console.table(results);
  console.log('Load test completed successfully.');
}

runLoadTest().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
