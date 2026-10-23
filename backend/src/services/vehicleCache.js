import Vehicle from '../models/Vehicle.js';
import { logger } from '../utils/logger.js';
// In-memory copy of vehicles so we do NOT hit the DB for every telemetry event.
const vehicles = new Map(); // vehicleId -> plain object (with latest state)

export async function loadVehicles() {
  let list = await Vehicle.find().lean();
  if (list.length === 0) {
    const defaultVehicles = Array.from({ length: 5 }, (_, i) => ({
      vehicleId: `BUS${101 + i}`, name: `Bus ${101 + i}`, type: 'bus', speedLimit: 80,
    }));
    await Vehicle.insertMany(defaultVehicles);
    list = await Vehicle.find().lean();
    logger.info(`Auto-seeded ${list.length} initial vehicles`);
  }
  list.forEach((v) => vehicles.set(v.vehicleId, v));
}
export const getVehicle = (id) => vehicles.get(id);
export const getAllVehicles = () => [...vehicles.values()];
export const setVehicle = (id, v) => vehicles.set(id, v);
