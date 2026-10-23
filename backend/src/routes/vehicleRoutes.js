import { Router } from 'express';
import { listVehicles, getVehicleById, getVehicleTelemetry, getVehicleTrips } from '../controllers/vehicleController.js';
const r = Router();
r.get('/', listVehicles);
r.get('/:id', getVehicleById);
r.get('/:id/telemetry', getVehicleTelemetry);
r.get('/:id/trips', getVehicleTrips);
export default r;
