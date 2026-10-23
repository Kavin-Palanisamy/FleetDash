import { Link } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus.jsx';
export default function Navbar() {
  return (
    <nav className="nav">
      <strong>FleetDash</strong>
      <Link to="/">Dashboard</Link>
      <Link to="/alerts">Alerts</Link>
      <span style={{ marginLeft: 'auto' }}><ConnectionStatus /></span>
    </nav>
  );
}
