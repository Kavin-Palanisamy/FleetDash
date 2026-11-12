import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, X, Wifi, WifiOff, MapPin } from "lucide-react";
import { useFleet } from "../context/FleetContext.jsx";

/* ---------------------------- Types ---------------------------- */

type StatusKey = "moving" | "idle" | "offline";
type StatusFilter = StatusKey | "all";

interface VehicleLocation {
  lat?: number | null;
  lng?: number | null;
  timestamp?: string | number | null;
}

interface FleetVehicle {
  vehicleId: string;
  status?: string;
  lastSpeed?: number;
  speedLimit?: number;
  lastLocation?: VehicleLocation | null;
  // Optional "last updated" fields: whichever your data has is used.
  lastUpdated?: string | number | null;
  updatedAt?: string | number | null;
  lastSeen?: string | number | null;
}

interface FleetContextValue {
  vehicles: Record<string, FleetVehicle>;
  connected?: boolean; // shown only if your context provides it
}

interface FocusTarget {
  id: string;
  nonce: number;
}

/* ------------------------- Status helpers ------------------------- */

const MOVING_MIN_SPEED = 1; // km/h: online and at/above this = "moving"

const STATUS_META: Record<StatusKey, { label: string }> = {
  moving: { label: "Moving" },
  idle: { label: "Idle" },
  offline: { label: "Offline" },
};

function getStatus(v: FleetVehicle): StatusKey {
  if (v.status !== "online") return "offline";
  return Number(v.lastSpeed ?? 0) >= MOVING_MIN_SPEED ? "moving" : "idle";
}

function isSpeeding(v: FleetVehicle): boolean {
  return v.speedLimit != null && Number(v.lastSpeed ?? 0) > v.speedLimit;
}

function getCoords(v: FleetVehicle): [number, number] | null {
  const lat = v.lastLocation?.lat;
  const lng = v.lastLocation?.lng;
  return lat != null && lng != null ? [lat, lng] : null;
}

function getLastUpdated(v: FleetVehicle): string | null {
  const raw = v.lastUpdated ?? v.updatedAt ?? v.lastSeen ?? v.lastLocation?.timestamp;
  if (raw == null) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

/* --------------------------- Marker icons --------------------------- */

// Lucide "truck" glyph as inline SVG (Leaflet DivIcon needs an HTML string).
const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>' +
  '<path d="M15 18H9"/>' +
  '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>' +
  '<circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

const iconCache = new Map<string, L.DivIcon>();

function getIcon(status: StatusKey, selected: boolean, speeding: boolean): L.DivIcon {
  const key = `${status}-${selected}-${speeding}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: "fd-mk-wrap",
      html:
        `<div class="fd-mk fd-mk--${status}${selected ? " is-selected" : ""}${speeding ? " is-speeding" : ""}">` +
        `<span class="fd-mk__pulse"></span><span class="fd-mk__body">${TRUCK_SVG}</span></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -20],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

/* ------------------- Map helper components (no UI) ------------------- */

/** Keeps Leaflet's size correct when the sidebar or layout resizes. */
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(container);
    window.addEventListener("orientationchange", refresh);
    refresh();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("orientationchange", refresh);
    };
  }, [map]);

  return null;
}

interface MapControllerProps {
  target: FocusTarget | null;
  vehicles: Record<string, FleetVehicle>;
  markerRefs: MutableRefObject<Record<string, L.Marker | null>>;
}

/** Centers the map on a vehicle picked from search, then opens its popup. */
function MapController({ target, vehicles, markerRefs }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const coords = vehicles[target.id] ? getCoords(vehicles[target.id]) : null;
    if (!coords) return;

    const latlng = L.latLng(coords[0], coords[1]);
    const zoom = Math.max(map.getZoom(), 15);
    const openPopup = () => markerRefs.current[target.id]?.openPopup();

    if (map.getCenter().distanceTo(latlng) < 1 && map.getZoom() === zoom) {
      openPopup();
      return;
    }
    map.once("moveend", openPopup);
    map.flyTo(latlng, zoom, { duration: 0.8 });

    return () => {
      map.off("moveend", openPopup);
    };
    // Only re-run on a new search selection, not on every live vehicle update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return null;
}

/* ------------------------------ Popup ------------------------------ */

interface VehiclePopupProps {
  vehicle: FleetVehicle;
  coords: [number, number];
  status: StatusKey;
  speeding: boolean;
}

function VehiclePopupContent({ vehicle, coords, status, speeding }: VehiclePopupProps) {
  const updated = getLastUpdated(vehicle);

  return (
    <div className="fd-popup">
      <div className="fd-popup__head">
        <strong>{vehicle.vehicleId}</strong>
        <span className={`fd-pill fd-pill--${status}`}>{STATUS_META[status].label}</span>
      </div>

      <dl className="fd-popup__list">
        <div>
          <dt>Speed</dt>
          <dd className={speeding ? "is-over" : undefined}>
            {Math.round(vehicle.lastSpeed || 0)} km/h
            {vehicle.speedLimit != null && <small> (limit {vehicle.speedLimit})</small>}
          </dd>
        </div>
        <div>
          <dt>Latitude</dt>
          <dd>{coords[0].toFixed(5)}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>{coords[1].toFixed(5)}</dd>
        </div>
        {updated && (
          <div>
            <dt>Last updated</dt>
            <dd>{updated}</dd>
          </div>
        )}
      </dl>

      {speeding && <p className="fd-popup__warn">Over the speed limit</p>}
    </div>
  );
}

