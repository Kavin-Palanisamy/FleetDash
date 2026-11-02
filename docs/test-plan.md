# FleetDash Test Plan & Verification Strategy

## 1. Automated Test Suite (`node:test`)
FleetDash utilizes Node.js built-in `node:test` and `node:assert` modules without heavy external test dependencies.
Tests run fully in-memory with zero external database dependencies.

### Executing Tests
```powershell
cd backend
npm test
```

### Test Coverage Areas
1. **Middleware Validation (`tests/validate.test.js`)**:
   - Rejects non-object bodies (arrays, strings, nulls) with 400.
   - Enforces `vehicleId` presence, non-empty trimmed strings, max 50 chars.
   - Validates ISO-8601 formatting, enforces $\le 5$ min future and $\le 24$ hr past limits.
   - Rejects out-of-bounds coordinates, `NaN`, and infinite floats with `Number.isFinite`.
   - Validates optional `heading` (0-360) and `fuelLevel` (0-100).
2. **Telemetry Pipeline (`tests/pipeline.test.js`)**:
   - Returns 404 for unknown vehicles.
   - Returns 200 `{ ignored: true }` for duplicate or out-of-order timestamps.
   - Updates in-memory vehicle cache and broadcasts `telemetry:update` with `speedLimit`.
   - Emits `vehicle:status` online when a vehicle returns from offline state.
   - Evaluates speed limits and creates `OVERSPEED` alerts.
   - Enforces 30-second cooldown suppressing duplicate alerts.
3. **Batch Buffer Resiliency (`tests/buffer.test.js`)**:
   - Buffers telemetry docs without synchronous DB writes.
   - Enforces 10,000 max buffer cap, drops oldest event on overflow, and tracks metrics.
   - Atomic flush clears buffer on success.
   - Preserves and re-queues batch to front of buffer on database failures.
4. **Offline Monitor (`tests/offline.test.js`)**:
   - Detects inactive vehicles whose `lastSeen` exceeds `OFFLINE_AFTER_SECONDS`.
   - Emits `vehicle:status` offline and raises `OFFLINE` alert.
   - Leaves active vehicles online.
5. **Trip Engine (`tests/trips.test.js`)**:
   - Starts active trip when `speed > 0`.
   - Accurately tracks accumulated Haversine distance and peak speed in memory.
   - Completes and persists trip record when vehicle is stationary for $\ge 2$ minutes.
6. **Geodesic Calculations (`tests/geo.test.js`)**:
   - Haversine formula verification for zero distance, short movements, and city distances.
7. **Metrics Tracking (`tests/metrics.test.js`)**:
   - Real counter accuracy, rolling p95 latency calculation, and clean resets.

---

## 2. Load Testing (`simulator/loadTest.js`)
Measures real throughput, client-side HTTP latency, server-side processing latency, and memory consumption under multi-stage concurrency.

### Running the Load Test
```powershell
# In terminal 1: Start backend server
cd backend
node server.js

# In terminal 2: Run load tester
cd simulator
node loadTest.js
```

### Configurable Environment Options:
- `STAGES`: Comma-separated list of vehicle counts (e.g. `5,50,200,500`)
- `STAGE_DURATION_SEC`: Time spent per concurrency stage (default `15` seconds)
- `INTERVAL_MS`: Telemetry transmit frequency per vehicle (default `1000` ms)
- `API_BASE`: Target backend URL (default `http://localhost:5000`)
- `API_KEY`: Ingest authentication key

---

## 3. Measured Load Test Results

### Test Environment
- **Date**: 2026-11-02
- **Operating System**: Microsoft Windows 11 Home 64-bit
- **CPU**: AMD Ryzen 3 7320U with Radeon Graphics (4 Cores, 8 Logical Processors)
- **RAM**: 8.0 GB (7.56 GB visible)
- **MongoDB Mode**: in-memory (`mongodb-memory-server` v11.3.0 listening on `127.0.0.1:27017`)
- **Node.js**: v24.20.0

### Exact Commands Executed
```powershell
# 1. Start MongoDB service on port 27017
cd backend
node scripts/startMemoryDb.js

# 2. Seed 500 vehicles into database
cd backend
npm run seed -- 500

# 3. Start backend with rate limiting disabled for load testing
$env:RATE_LIMIT_ENABLED="false"
node server.js

# 4. Execute 30-second multi-stage load test
cd simulator
$env:STAGES="5,50,200,500"
$env:STAGE_DURATION_SEC="30"
node loadTest.js
```

### Measured Performance Table (30s per stage)

| Vehicles | Events Sent | Events Accepted | Throughput (evt/s) | 429 Count | Other Errors | Error Rate | Client Avg Latency | Client p95 Latency | Server p95 Processing | Server Buffer Peak | Peak Memory (RSS) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **5** | 145 | 145 | 4.8 | 0 | 0 | **0.0%** | 20.95 ms | 41.19 ms | 1.10 ms | 0 | 79.17 MB |
| **50** | 1,450 | 1,450 | 48.3 | 0 | 0 | **0.0%** | 27.58 ms | 93.46 ms | 0.42 ms | 0 | 96.32 MB |
| **200** | 5,800 | 5,800 | 193.3 | 0 | 0 | **0.0%** | 50.29 ms | 186.18 ms | 0.19 ms | 0 | 133.63 MB |
| **500** | 14,339 | 14,339 | 478.0 | 0 | 0 | **0.0%** | 123.23 ms | 578.27 ms | 0.20 ms | 0 | 222.15 MB |

### Analysis of Measured Results
- **Throughput Scalability**: The single Node.js instance scaled linearly from 4.8 events/sec (5 vehicles) up to 478.0 events/sec (500 vehicles) with zero dropped events or rejected connections (0% error rate).
- **Server-Side Efficiency**: Server-side processing time (telemetry ingest, validation, in-memory cache update, trip computation, and batch queueing) maintained a p95 latency under 1.2 ms across all stages, dipping to 0.20 ms at peak load due to Node.js V8 JIT optimization.
- **Client-Side Latency**: Client round-trip p95 latency remained under 100 ms for up to 50 vehicles, rising to 186 ms at 200 vehicles and 578 ms at 500 concurrent vehicles due to HTTP/1.1 socket connection pooling and event-loop scheduling on 4 physical CPU cores.
- **Memory Consumption**: Memory RSS scaled predictably from 79 MB at idle/low load to 222 MB during the 500-vehicle stage under continuous telemetry streaming.
- **Buffer Drain**: The batch flush mechanism (`BATCH_FLUSH_MS = 2000`) drained to 0 queue depth between flushes without accumulating a backlog.
