import Alert from '../models/Alert.js';
export const listAlerts = async (req, res) => {
  res.json(await Alert.find().sort({ createdAt: -1 }).limit(Number(req.query.limit) || 50).lean());
};
