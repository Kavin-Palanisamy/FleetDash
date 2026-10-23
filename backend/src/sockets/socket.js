import { logger } from '../utils/logger.js';
export function initSocket(io) {
  io.on('connection', (socket) => {
    logger.info('dashboard connected', socket.id);
    socket.on('disconnect', () => logger.info('dashboard disconnected', socket.id));
    // TODO: rooms per vehicle, e.g. socket.join(`vehicle:${id}`)
  });
}
