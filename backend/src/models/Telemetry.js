import mongoose from 'mongoose';
const telemetrySchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  speed: { type: Number, required: true, min: 0 },
  heading: Number,
  fuelLevel: Number,
}, { versionKey: false });
telemetrySchema.index({ vehicleId: 1, timestamp: -1 });
// TODO (Week 4): optional TTL index to auto-delete old data, e.g. 7 days
// telemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
export default mongoose.model('Telemetry', telemetrySchema);
