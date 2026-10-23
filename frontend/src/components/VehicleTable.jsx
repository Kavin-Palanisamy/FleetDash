import { Link } from 'react-router-dom';
import { useFleet } from '../context/FleetContext.jsx';
import SpeedBadge from './SpeedBadge.jsx';
import { fmtTime } from '../utils/format.js';

export default function VehicleTable() {
  const { vehicles } = useFleet();
  return (
    <table>
      <thead><tr><th>Vehicle</th><th>Status</th><th>Speed</th><th>Last seen</th></tr></thead>
      <tbody>
        {Object.values(vehicles).map((v) => (
          <tr key={v.vehicleId}>
            <td><Link to={`/vehicles/${v.vehicleId}`}>{v.vehicleId}</Link></td>
            <td><span className={`badge ${v.status === 'online' ? 'ok' : 'off'}`}>{v.status}</span></td>
            <td><SpeedBadge speed={v.lastSpeed} limit={v.speedLimit} /></td>
            <td>{fmtTime(v.lastSeen || v.timestamp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
