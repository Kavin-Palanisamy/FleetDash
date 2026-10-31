import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fleetdash',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiKey: process.env.API_KEY || 'change-me',
  offlineAfterSeconds: Number(process.env.OFFLINE_AFTER_SECONDS) || 15,
  batchFlushMs: Number(process.env.BATCH_FLUSH_MS) || 2000,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 10_000,
};

