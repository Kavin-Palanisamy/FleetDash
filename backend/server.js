import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/sockets/socket.js';
import { startFlushTimer, stopFlushTimer, flush } from './src/services/telemetryBuffer.js';
import { startOfflineMonitor, stopOfflineMonitor } from './src/services/offlineMonitor.js';
import { loadVehicles } from './src/services/vehicleCache.js';
import { logger } from './src/utils/logger.js';
import { metrics } from './src/services/metrics.js';

// Top-level crash guards
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught exception:', err.stack || err);
  metrics.incrementErrors();
});

process.on('unhandledRejection', (reason) => {
  logger.error('CRITICAL: Unhandled promise rejection:', reason);
  metrics.incrementErrors();
});

await connectDB();
await loadVehicles();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin } });
initSocket(io);
app.set('io', io);

startFlushTimer();
startOfflineMonitor(io);

server.listen(env.port, () => logger.info(`FleetDash backend listening on :${env.port}`));

// Graceful shutdown
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop background interval timers
  stopFlushTimer();
  stopOfflineMonitor();

  // 2. Perform final flush of remaining telemetry in buffer
  try {
    logger.info('Flushing remaining telemetry buffer...');
    await flush();
  } catch (err) {
    logger.error('Error during final telemetry flush:', err.message);
  }

  // 3. Close incoming socket connections & HTTP server
  io.close(() => logger.info('Socket.IO closed'));
  server.close(async () => {
    logger.info('HTTP server closed');
    // 4. Disconnect database
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected cleanly');
    } catch (err) {
      logger.error('Error disconnecting MongoDB:', err.message);
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown hangs beyond 10s
  setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

