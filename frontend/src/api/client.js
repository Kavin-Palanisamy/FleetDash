const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
export const getVehicles = () => get('/api/vehicles');
export const getVehicle = (id) => get(`/api/vehicles/${id}`);
export const getTelemetry = (id, limit = 100) => get(`/api/vehicles/${id}/telemetry?limit=${limit}`);
export const getTrips = (id) => get(`/api/vehicles/${id}/trips`);
export const getAlerts = () => get('/api/alerts');
