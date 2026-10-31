import { Router } from 'express';
import { listAlerts, resolveAlert } from '../controllers/alertController.js';

const r = Router();
r.get('/', listAlerts);
r.patch('/:id/resolve', resolveAlert);

export default r;

