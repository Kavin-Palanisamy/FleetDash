import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2000 });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.info('Local MongoDB connection failed, starting embedded in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      logger.info(`MongoDB connected via embedded in-memory server (${memoryUri})`);
    } catch (fallbackErr) {
      logger.error('MongoDB connection failed completely', fallbackErr.message);
      process.exit(1);
    }
  }
}
