import { logger } from '../utils/logger.js';
import { getAllVehicles } from '../services/vehicleCache.js';
import Alert from '../models/Alert.js';
import { metrics } from '../services/metrics.js';

export function initSocket(io) {
  io.on('connection', async (socket) => {
    metrics.incrementSockets();
    logger.info('Dashboard client connected:', socket.id);

    try {
      // Fetch current vehicles and the latest 50 alerts for initial snapshot
      const vehicles = getAllVehicles();
      let alerts = [];
      try {
        alerts = await Alert.find().sort({ createdAt: -1 }).limit(50).lean();
      } catch (err) {
        logger.warn('Could not fetch alerts for snapshot:', err.message);
      }

      socket.emit('fleet:snapshot', {
        vehicles,
        alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Error emitting fleet:snapshot:', err.message);
    }

    socket.on('disconnect', (reason) => {
      metrics.decrementSockets();
      logger.info(`Dashboard client disconnected (${socket.id}):`, reason);
    });
  });
}

