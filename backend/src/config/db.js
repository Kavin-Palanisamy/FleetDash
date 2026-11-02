import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export async function connectDB() {
  // Opt-in in-memory database for ephemeral testing without a local MongoDB service
  if (env.useInMemoryDb) {
    logger.warn('================================================================');
    logger.warn('WARNING: Using in-memory database. All data is lost on restart.');
    logger.warn('================================================================');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      logger.info(`MongoDB connected via embedded in-memory server (${memoryUri})`);
      return;
    } catch (err) {
      logger.error('Failed to start in-memory MongoDB:', err.message);
      process.exit(1);
    }
  }

  // Standard MongoDB connection
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
    logger.info(`MongoDB connected to ${env.mongoUri}`);
  } catch (err) {
    logger.error(`Could not connect to MongoDB at ${env.mongoUri}: ${err.message}`);
    logger.error('Ensure MongoDB is running, or set USE_IN_MEMORY_DB=true in .env for development testing.');
    process.exit(1);
  }
}

export async function stopDB() {
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}
