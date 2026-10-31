# FleetDash — Event-Driven Fleet Telemetry Dashboard

High-throughput, event-driven fleet telemetry platform developed during the 1-month internship project at Infotact Solutions. The backend receives telemetry from moving vehicles, validates and processes events in memory, raises real-time overspeed/offline alerts, buffers telemetry for batch insertion into MongoDB, and broadcasts updates via Socket.IO.

```
fleetdash/
├── backend/     Node.js + Express + Socket.IO + MongoDB (port 5000)
├── frontend/    React (Vite) + Leaflet + Recharts      (port 5173)
├── simulator/   Vehicle telemetry generator + load testing tool
└── docs/        Architecture, API spec, test plan, cURL examples
```

---

## Backend Features
- **Zero Per-Event DB Writes**: Telemetry updates in-memory vehicle cache instantly. History is held in a batch buffer and flushed every `BATCH_FLUSH_MS` (2s) via `insertMany` and `bulkWrite`.
- **Strict Validation**: ISO-8601 timestamps (bounded within future 5m and past 24h), `Number.isFinite` coordinate/speed checks to reject `NaN`, and max 50 char `vehicleId`.
- **Security**: `helmet`, constant-time API key verification (`crypto.timingSafeEqual`), and configurable rate limiting on telemetry ingestion.
- **Embedded DB Fallback**: Automatically spins up an embedded in-memory MongoDB (`mongodb-memory-server`) if a local MongoDB instance is not running on port 27017.
- **Real-Time Broadcaster**: Socket.IO events (`telemetry:update`, `alert:new`, `vehicle:status`) and connection snapshot (`fleet:snapshot`).
- **Offline Detection**: Automatically flags inactive vehicles as offline after `OFFLINE_AFTER_SECONDS` (15s default) and raises an alert.
- **Trip Tracking**: In-memory distance calculation (Haversine formula) and max speed tracking; auto-persists completed trips when stationary for 2 minutes or offline.
- **Real Performance Metrics**: `GET /api/metrics` endpoint reporting true event counters, rolling p95 latency, buffer queue depth, and memory RSS.
- **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM`, stops timers, flushes remaining buffer to MongoDB, closes sockets/HTTP server, and disconnects database cleanly.

---

## Quickstart

### 1. Backend Setup & Run
```bash
cd backend
cp .env.example .env
npm install

# Seed vehicles (default 5; accepts optional count argument, e.g. 50)
npm run seed -- 5

# Start backend server
npm run dev
# Or production mode:
npm start
```
*Backend runs on `http://localhost:5000`.*

### 2. Run Tests
The backend test suite uses Node.js built-in `node:test` runner with fast in-memory mocks:
```bash
cd backend
npm test
```

### 3. Simulator & Load Testing
```bash
# Continuous vehicle telemetry simulation:
cd simulator
npm start

# Run multi-stage load test (ramps through 5, 50, 200, 500 vehicles):
node loadTest.js
```

### 4. Frontend (Separate Terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## Documentation
- [API Specification](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/api.md)
- [System Architecture](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/architecture.md)
- [Test Plan](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/test-plan.md)
- [cURL & PowerShell Examples](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/backend-curl-examples.md)
