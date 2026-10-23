import { Router } from 'express';
import { listAlerts } from '../controllers/alertController.js';
const r = Router();
r.get('/', listAlerts);
export default r;
