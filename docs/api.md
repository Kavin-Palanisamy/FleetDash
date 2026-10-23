# API (proposed, not official requirements)
| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | server check |
| GET | /api/vehicles | list vehicles + latest state |
| GET | /api/vehicles/:id | one vehicle |
| GET | /api/vehicles/:id/telemetry?limit=100 | history |
| GET | /api/vehicles/:id/trips | trip history |
| GET | /api/alerts | recent alerts |
| POST | /api/telemetry | ingest one telemetry event (needs x-api-key) |

Socket.IO events: `telemetry:update`, `alert:new`, `vehicle:status`
