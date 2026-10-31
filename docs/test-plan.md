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
