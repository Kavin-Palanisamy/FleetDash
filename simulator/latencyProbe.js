import { io } from 'socket.io-client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const DURATION_SEC = process.env.DURATION_SEC ? Number(process.env.DURATION_SEC) : 0;

console.log('='.repeat(60));
console.log(' FleetDash End-to-End Latency Probe');
console.log('='.repeat(60));
console.log(`Connecting to: ${BACKEND_URL}`);
console.log('NOTE: Event timestamps originate from the simulator on this same host.');
console.log('Both client and server share system clock; measured delta represents');
console.log('true E2E pipe latency: HTTP POST -> Ingest -> Queue -> Socket.IO -> Probe.\n');

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
});

const latencies = [];
let startTime = null;

socket.on('connect', () => {
  console.log(`[Probe] Connected to Socket.IO server (socket ID: ${socket.id})`);
  startTime = Date.now();

  if (DURATION_SEC > 0) {
    console.log(`[Probe] Sampling telemetry updates for ${DURATION_SEC} seconds...\n`);
    setTimeout(() => {
      printSummary();
      socket.disconnect();
      process.exit(0);
    }, DURATION_SEC * 1000);
  } else {
    console.log('[Probe] Listening continuously. Press Ctrl+C to stop and print summary.\n');
  }
});

socket.on('connect_error', (err) => {
  console.error(`[Probe] Connection error: ${err.message}`);
});

socket.on('telemetry:update', (event) => {
  if (!event || !event.timestamp) return;

  const receiveTime = Date.now();
  const eventTime = new Date(event.timestamp).getTime();
  const latencyMs = receiveTime - eventTime;

  latencies.push(latencyMs);
});

function calculatePercentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[idx];
}

function printSummary() {
  if (latencies.length === 0) {
    console.log('\n[Probe] No telemetry:update events were received.');
    return;
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / count;
  const p50 = calculatePercentile(sorted, 50);
  const p95 = calculatePercentile(sorted, 95);
  const max = sorted[sorted.length - 1];

  console.log('\n' + '='.repeat(50));
  console.log(' End-to-End Latency Summary (Socket.IO telemetry:update)');
  console.log('='.repeat(50));
  console.log(` Samples Captured : ${count}`);
  console.log(` Average Latency  : ${avg.toFixed(2)} ms`);
  console.log(` p50 (Median)     : ${p50.toFixed(2)} ms`);
  console.log(` p95 Latency      : ${p95.toFixed(2)} ms`);
  console.log(` Max Latency      : ${max.toFixed(2)} ms`);
  console.log('='.repeat(50) + '\n');
}

process.on('SIGINT', () => {
  console.log('\n[Probe] Stopping probe...');
  printSummary();
  socket.disconnect();
  process.exit(0);
});
