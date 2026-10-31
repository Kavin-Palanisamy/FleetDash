import { Router } from 'express';
import {
  listVehicles,
  getVehicleById,
  getVehicleTelemetry,
  getVehicleTrips,
  createVehicle,
} from '../controllers/vehicleController.js';
import { requireApiKey } from '../middleware/auth.js';

const r = Router();
r.get('/', listVehicles);
r.post('/', requireApiKey, createVehicle);
r.get('/:id', getVehicleById);
r.get('/:id/telemetry', getVehicleTelemetry);
r.get('/:id/trips', getVehicleTrips);

export default r;

