import mongoose from 'mongoose';
const alertSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  type: { type: String, enum: ['OVERSPEED', 'OFFLINE'], required: true },
  message: String,
  value: Number,
  limit: Number,
  resolved: { type: Boolean, default: false },
}, { timestamps: true });
alertSchema.index({ createdAt: -1 });
export default mongoose.model('Alert', alertSchema);