/* ------------------------------ Main ------------------------------ */

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "moving", label: "Moving" },
  { key: "idle", label: "Idle" },
  { key: "offline", label: "Offline" },
];

export default function MapView() {
  const fleet = useFleet() as FleetContextValue;
  const vehicles = useMemo(() => fleet.vehicles ?? {}, [fleet.vehicles]);
  const list = useMemo(() => Object.values(vehicles), [vehicles]);
  const connected = typeof fleet.connected === "boolean" ? fleet.connected : undefined;

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  const searchRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // Close the results list when clicking outside the search box.
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [searchOpen]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: list.length, moving: 0, idle: 0, offline: 0 };
    list.forEach((v) => {
      c[getStatus(v)] += 1;
    });
    return c;
  }, [list]);

  const visible = useMemo(
    () =>
      list.flatMap((v) => {
        const coords = getCoords(v);
        const status = getStatus(v);
        return coords && (filter === "all" || status === filter) ? [{ v, coords, status }] : [];
      }),
    [list, filter]
  );

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? list.filter((v) => String(v.vehicleId ?? "").toLowerCase().includes(q)).slice(0, 6) : []),
    [list, q]
  );

  const selectVehicle = (v: FleetVehicle) => {
    if (!getCoords(v)) return;
    if (filter !== "all" && getStatus(v) !== filter) setFilter("all");
    setSelectedId(v.vehicleId);
    setQuery(String(v.vehicleId));
    setSearchOpen(false);
    setFocus({ id: v.vehicleId, nonce: Date.now() });
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedId(null);
    setSearchOpen(false);
  };

  return (
    <section className="fd-map" aria-label="Live vehicle tracking">
      {/* Header */}
      <header className="fd-map__header">
        <div className="fd-map__titles">
          <h2>Live Vehicle Tracking</h2>
          <p>Monitor your fleet locations in real time.</p>
        </div>
        <div className="fd-map__meta">
          {connected !== undefined && (
            <span className={`fd-map__live ${connected ? "is-on" : "is-off"}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? "Live" : "Disconnected"}
            </span>
          )}
          <span className="fd-map__count">
            {list.length} {list.length === 1 ? "vehicle" : "vehicles"}
          </span>
        </div>
      </header>

      {/* Toolbar */}
      <div className="fd-map__toolbar">
        <div className="fd-map__search" ref={searchRef}>
          <Search size={18} className="fd-map__search-icon" aria-hidden="true" />
          <input
            type="text"
            value={query}
            placeholder="Search vehicle number or ID..."
            aria-label="Search vehicle number or ID"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchOpen(false);
              if (e.key === "Enter" && matches[0]) {
                e.preventDefault();
                selectVehicle(matches[0]);
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="fd-map__search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

          {searchOpen && q && (
            <ul className="fd-map__results">
              {matches.length > 0 ? (
                matches.map((v) => {
                  const status = getStatus(v);
                  const located = getCoords(v) !== null;
                  return (
                    <li key={v.vehicleId}>
                      <button
                        type="button"
                        className="fd-map__result"
                        disabled={!located}
                        onClick={() => selectVehicle(v)}
                      >
                        <span className={`fd-dot fd-dot--${status}`} aria-hidden="true" />
                        <span className="fd-map__result-id">{v.vehicleId}</span>
                        <span className="fd-map__result-meta">
                          {located ? STATUS_META[status].label : "No location yet"}
                        </span>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="fd-map__no-results">No vehicles match &ldquo;{query.trim()}&rdquo;.</li>
              )}
            </ul>
          )}
        </div>

        <div className="fd-map__filters" role="group" aria-label="Filter by status">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`fd-chip-filter${filter === key ? " is-active" : ""}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key !== "all" && <span className={`fd-dot fd-dot--${key}`} aria-hidden="true" />}
              {label}
              <span className="fd-chip-filter__n">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="fd-map__frame">
        <MapContainer
          center={[11.66, 78.15]}
          zoom={12}
          zoomControl={false}
          className="fd-map__canvas"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ZoomControl position="topright" />
          <MapResizer />
          <MapController target={focus} vehicles={vehicles} markerRefs={markerRefs} />

          {visible.map(({ v, coords, status }) => {
            const speeding = isSpeeding(v);
            const selected = v.vehicleId === selectedId;
            return (
              <Marker
                key={v.vehicleId}
                position={coords}
                icon={getIcon(status, selected, speeding)}
                zIndexOffset={selected ? 1000 : 0}
                ref={(m) => {
                  markerRefs.current[v.vehicleId] = m;
                }}
                eventHandlers={{
                  click: () => setSelectedId(v.vehicleId),
                  popupclose: () => setSelectedId((cur) => (cur === v.vehicleId ? null : cur)),
                }}
              >
                <Popup minWidth={210}>
                  <VehiclePopupContent
                    vehicle={v}
                    coords={coords}
                    status={status}
                    speeding={speeding}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="fd-legend" aria-label="Map legend">
          <span>
            <i className="fd-dot fd-dot--moving" /> Moving
          </span>
          <span>
            <i className="fd-dot fd-dot--idle" /> Idle
          </span>
          <span>
            <i className="fd-dot fd-dot--offline" /> Offline
          </span>
        </div>

        {visible.length === 0 && (
          <div className="fd-map__empty" role="status">
            <MapPin size={20} aria-hidden="true" />
            <span>
              {list.length === 0 || filter === "all"
                ? "Waiting for vehicle locations…"
                : "No vehicles match this filter."}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}