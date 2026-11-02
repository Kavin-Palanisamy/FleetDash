# FleetDash Backend — 5-Minute Mentor Demo Script

This document provides a structured, step-by-step PowerShell guide for presenting the FleetDash backend to your mentor or internship evaluator in ~5 minutes.

---

## Preparation & Layout

Open **3 PowerShell windows** side-by-side:
- **Terminal 1 (Backend Host)**: Used to run database and backend server.
- **Terminal 2 (Simulator)**: Used to generate vehicle telemetry or run load tests.
- **Terminal 3 (REST & Probe Terminal)**: Used to send test cURLs / `Invoke-RestMethod` queries.

Ensure dependencies are installed:
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\backend
npm install
cd ..\simulator
npm install
```

---

## Demo Step-by-Step Walkthrough

### Step 1: Start MongoDB
*Show that the database environment is ready.*

**Terminal 1:**
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\backend
# If you have local MongoDB installed and running as a Windows service, skip this command.
# Otherwise, use our in-memory MongoDB runner on port 27017:
npm run mem-db
```
- **What to point at**: Console output stating MongoDB is listening on `127.0.0.1:27017`.
- **What to say**: *"We have MongoDB running on standard port 27017, either as a system service or using our standalone dev-runner."*

---

### Step 2: Seed Fleet Vehicles
*Initialize the fleet in MongoDB.*

**Terminal 3:**
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\backend
npm run seed -- 5
```
- **What to point at**: Console shows 5 seeded vehicles (`BUS101` through `BUS105`) with designated speed limits (80 km/h).
- **What to say**: *"Our seed script creates the fleet records in MongoDB and sets up baseline coordinates and speed limits."*

---

### Step 3: Start the Backend Server
*Show startup logs and cache initialization.*

**Terminal 1** (or a separate tab if `mem-db` is running in Terminal 1):
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\backend
# Start with rate limiting disabled for smooth demo & load testing:
$env:RATE_LIMIT_ENABLED="false"
node server.js
```
- **What to point at**:
  1. `[DB] Connected to MongoDB at ...`
  2. `[VehicleCache] Pre-warmed cache with 5 vehicles from DB`
  3. `[Server] FleetDash backend running on port 5000`
- **What to say**: *"When the server boots, it connects to MongoDB and pre-warms our in-memory vehicle cache so incoming telemetry never needs to perform read queries against the database."*

---

### Step 4: Verify Readiness Probe (`/api/health`)
*Demonstrate health monitoring.*

**Terminal 3:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET | ConvertTo-Json
```
- **What to point at**: `"ok": true`, `"mongo": "connected"`, and server uptime.
- **What to say**: *"Our `/api/health` endpoint acts as a readiness probe, confirming that the HTTP server is alive and MongoDB is actively connected."*

---

### Step 5: Start Simulator & Inspect Real Performance Metrics (`/api/metrics`)
*Demonstrate the high-efficiency ingestion pipeline and batch buffer.*

**Terminal 2 (Start Telemetry Stream):**
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\simulator
npm start
```

