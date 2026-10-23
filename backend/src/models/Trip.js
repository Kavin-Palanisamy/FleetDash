import mongoose from 'mongoose';
const tripSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  startTime: Date,
  endTime: Date,
  distanceKm: { type: Number, default: 0 },
  maxSpeed: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });
tripSchema.index({ vehicleId: 1, startTime: -1 });
export default mongoose.model('Trip', tripSchema);
