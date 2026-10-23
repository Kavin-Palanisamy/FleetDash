import { Router } from 'express';
import { ingestTelemetry } from '../controllers/telemetryController.js';
import { requireApiKey } from '../middleware/auth.js';
import { validateTelemetry } from '../middleware/validate.js';
const r = Router();
r.post('/', requireApiKey, validateTelemetry, ingestTelemetry);
export default r;
