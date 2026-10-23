export default function SpeedBadge({ speed, limit = 80 }) {
  if (speed == null) return <span className="badge off">-</span>;
  return <span className={`badge ${speed > limit ? 'warn' : 'ok'}`}>{Math.round(speed)} km/h</span>;
}
