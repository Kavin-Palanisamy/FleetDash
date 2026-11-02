# FleetDash — Event-Driven Fleet Telemetry Dashboard

Event-driven fleet telemetry platform developed during a 1-month internship project at Infotact Solutions. The backend receives telemetry from moving vehicles, validates and processes events in memory, raises real-time overspeed/offline alerts, buffers telemetry for batch insertion into MongoDB, and broadcasts updates via Socket.IO. Benchmarked on a local developer machine up to 500 concurrent simulated vehicles and ~478 events/second.

```
fleetdash/
├── backend/     Node.js + Express + Socket.IO + MongoDB (port 5000)
├── frontend/    React (Vite) + Leaflet + Recharts      (port 5173)
├── simulator/   Vehicle telemetry generator + load testing tool
└── docs/        Architecture, API spec, test plan, cURL examples, demo script
```

---

## Backend Features
- **Zero Per-Event DB Writes**: Telemetry updates in-memory vehicle cache instantly. History is held in a batch buffer and flushed every `BATCH_FLUSH_MS` (2s) via `insertMany` and `bulkWrite`.
- **Strict Validation**: ISO-8601 timestamps (bounded within future 5m and past 24h), `Number.isFinite` coordinate/speed checks to reject `NaN`, and max 50 char `vehicleId`.
- **Security**: `helmet`, constant-time API key verification (`crypto.timingSafeEqual`), and configurable rate limiting on telemetry ingestion.
- **Configurable Database Mode**: Defaults to a standard MongoDB connection (`MONGO_URI`). An optional ephemeral in-memory database (`mongodb-memory-server`) can be enabled for testing via `USE_IN_MEMORY_DB=true`.
- **Real-Time Broadcaster**: Socket.IO events (`telemetry:update`, `alert:new`, `vehicle:status`) and connection snapshot (`fleet:snapshot`).
- **Offline Detection**: Automatically flags inactive vehicles as offline after `OFFLINE_AFTER_SECONDS` (15s default) and raises an alert.
- **Trip Tracking**: In-memory distance calculation (Haversine formula) and max speed tracking; auto-persists completed trips when stationary for 2 minutes or offline.
- **Real Performance Metrics**: `GET /api/metrics` endpoint reporting true event counters, rolling p95 latency, buffer queue depth, and memory RSS.
- **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM`, stops timers, flushes remaining buffer to MongoDB, closes sockets/HTTP server, and disconnects database cleanly.

---

## Configuration & Notes

### Database Configuration (`USE_IN_MEMORY_DB`)
- **Default (`USE_IN_MEMORY_DB=false`)**: The backend connects to the MongoDB instance specified in `MONGO_URI` (default: `mongodb://127.0.0.1:27017/fleetdash`). If MongoDB is unreachable, the server exits immediately with a clear diagnostic message.
- **Testing Opt-In (`USE_IN_MEMORY_DB=true`)**: If set to `true`, the backend boots an embedded in-memory database using `mongodb-memory-server` (installed in `devDependencies`). It displays a clear warning: *"Using in-memory database. All data is lost on restart."*
- **CLI In-Memory DB (`npm run mem-db`)**: To share an in-memory database across multiple separate processes (such as running `npm run seed` in one terminal and `node server.js` in another), run `npm run mem-db` in `backend/` to host an in-memory MongoDB instance on port 27017.

### Rate Limiting & Load Testing (`RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`)
- Ingest requests are protected by `express-rate-limit` (default: 10,000 requests per 60 seconds per IP).
- **Important**: When running the simulator or multi-vehicle load test (`simulator/loadTest.js`), all requests originate from `127.0.0.1`. At 200 or 500 vehicles, traffic exceeds standard per-IP limits and returns HTTP 429 errors.
- For load testing, disable the rate limiter with `$env:RATE_LIMIT_ENABLED="false"` or raise `RATE_LIMIT_MAX` in `.env`. The load test tool automatically tracks and reports HTTP 429 responses separately from other errors.

---

## Quickstart

### 1. Backend Setup & Run
```bash
cd backend
cp .env.example .env
npm install

# Seed vehicles (default 5; accepts optional count argument, e.g. 50 or 500)
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
# Make sure RATE_LIMIT_ENABLED=false is set on the backend during test
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
- [System Architecture](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/architecture.md)
- [API Specification](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/api.md)
- [Test Plan & Load Test Results](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/test-plan.md)
- [cURL & PowerShell Examples](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/backend-curl-examples.md)
- [Mentor Demo Walkthrough Script](file:///c:/Users/kavin/Downloads/fleetdash/fleetdash/docs/backend-demo-script.md)
