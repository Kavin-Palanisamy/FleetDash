import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('[MemoryDB] Starting in-memory MongoDB instance on port 27017...');
const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
console.log(`[MemoryDB] Listening at: ${mongod.getUri()}`);

const shutdown = async () => {
  console.log('[MemoryDB] Stopping in-memory MongoDB...');
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

