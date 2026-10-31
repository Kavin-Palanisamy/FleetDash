import Vehicle from '../models/Vehicle.js';
import Telemetry from '../models/Telemetry.js';
import Trip from '../models/Trip.js';
import { getAllVehicles, getVehicle, setVehicle } from '../services/vehicleCache.js';


export const listVehicles = (req, res) => res.json(getAllVehicles());

export const getVehicleById = async (req, res, next) => {
  try {
    // Check in-memory cache first for fast response, fall back to DB if missing
    const v = getVehicle(req.params.id) || await Vehicle.findOne({ vehicleId: req.params.id }).lean();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(v);
  } catch (err) {
    next(err);
  }
};

export const getVehicleTelemetry = async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit) || 100;
    const limit = Math.max(1, Math.min(rawLimit, 1000));

    const filter = { vehicleId: req.params.id };

    // Validate and apply optional date range filters
    if (req.query.from || req.query.to) {
      filter.timestamp = {};

      if (req.query.from) {
        if (Number.isNaN(Date.parse(req.query.from))) {
          return res.status(400).json({ error: 'Invalid "from" date parameter' });
        }
        filter.timestamp.$gte = new Date(req.query.from);
      }

      if (req.query.to) {
        if (Number.isNaN(Date.parse(req.query.to))) {
          return res.status(400).json({ error: 'Invalid "to" date parameter' });
        }
        filter.timestamp.$lte = new Date(req.query.to);
      }
    }

    // Retrieve newest events first up to limit, then reverse so output is sorted oldest -> newest
    const data = await Telemetry.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json(data.reverse());
  } catch (err) {
    next(err);
  }
};

export const getVehicleTrips = async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit) || 50;
    const limit = Math.max(1, Math.min(rawLimit, 1000));
    const trips = await Trip.find({ vehicleId: req.params.id })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    res.json(trips);
  } catch (err) {
    next(err);
  }
};

// Optional: create a new vehicle in database and update in-memory cache
export const createVehicle = async (req, res, next) => {
  try {
    const { vehicleId, name, type, speedLimit } = req.body || {};

    if (typeof vehicleId !== 'string' || !vehicleId.trim()) {
      return res.status(400).json({ error: 'vehicleId is required' });
    }

    const trimmedId = vehicleId.trim();

    // Verify speedLimit is valid if supplied
    if (speedLimit !== undefined) {
      if (typeof speedLimit !== 'number' || !Number.isFinite(speedLimit) || speedLimit < 10 || speedLimit > 200) {
        return res.status(400).json({ error: 'speedLimit must be a number between 10 and 200' });
      }
    }

    if (getVehicle(trimmedId)) {
      return res.status(409).json({ error: `Vehicle ${trimmedId} already exists` });
    }

    const vehicle = await Vehicle.create({
      vehicleId: trimmedId,
      name: (name && String(name).trim()) || trimmedId,
      type: type || 'bus',
      speedLimit: speedLimit || 80,
      status: 'offline',
    });

    const plain = vehicle.toObject();
    setVehicle(trimmedId, plain);

    res.status(201).json(plain);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Vehicle already exists' });
    }
    next(err);
  }
};


