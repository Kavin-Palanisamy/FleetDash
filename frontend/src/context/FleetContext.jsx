import { createContext, useContext, useEffect, useState } from 'react';
import { getVehicles, getAlerts } from '../api/client.js';
import { socket } from '../socket/socket.js';

const FleetContext = createContext(null);
export const useFleet = () => useContext(FleetContext);

export function FleetProvider({ children }) {
  const [vehicles, setVehicles] = useState({}); // vehicleId -> latest data
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    getVehicles().then((list) => setVehicles(Object.fromEntries(list.map((v) => [v.vehicleId, v])))).catch(console.error);
    getAlerts().then(setAlerts).catch(console.error);

    socket.connect();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry:update', (t) =>
      setVehicles((prev) => ({ ...prev, [t.vehicleId]: { ...prev[t.vehicleId], ...t,
        lastLocation: { lat: t.lat, lng: t.lng }, lastSpeed: t.speed, status: 'online' } })));
    socket.on('vehicle:status', ({ vehicleId, status }) =>
      setVehicles((prev) => ({ ...prev, [vehicleId]: { ...prev[vehicleId], status } })));
    socket.on('alert:new', (a) => setAlerts((prev) => [a, ...prev].slice(0, 100)));
    return () => { socket.off(); socket.disconnect(); };
  }, []);

  return <FleetContext.Provider value={{ vehicles, alerts, connected }}>{children}</FleetContext.Provider>;
}
