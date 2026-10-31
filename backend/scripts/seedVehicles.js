import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import Vehicle from '../src/models/Vehicle.js';

// Parse optional count argument: e.g. "npm run seed -- 50"
const rawCount = process.argv[2];
const count = Number.isInteger(Number(rawCount)) && Number(rawCount) > 0 ? Number(rawCount) : 5;
const speedLimit = Number(process.env.DEFAULT_SPEED_LIMIT) || 80;

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
} catch (err) {
  console.log(`MongoDB not running at ${env.mongoUri}. If using embedded memory DB, vehicles are seeded automatically by the server.`);
  process.exit(0);
}

try {
  const vehicles = Array.from({ length: count }, (_, i) => ({
    vehicleId: `BUS${101 + i}`,
    name: `Bus ${101 + i}`,
    type: 'bus',
    speedLimit,
    status: 'offline',
  }));

  // Idempotent upsert so running the script multiple times never crashes with E11000 duplicate key
  const ops = vehicles.map((v) => ({
    updateOne: {
      filter: { vehicleId: v.vehicleId },
      update: { $set: { name: v.name, type: v.type, speedLimit: v.speedLimit } },
      upsert: true,
    },
  }));

  await Vehicle.bulkWrite(ops);
  console.log(`Successfully seeded ${count} vehicles (speed limit: ${speedLimit} km/h).`);
} catch (err) {
  console.error('Seeding failed:', err.message);
} finally {
  await mongoose.disconnect();
}

