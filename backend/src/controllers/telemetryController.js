import { processTelemetry } from '../services/telemetryProcessor.js';
export const ingestTelemetry = async (req, res, next) => {
  try {
    const result = await processTelemetry(req.app.get('io'), req.body);
    res.status(result.ignored ? 200 : 202).json(result);
  } catch (err) { next(err); }
};
