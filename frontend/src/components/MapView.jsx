import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useFleet } from '../context/FleetContext.jsx';

export default function MapView() {
  const { vehicles } = useFleet();
  return (
    <MapContainer center={[11.66, 78.15]} zoom={12} className="map">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {Object.values(vehicles).filter((v) => v.lastLocation?.lat != null).map((v) => (
        <CircleMarker key={v.vehicleId} center={[v.lastLocation.lat, v.lastLocation.lng]} radius={8}
          pathOptions={{ color: v.lastSpeed > v.speedLimit ? 'red' : v.status === 'online' ? 'green' : 'gray' }}>
          <Popup>{v.vehicleId}<br />{Math.round(v.lastSpeed || 0)} km/h</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
