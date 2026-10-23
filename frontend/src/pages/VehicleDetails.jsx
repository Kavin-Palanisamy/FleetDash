import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTelemetry, getTrips } from '../api/client.js';
import { useFleet } from '../context/FleetContext.jsx';
import TelemetryChart from '../components/TelemetryChart.jsx';
import TripList from '../components/TripList.jsx';
import SpeedBadge from '../components/SpeedBadge.jsx';

export default function VehicleDetails() {
  const { id } = useParams();
  const { vehicles } = useFleet();
  const v = vehicles[id];
  const [history, setHistory] = useState([]);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    getTelemetry(id).then(setHistory).catch(console.error);
    getTrips(id).then(setTrips).catch(console.error);
  }, [id]);

  return (
    <>
      <h2>{id}</h2>
      {v && <p>Status: {v.status} · Speed: <SpeedBadge speed={v.lastSpeed} limit={v.speedLimit} /> · Limit: {v.speedLimit} km/h</p>}
      <TelemetryChart data={history} />
      <TripList trips={trips} />
    </>
  );
}
