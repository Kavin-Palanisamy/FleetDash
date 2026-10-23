export function validateTelemetry(req, res, next) {
  const { vehicleId, timestamp, lat, lng, speed } = req.body || {};
  const errors = [];
  if (typeof vehicleId !== 'string' || !vehicleId) errors.push('vehicleId required');
  if (Number.isNaN(Date.parse(timestamp))) errors.push('timestamp invalid');
  if (typeof lat !== 'number' || lat < -90 || lat > 90) errors.push('lat invalid');
  if (typeof lng !== 'number' || lng < -180 || lng > 180) errors.push('lng invalid');
  if (typeof speed !== 'number' || speed < 0 || speed > 300) errors.push('speed invalid');
  // TODO: reject timestamps far in the future / far in the past
  if (errors.length) return res.status(400).json({ errors });
  next();
}
