// Simulates N buses driving around Salem, TN and POSTing telemetry. Node 18+ (built-in fetch).
const API = process.env.API_URL || 'http://localhost:5000/api/telemetry';
const KEY = process.env.API_KEY || 'change-me';
const COUNT = Number(process.env.VEHICLES || 5);
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 2000);

const buses = Array.from({ length: COUNT }, (_, i) => ({
  vehicleId: `BUS${101 + i}`, lat: 11.66 + Math.random() * 0.05, lng: 78.14 + Math.random() * 0.05,
  speed: 40 + Math.random() * 30, heading: Math.random() * 360,
}));

async function send(b) {
  b.speed = Math.max(0, Math.min(120, b.speed + (Math.random() - 0.5) * 15));
  b.heading += (Math.random() - 0.5) * 20;
  b.lat += Math.cos((b.heading * Math.PI) / 180) * 0.0004;
  b.lng += Math.sin((b.heading * Math.PI) / 180) * 0.0004;
  const body = { vehicleId: b.vehicleId, timestamp: new Date().toISOString(),
    lat: +b.lat.toFixed(6), lng: +b.lng.toFixed(6), speed: +b.speed.toFixed(1), heading: +b.heading.toFixed(0) };
  try {
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': KEY }, body: JSON.stringify(body) });
  } catch (e) { console.error(b.vehicleId, e.message); }
}
setInterval(() => buses.forEach(send), INTERVAL_MS);
console.log(`Simulating ${COUNT} vehicles every ${INTERVAL_MS}ms`);
