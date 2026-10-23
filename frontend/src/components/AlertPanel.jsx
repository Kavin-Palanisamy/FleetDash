import { useFleet } from '../context/FleetContext.jsx';
import { fmtTime } from '../utils/format.js';
export default function AlertPanel({ limit = 8 }) {
  const { alerts } = useFleet();
  return (
    <div className="card">
      <h3>Alerts</h3>
      {alerts.length === 0 && <p>No alerts yet.</p>}
      {alerts.slice(0, limit).map((a, i) => (
        <p key={a._id || i}><span className={`badge ${a.type === 'OVERSPEED' ? 'warn' : 'off'}`}>{a.type}</span> {a.message} <small>{fmtTime(a.createdAt)}</small></p>
      ))}
    </div>
  );
}
