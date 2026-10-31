# FleetDash Backend Architecture

> **Note**: This architecture document represents the engineering design and implementation for the FleetDash telemetry platform.

---

## High-Level System Architecture

```text
[ Vehicles / Simulator ]
         │ (HTTP POST /api/telemetry with x-api-key)
         ▼
[ Rate Limiter & Helmet ]
         │
         ▼
[ Constant-Time API Key Auth ]
         │
         ▼
[ Strict Payload Validation ] ──(Invalid)──> 400 Bad Request + Metrics.incrementRejected()
         │ (Valid)
         ▼
[ Telemetry Processor ]
    ├── 1. In-Memory Vehicle Cache (instant read/write, zero DB overhead)
    ├── 2. Duplicate / Out-of-Order Check (ts <= lastSeen -> 200 ignored)
    ├── 3. Status Transition (Offline -> Online -> emit 'vehicle:status')
    ├── 4. Active Trip Service (accumulates Haversine distance & maxSpeed in memory)
    ├── 5. Overspeed Rule Engine (speed > limit -> 30s Cooldown -> persist Alert -> emit 'alert:new')
    ├── 6. Telemetry Batch Buffer (in-memory queue, max 10,000 capacity)
    ├── 7. Real-Time Broadcaster (Socket.IO emit 'telemetry:update')
    └── 8. Performance Metrics (records event count and rolling p95 latency)

                     │ Every BATCH_FLUSH_MS (2000ms)
                     ▼
             [ Batch Writer ]
       ├── Telemetry.insertMany(batch)
       └── Vehicle.bulkWrite(latestState)
                     │
                     ▼
             [ MongoDB Database ]
```

---

## Core Architectural Decisions

### 1. Zero Per-Event Database Writes
- **Problem**: Writing to disk/database for every incoming GPS tick saturates connection pools and creates massive I/O bottlenecks under high vehicle concurrency.
- **Solution**:
  - **Latest Vehicle State**: Kept in an in-memory `Map` (`vehicleCache.js`). All dashboard reads (`GET /api/vehicles`) serve directly from RAM in sub-millisecond time.
  - **Telemetry History**: Appended to an in-memory batch buffer (`telemetryBuffer.js`). Every 2 seconds (`BATCH_FLUSH_MS`), a single atomic `insertMany` write flushes up to hundreds of events in one roundtrip.
  - **Alerts**: Alerts are rare and critical, so they are saved immediately to MongoDB and broadcast via Socket.IO.

### 2. Resilient Flush & Memory Bounding
- **Concurrency Mutex**: An `isFlushing` guard prevents concurrent flush operations when database write latency spikes.
- **Retry Mechanism**: If MongoDB is unreachable, the unwritten batch is prepended back into the queue for the next interval instead of being discarded.
- **Hard Memory Limit**: The buffer is capped at 10,000 entries. If the database remains offline long enough to exceed the cap, oldest events are dropped with logged warnings and tracked via `metrics.droppedEvents`.

### 3. Trips Engine (`tripService.js`)
- Trips are tracked entirely in memory while vehicles are driving.
- Distance is computed via the Haversine formula (`distanceKm` in `geo.js`).
- A trip starts on the first event where `speed > 0`.
- A trip completes and is persisted to MongoDB when the vehicle remains stationary (`speed === 0`) for $\ge$ 2 minutes, or when marked offline.

### 4. Background Offline Monitor (`offlineMonitor.js`)
- A background timer polls every 5 seconds.
- Any vehicle whose `lastSeen` timestamp is older than `OFFLINE_AFTER_SECONDS` (15s default) is transitioned to `offline`.
- Broadcasts `vehicle:status` offline, creates an `OFFLINE` alert, and completes active trips.
- When the vehicle starts transmitting again, `telemetryProcessor` immediately broadcasts `vehicle:status` online.

### 5. Graceful Teardown
On `SIGINT` or `SIGTERM`:
1. Background flush and monitoring timers are cleared.
2. In-flight telemetry buffers are flushed to MongoDB.
3. Socket.IO and HTTP listeners are closed.
4. MongoDB connection is terminated cleanly.
