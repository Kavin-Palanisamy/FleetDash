import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
