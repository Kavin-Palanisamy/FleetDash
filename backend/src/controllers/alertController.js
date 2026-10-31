import mongoose from 'mongoose';
import Alert from '../models/Alert.js';

export const listAlerts = async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit) || 50;
    const limit = Math.max(1, Math.min(rawLimit, 1000));

    const filter = {};

    // Filter by alert type (e.g. OVERSPEED, OFFLINE)
    if (req.query.type) {
      filter.type = String(req.query.type).toUpperCase();
    }

    // Filter by specific vehicleId
    if (req.query.vehicleId) {
      filter.vehicleId = String(req.query.vehicleId);
    }

    // Filter by resolution status
    if (req.query.resolved !== undefined) {
      filter.resolved = req.query.resolved === 'true';
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that the provided id is a valid 24-character hex ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert ID format' });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      { resolved: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (err) {
    next(err);
  }
};


