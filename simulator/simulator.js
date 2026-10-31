// Simulates N buses driving around Salem, TN and POSTing telemetry. Node 18+ (built-in fetch).
const API = process.env.API_URL || 'http://localhost:5000/api/telemetry';
const KEY = process.env.API_KEY || 'change-me';
const COUNT = Number(process.env.VEHICLES || 5);
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 2000);
const TEST_OFFLINE = process.env.TEST_OFFLINE === 'true';

const buses = Array.from({ length: COUNT }, (_, i) => ({
  vehicleId: `BUS${101 + i}`,
  lat: 11.66 + Math.random() * 0.05,
  lng: 78.14 + Math.random() * 0.05,
  speed: 40 + Math.random() * 30,
  heading: Math.floor(Math.random() * 360),
  fuelLevel: 80 + Math.floor(Math.random() * 20),
  isPaused: false,
}));

// Optional: every 45s, pause one random vehicle for 20s to test offline alerts
if (TEST_OFFLINE && COUNT > 1) {
  setInterval(() => {
    const target = buses[Math.floor(Math.random() * buses.length)];
    target.isPaused = true;
    console.log(`[Simulator] Pausing telemetry for ${target.vehicleId} to trigger offline alert...`);
    setTimeout(() => {
      target.isPaused = false;
      console.log(`[Simulator] Resuming telemetry for ${target.vehicleId}...`);
    }, 20_000);
  }, 45_000);
}

async function send(b) {
  if (b.isPaused) return;

  // 15% probability of intentional speed burst to trigger overspeed alerts (>80 km/h)
  const burst = Math.random() < 0.15;
  if (burst) {
    b.speed = 85 + Math.random() * 20; // 85 - 105 km/h
  } else {
    b.speed = Math.max(0, Math.min(80, b.speed + (Math.random() - 0.5) * 10));
  }

  b.heading = (b.heading + Math.floor((Math.random() - 0.5) * 20) + 360) % 360;
  b.lat += Math.cos((b.heading * Math.PI) / 180) * 0.0004;
  b.lng += Math.sin((b.heading * Math.PI) / 180) * 0.0004;
  b.fuelLevel = Math.max(5, b.fuelLevel - 0.01);

  const body = {
    vehicleId: b.vehicleId,
    timestamp: new Date().toISOString(),
    lat: Number(b.lat.toFixed(6)),
    lng: Number(b.lng.toFixed(6)),
    speed: Number(b.speed.toFixed(1)),
    heading: b.heading,
    fuelLevel: Number(b.fuelLevel.toFixed(1)),
  };

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Simulator] ${b.vehicleId} HTTP ${res.status}:`, err);
    }
  } catch (e) {
    console.error(`[Simulator] ${b.vehicleId} network error:`, e.message);
  }
}

setInterval(() => buses.forEach(send), INTERVAL_MS);
console.log(`[Simulator] Simulating ${COUNT} vehicles every ${INTERVAL_MS}ms to ${API} (offline tests: ${TEST_OFFLINE})`);
