import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { metrics } from './services/metrics.js';
import { getBufferSize } from './services/telemetryBuffer.js';

const app = express();

// Security headers
app.use(helmet());

// CORS & JSON body parsing (capped at 100kb to mitigate DoS)
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '100kb' }));

// Health check endpoint: uptime and MongoDB state
app.get('/api/health', (req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoState = mongoStates[mongoose.connection.readyState] || 'unknown';
  const isHealthy = mongoose.connection.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    ok: isHealthy,
    uptimeSeconds: Math.floor(process.uptime()),
    mongo: mongoState,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for performance monitoring and load testing
app.get('/api/metrics', (req, res) => {
  res.json(metrics.getMetrics({ bufferSize: getBufferSize() }));
});

// API Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Centralized error handling
app.use(notFound);
app.use(errorHandler);

export default app;

