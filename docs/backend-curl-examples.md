# FleetDash Backend API Examples (cURL & PowerShell)

This guide provides practical request examples for all FleetDash REST endpoints using both `curl.exe` and PowerShell's native `Invoke-RestMethod`.

---

## 1. Health Check
Checks server status and MongoDB readiness.

**cURL:**
```bash
curl -X GET http://localhost:5000/api/health
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

---

## 2. Server Metrics
Inspect real-time telemetry counters, rolling p95 latency, buffer size, and memory usage.

**cURL:**
```bash
curl -X GET http://localhost:5000/api/metrics
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/metrics" -Method GET
```

---

## 3. Ingest Telemetry Event
Sends a live vehicle telemetry packet. Requires `x-api-key`.

**cURL:**
```bash
curl -X POST http://localhost:5000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me" \
  -d '{
    "vehicleId": "BUS101",
    "timestamp": "2026-10-31T09:00:00.000Z",
    "lat": 11.6643,
    "lng": 78.1460,
    "speed": 65.5,
    "heading": 180,
    "fuelLevel": 88
  }'
```

**PowerShell:**
```powershell
$body = @{
    vehicleId = "BUS101"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    lat       = 11.6643
    lng       = 78.1460
    speed     = 65.5
    heading   = 180
    fuelLevel = 88.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/telemetry" `
  -Method POST `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body $body
```

---

## 4. Trigger Overspeed Alert
Send an event where `speed > 80` (vehicle speedLimit).

**PowerShell:**
```powershell
$overspeedBody = @{
    vehicleId = "BUS101"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    lat       = 11.6650
    lng       = 78.1470
    speed     = 95.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/telemetry" `
  -Method POST `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body $overspeedBody
```

---

## 5. Send Duplicate / Older Timestamp (Ignored)
Send an event with an older timestamp to verify deduplication.

**PowerShell:**
```powershell
$oldBody = @{
    vehicleId = "BUS101"
    timestamp = "2026-10-30T10:00:00.000Z"
    lat       = 11.66
    lng       = 78.14
    speed     = 40.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/telemetry" `
  -Method POST `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body $oldBody
# Response: { "ignored": true }
```

---

## 6. List Vehicles
Retrieve all vehicles with their current in-memory status.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles" -Method GET
```

---

## 7. Get Vehicle Details by ID
Retrieve current state of single vehicle.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles/BUS101" -Method GET
```

---

## 8. Query Telemetry History
Fetch recorded telemetry points, optionally bounded by date range.

**PowerShell:**
```powershell
# Latest 50 points
Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles/BUS101/telemetry?limit=50" -Method GET

# With Date Range
Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles/BUS101/telemetry?from=2026-10-31T00:00:00Z&to=2026-10-31T23:59:59Z" -Method GET
```

---

## 9. List Alerts with Filters
Fetch alerts, filter by type or resolution status.

**PowerShell:**
```powershell
# All unresolved overspeed alerts
Invoke-RestMethod -Uri "http://localhost:5000/api/alerts?type=OVERSPEED&resolved=false" -Method GET
```

---

## 10. Resolve an Alert
Mark an alert as resolved using its MongoDB ObjectId.

**PowerShell:**
```powershell
$alertId = "6adb..."
Invoke-RestMethod -Uri "http://localhost:5000/api/alerts/$alertId/resolve" -Method PATCH
```

---

## 11. Query Trip History
Retrieve completed trips for a vehicle.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles/BUS101/trips" -Method GET
```

---

## 12. Create a New Vehicle (Optional Extension)
Register a new vehicle with a custom speed limit. Requires `x-api-key`.

**PowerShell:**
```powershell
$newVehicle = @{
    vehicleId  = "TRUCK201"
    name       = "Heavy Hauler 201"
    type       = "truck"
    speedLimit = 65
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/vehicles" `
  -Method POST `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body $newVehicle
```