**Terminal 3 (Inspect Live Metrics):**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/metrics" -Method GET | ConvertTo-Json
```
- **What to point at**:
  - `counters.eventsReceived` and `counters.eventsProcessed` incrementing smoothly.
  - `processingTimeMs.avg` and `processingTimeMs.p95`: Point out that server-side processing is **under 1 millisecond** (typically ~0.2 to 0.5 ms).
  - `bufferSize`: Shows items buffering in RAM and flushing every 2 seconds via `insertMany` rather than per-event DB writes.
- **What to say**: *"Vehicles transmit GPS data every second. Notice in our `/api/metrics` endpoint that server processing takes less than 1 millisecond per packet because events update the RAM cache instantly while batch writes are aggregated every 2 seconds."*

---

### Step 6: Trigger an Overspeed Alert
*Demonstrate real-time business rule evaluation and cooldowns.*

**Terminal 3:**
```powershell
$overspeed = @{
    vehicleId = "BUS101"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    lat       = 11.6643
    lng       = 78.1460
    speed     = 95.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/telemetry" `
  -Method POST `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body $overspeed
```
- **What to point at**:
  - Terminal 1 logs: `[WARN] OVERSPEED alert created for BUS101: 95.0 km/h (limit: 80 km/h)`.
  - Immediate `alert:new` broadcast via Socket.IO.
- **What to say**: *"Because BUS101 has a speed limit of 80 km/h, injecting a 95 km/h telemetry point immediately triggers an OVERSPEED alert. A 30-second per-vehicle cooldown prevents alert flooding."*

---

### Step 7: Inspect Alerts via REST API (`GET /api/alerts`)
*Show persisted alerts.*

**Terminal 3:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/alerts" -Method GET | ConvertTo-Json
```
- **What to point at**: Array showing the `OVERSPEED` alert with its MongoDB `_id`, vehicle details, speed value, and `"resolved": false`.
- **What to say**: *"Alerts are stored in MongoDB and queryable via `/api/alerts`, with filter parameters for vehicle ID, alert type, and resolution status."*

---

### Step 8: Trigger Offline Detection
*Demonstrate background heartbeat monitoring.*

**Terminal 2:**
Stop the simulator by pressing `Ctrl + C`.

Wait 15 seconds (the default `OFFLINE_AFTER_SECONDS`).

- **What to point at**:
  - Terminal 1 logs: `[WARN] Vehicle BUS101 is offline (silent for > 15s)`.
  - Broadcast of `vehicle:status` offline and an `OFFLINE` alert saved to MongoDB.
- **What to say**: *"Our background offline monitor runs every 5 seconds. When a vehicle goes silent for more than 15 seconds, it automatically transitions the vehicle to offline, completes any active trip, and fires an alert."*

---

### Step 9: Resolve an Alert (`PATCH /api/alerts/:id/resolve`)
*Demonstrate alert lifecycle resolution.*

**Terminal 3:**
```powershell
$alerts = Invoke-RestMethod -Uri "http://localhost:5000/api/alerts?resolved=false" -Method GET
$targetId = $alerts[0]._id

Invoke-RestMethod -Uri "http://localhost:5000/api/alerts/$targetId/resolve" -Method PATCH | ConvertTo-Json
```
- **What to point at**: The returned alert now has `"resolved": true` and a timestamp in `"resolvedAt"`.
- **What to say**: *"Dispatchers can resolve alerts with a PATCH request, updating the database record and alerting connected dashboard clients."*

---

### Step 10: Run the Multi-Stage Load Test
*Show measured system scalability and stability.*

**Terminal 2:**
```powershell
cd c:\Users\kavin\Downloads\fleetdash\fleetdash\simulator
# Run a quick 10-second-per-stage load test across 5, 50, 200, and 500 vehicles:
$env:STAGES="5,50,200,500"
$env:STAGE_DURATION_SEC="10"
node loadTest.js
```
- **What to point at**:
  - The formatted test results table showing progression through 5, 50, 200, and 500 vehicles.
  - **429 Count**: `0`
  - **Other Errors**: `0` (0% error rate).
  - **Server p95 Processing Time**: remains under 1 ms (~0.2 to 0.4 ms).
  - **Throughput**: ~478 events/sec sustained.
- **What to say**: *"Under our multi-stage load test up to 500 simulated vehicles, the backend maintained a 0% error rate and sub-millisecond server processing time, batching up to 478 events per second."*

---

## Questions I Should Expect and Honest Answers

### 1. What are the limits of this single Node.js instance architecture?
> **Honest Answer**:
> *"Node.js operates on a single-threaded event loop. In our load tests, server processing time remained extremely low (under 1 ms), but client-observed round-trip latency grew from 41 ms at 5 vehicles to 578 ms at 500 vehicles. This occurs because HTTP socket connections queue up in the OS networking stack before reaching the event loop on our 4-core machine. To scale beyond 500 to 1,000 vehicles, we would use Node.js cluster mode or multi-container deployments behind an NGINX reverse proxy, paired with a Redis pub/sub adapter for Socket.IO."*

### 2. What happens if the server crashes or loses power with data in the batch buffer?
> **Honest Answer**:
> *"Our graceful shutdown handlers (`SIGINT` and `SIGTERM`) intercept normal stops and flush remaining buffered events to MongoDB before exiting. However, in the event of an ungraceful crash (such as `SIGKILL`, hardware power outage, or OS crash), up to 2 seconds (`BATCH_FLUSH_MS`) of in-memory buffered telemetry (roughly 1,000 events at peak load) could be lost. In an enterprise telematics production system where zero data loss is mandatory, incoming raw telemetry packets would be written immediately to a persistent write-ahead log or an external queue like Kafka before ingestion."*

### 3. Why didn't you use Redis or Kafka in the base design?
> **Honest Answer**:
> *"For a 1-month internship project running locally, external message brokers like Kafka (which requires ZooKeeper or KRaft) and Redis introduce significant infrastructure setup and operational overhead that would obscure core full-stack software fundamentals. Our design pattern—combining an in-memory Map for instantaneous reads with a batched `insertMany` write buffer—proves that a clean Node.js backend can comfortably process 478 events per second on a standard laptop without third-party brokers. We treat Kafka and Redis as natural evolution steps for horizontal scaling rather than hard dependencies for our prototype."*

### 4. Why did you use an API key instead of JWT for vehicle authentication?
> **Honest Answer**:
> *"Telematics devices and GPS trackers are headless, machine-to-machine embedded clients. They do not have interactive human users logging in with usernames, passwords, or refresh tokens. A pre-shared static API key stored in device firmware and validated on the backend using constant-time comparison (`crypto.timingSafeEqual`) is the industry-standard security pattern for IoT telemetry ingest. JWTs are appropriate for our dashboard dispatchers and human web users, which would be implemented at the API gateway layer."*
