import mongoose from 'mongoose';
const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true }, // e.g. BUS101
  name: { type: String, required: true },
  type: { type: String, default: 'bus' },
  speedLimit: { type: Number, default: 80 }, // km/h
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: Date,
  lastLocation: { lat: Number, lng: Number },
  lastSpeed: Number,
}, { timestamps: true });
export default mongoose.model('Vehicle', vehicleSchema);
