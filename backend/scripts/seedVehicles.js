import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import Vehicle from '../src/models/Vehicle.js';

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2500 });
} catch {
  console.log('MongoDB server not running at', env.mongoUri, '- vehicles are seeded automatically by the server.');
  process.exit(0);
}
await Vehicle.deleteMany({});
const vehicles = Array.from({ length: 5 }, (_, i) => ({
  vehicleId: `BUS${101 + i}`, name: `Bus ${101 + i}`, type: 'bus', speedLimit: 80,
}));
await Vehicle.insertMany(vehicles);
console.log('Seeded', vehicles.length, 'vehicles');
await mongoose.disconnect();
