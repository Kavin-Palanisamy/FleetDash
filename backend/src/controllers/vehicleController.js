import Vehicle from '../models/Vehicle.js';
import Telemetry from '../models/Telemetry.js';
import Trip from '../models/Trip.js';
import { getAllVehicles, getVehicle } from '../services/vehicleCache.js';

export const listVehicles = (req, res) => res.json(getAllVehicles());
export const getVehicleById = async (req, res) => {
  const v = getVehicle(req.params.id) || await Vehicle.findOne({ vehicleId: req.params.id }).lean();
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(v);
};
export const getVehicleTelemetry = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const data = await Telemetry.find({ vehicleId: req.params.id }).sort({ timestamp: -1 }).limit(limit).lean();
  res.json(data.reverse());
};
export const getVehicleTrips = async (req, res) => {
  res.json(await Trip.find({ vehicleId: req.params.id }).sort({ startTime: -1 }).limit(50).lean());
};
