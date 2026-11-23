import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";
import { useFleet } from "../context/FleetContext.jsx";
import {
  MapResizer,
  VehiclePopupContent,
  getCoords,
  getIcon,
  getStatus,
  isSpeeding,
  STATUS_META,
  type FleetVehicle,
} from "./MapView";

interface FleetContextValue {
  vehicles: Record<string, FleetVehicle>;
}

/** Keeps the map centered on the vehicle as live updates arrive. */
function FollowVehicle({ position }: { position: [number, number] }) {
  const map = useMap();
  const [lat, lng] = position;

  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.6 });
  }, [map, lat, lng]);

  return null;
}

interface VehicleLocationMapProps {
  vehicleId: string;
}

export default function VehicleLocationMap({ vehicleId }: VehicleLocationMapProps) {
  const { vehicles } = useFleet() as FleetContextValue;
  const vehicle = vehicles?.[vehicleId];

  const coords = useMemo(() => (vehicle ? getCoords(vehicle) : null), [vehicle]);
  const status = vehicle ? getStatus(vehicle) : "offline";

  return (
    <section className="fd-map fd-map--compact" aria-label="Vehicle location">
      <header className="fd-map__header">
        <div className="fd-map__titles">
          <h2>Vehicle Location</h2>
          <p>Last known position of {vehicleId}.</p>
        </div>
        <div className="fd-map__meta">
          <span className={`fd-pill fd-pill--${status}`}>{STATUS_META[status].label}</span>
        </div>
      </header>

      <div className="fd-map__frame">
        {coords && vehicle ? (
          <MapContainer center={coords} zoom={15} zoomControl={false} className="fd-map__canvas">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <ZoomControl position="topright" />
            <MapResizer />
            <FollowVehicle position={coords} />

            <Marker position={coords} icon={getIcon(status, true, isSpeeding(vehicle))}>
              <Popup minWidth={210}>
                <VehiclePopupContent
                  vehicle={vehicle}
                  coords={coords}
                  status={status}
                  speeding={isSpeeding(vehicle)}
                />
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="fd-map__canvas fd-map__canvas--empty">
            <div className="fd-map__empty fd-map__empty--static" role="status">
              <MapPin size={20} aria-hidden="true" />
              <span>No location received for this vehicle yet.</span>
            </div>
          </div>
        )}

        {coords && (
          <div className="fd-legend" aria-label="Map legend">
            <span><i className="fd-dot fd-dot--moving" /> Moving</span>
            <span><i className="fd-dot fd-dot--idle" /> Idle</span>
            <span><i className="fd-dot fd-dot--offline" /> Offline</span>
          </div>
        )}
      </div>
    </section>
  );
}