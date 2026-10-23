import { useFleet } from '../context/FleetContext.jsx';
export default function SummaryCards() {
  const { vehicles, alerts } = useFleet();
  const list = Object.values(vehicles);
  const online = list.filter((v) => v.status === 'online').length;
  const speeding = list.filter((v) => v.lastSpeed > v.speedLimit).length;
  const items = [['Total vehicles', list.length], ['Online', online], ['Offline', list.length - online],
    ['Overspeeding now', speeding], ['Recent alerts', alerts.length]];
  return <div className="cards">{items.map(([l, n]) => <div className="card" key={l}><small>{l}</small><h2>{n}</h2></div>)}</div>;
}
