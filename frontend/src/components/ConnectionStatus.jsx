import { useFleet } from '../context/FleetContext.jsx';
export default function ConnectionStatus() {
  const { connected } = useFleet();
  return <span className={`badge ${connected ? 'ok' : 'warn'}`}>{connected ? 'Live' : 'Disconnected'}</span>;
}
