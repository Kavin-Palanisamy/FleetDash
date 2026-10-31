# FleetDash REST API & WebSocket Specification

> **Note**: This API specification represents the developer's architecture proposal for the FleetDash internship project and is not an official vendor mandate.

---

## Base URL
- Local: `http://localhost:5000`

---

## Authentication
Protected endpoints require an API key passed in the request header:
```http
x-api-key: change-me
```
Constant-time cryptographic comparison (`crypto.timingSafeEqual`) is utilized to prevent side-channel timing analysis.

---

## Standard Response & Error Format
All endpoints return `application/json`.
Errors follow a consistent structure:
```json
{
  "error": "Error message describing the problem",
  "errors": ["Optional array of specific field validation errors"]
}
```

---

## Endpoints

### 1. Health Check
- **`GET /api/health`**
- **Purpose**: Liveness and MongoDB readiness probe.
- **Auth**: None
- **Responses**:
  - `200 OK` (MongoDB connected)
    ```json
    {
      "ok": true,
      "uptimeSeconds": 142,
      "mongo": "connected",
      "timestamp": "2026-10-31T09:00:00.000Z"
    }
    ```
  - `503 Service Unavailable` (MongoDB disconnected/connecting)

---

### 2. Live Performance Metrics
- **`GET /api/metrics`**
- **Purpose**: Real-time event throughput, rolling p95 latency, buffer queue size, and memory usage.
- **Auth**: None
- **Response**: `200 OK`
  ```json
  {
    "uptimeSeconds": 360,
    "timestamp": "2026-10-31T09:05:00.000Z",
    "counters": {
      "eventsReceived": 1250,
      "eventsProcessed": 1200,
      "eventsIgnored": 40,
      "eventsRejected": 10,
      "errors": 0,
      "droppedEvents": 0
    },
    "processingTimeMs": {
      "avg": 0.42,
      "p95": 1.15,
      "samplesCount": 1000
    },
    "bufferSize": 28,
    "connectedSockets": 2,
    "memory": {
      "rssMb": 64.5,
      "heapUsedMb": 32.1,
      "heapTotalMb": 48.0
    }
  }
  ```

---

### 3. List Vehicles
- **`GET /api/vehicles`**
- **Purpose**: Returns all tracked vehicles with their latest in-memory state.
- **Auth**: None
- **Response**: `200 OK`
  ```json
  [
    {
      "vehicleId": "BUS101",
      "name": "Bus 101",
      "type": "bus",
      "speedLimit": 80,
      "status": "online",
      "lastSeen": "2026-10-31T09:00:10.000Z",
      "lastLocation": { "lat": 11.6643, "lng": 78.1460 },
      "lastSpeed": 62.5,
      "heading": 180,
      "fuelLevel": 88.0
    }
  ]
  ```

---

### 4. Get Vehicle by ID
- **`GET /api/vehicles/:id`**
- **Purpose**: Get state for a single vehicle.
- **Auth**: None
- **Responses**:
  - `200 OK`: Single vehicle object.
  - `404 Not Found`: `{ "error": "Vehicle not found" }`

---

### 5. Create Vehicle (Optional Extension)
- **`POST /api/vehicles`**
- **Headers**: `x-api-key: change-me`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "vehicleId": "BUS106",
    "name": "Express Shuttle 106",
    "type": "bus",
    "speedLimit": 80
  }
  ```
- **Responses**:
  - `201 Created`: Vehicle object.
  - `400 Bad Request`: `{ "error": "speedLimit must be a number between 10 and 200" }`
  - `401 Unauthorized`: `{ "error": "Unauthorized: Invalid API key" }`
  - `409 Conflict`: `{ "error": "Vehicle BUS106 already exists" }`

---

### 6. Vehicle Telemetry History
- **`GET /api/vehicles/:id/telemetry`**
- **Query Parameters**:
  - `limit`: Integer (1-1000, default 100)
  - `from`: ISO date string (optional)
  - `to`: ISO date string (optional)
- **Response**: `200 OK` (Array sorted oldest -> newest)
  ```json
  [
    {
      "_id": "6adb...",
      "vehicleId": "BUS101",
      "timestamp": "2026-10-31T08:50:00.000Z",
      "lat": 11.662,
      "lng": 78.141,
      "speed": 55.4,
      "heading": 90,
      "fuelLevel": 85
    }
  ]
  ```

---

### 7. Vehicle Trip History
- **`GET /api/vehicles/:id/trips`**
- **Query Parameters**:
  - `limit`: Integer (1-1000, default 50)
- **Response**: `200 OK`
  ```json
  [
    {
      "_id": "6adb...",
      "vehicleId": "BUS101",
      "startTime": "2026-10-31T08:00:00.000Z",
      "endTime": "2026-10-31T08:45:00.000Z",
      "distanceKm": 24.35,
      "maxSpeed": 78.5,
      "status": "completed"
    }
  ]
  ```

---

### 8. List Alerts
- **`GET /api/alerts`**
- **Query Parameters**:
  - `limit`: Integer (1-1000, default 50)
  - `type`: String (`OVERSPEED` or `OFFLINE`)
  - `vehicleId`: String (`BUS101`)
  - `resolved`: Boolean (`true` or `false`)
- **Response**: `200 OK`
  ```json
  [
    {
      "_id": "6adb...",
      "vehicleId": "BUS101",
      "type": "OVERSPEED",
      "message": "BUS101 at 88.5 km/h (limit 80)",
      "value": 88.5,
      "limit": 80,
      "resolved": false,
      "createdAt": "2026-10-31T08:55:12.000Z"
    }
  ]
  ```

---

### 9. Resolve Alert
- **`PATCH /api/alerts/:id/resolve`**
- **Purpose**: Mark an active alert as resolved.
- **Responses**:
  - `200 OK`: Updated alert object with `resolved: true`.
  - `400 Bad Request`: `{ "error": "Invalid alert ID format" }`
  - `404 Not Found`: `{ "error": "Alert not found" }`

---

### 10. Ingest Telemetry Event
- **`POST /api/telemetry`**
- **Headers**: `x-api-key: change-me`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "vehicleId": "BUS101",
    "timestamp": "2026-10-31T09:00:00.000Z",
    "lat": 11.6643,
    "lng": 78.1460,
    "speed": 62.5,
    "heading": 180,
    "fuelLevel": 90.0
  }
  ```
- **Responses**:
  - `202 Accepted`: `{ "ok": true }` (Processed and queued for batch write)
  - `200 OK`: `{ "ignored": true }` (Duplicate or older timestamp)
  - `400 Bad Request`: `{ "errors": ["speed must be a number between 0 and 300"] }`
  - `401 Unauthorized`: `{ "error": "Unauthorized: Invalid API key" }`
  - `404 Not Found`: `{ "error": "Unknown vehicle: BUS999" }`
  - `429 Too Many Requests`: `{ "error": "Rate limit exceeded for telemetry ingest" }`

---

## Socket.IO Events

| Event Name | Direction | Payload | Description |
|:---|:---|:---|:---|
| `fleet:snapshot` | Server -> Client | `{ vehicles: [...], alerts: [...], timestamp }` | Sent immediately upon client connection |
| `telemetry:update` | Server -> Client | `{ vehicleId, timestamp, lat, lng, speed, speedLimit, status, ... }` | Broadcast on valid telemetry event |
| `alert:new` | Server -> Client | `{ _id, vehicleId, type, message, value, limit, createdAt }` | Broadcast when new alert is raised |
| `vehicle:status` | Server -> Client | `{ vehicleId, status: "online" \| "offline" }` | Broadcast on offline timeout or reconnect |
