# FleetDash — Event-Driven Fleet Telemetry Dashboard

Skeleton project. Every file that the final project needs exists here; most contain
only a minimal working version plus `TODO` comments. We fill them in week by week.

```
fleetdash/
├── backend/     Node.js + Express + Socket.IO + MongoDB (port 5000)
├── frontend/    React (Vite) + Leaflet + Recharts      (port 5173)
├── simulator/   Fake vehicles that send telemetry + load test
└── docs/        Architecture, API, test plan, mentor questions
```

## Run (after installing Node.js 20+ and MongoDB)
```bash
# 1. backend
cd backend && cp .env.example .env && npm install && npm run seed && npm run dev
# 2. frontend (new terminal)
cd frontend && cp .env.example .env && npm install && npm run dev
# 3. simulator (new terminal)
cd simulator && npm install && npm start
```
Open http://localhost:5173

## Weekly plan
- Week 1: docs/, project setup, frontend layout
- Week 2: backend REST API, models, simulator
- Week 3: Socket.IO, map, alerts, offline detection
- Week 4: tests, load test, docs, presentation
