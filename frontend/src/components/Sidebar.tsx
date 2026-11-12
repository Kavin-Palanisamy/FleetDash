import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPinned,
  Truck,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import "./Sidebar.css";

interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  alertCount?: number;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
  { id: "live", label: "Live Tracking", to: "/dashboard/live-tracking", icon: MapPinned },
  { id: "vehicles", label: "Vehicles", to: "/dashboard/vehicles", icon: Truck },
  { id: "alerts", label: "Alerts", to: "/dashboard/alerts", icon: Bell },
  { id: "settings", label: "Settings", to: "/dashboard/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  alertCount,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const badgeText =
    alertCount && alertCount > 0 ? (alertCount > 99 ? "99+" : String(alertCount)) : null;

  return (
    <aside
      id="fd-sidebar"
      className={`fd-sb${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-open" : ""}`}
      aria-label="Main navigation"
    >
      <div className="fd-sb__header">
        <div className="fd-sb__brand">
          <span className="fd-sb__mark">
            <Truck size={20} strokeWidth={2.2} />
          </span>
          <span className="fd-sb__name">
            Fleet<span>Dash</span>
          </span>
        </div>

        <button
          type="button"
          className="fd-sb__close"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="fd-sb__nav">
        <p className="fd-sb__section">Menu</p>
        <ul>
          {NAV_ITEMS.map(({ id, label, to, icon: Icon, end }) => (
            <li key={id}>
              <NavLink
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                onClick={onCloseMobile}
                className={({ isActive }) => `fd-sb__link${isActive ? " is-active" : ""}`}
              >
                <span className="fd-sb__icon">
                  <Icon size={20} />
                  {id === "alerts" && badgeText && (
                    <span className="fd-sb__dot" aria-hidden="true" />
                  )}
                </span>
                <span className="fd-sb__label">{label}</span>
                {id === "alerts" && badgeText && (
                  <span className="fd-sb__badge">
                    {badgeText}
                    <span className="fd-sr-only"> unread alerts</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="fd-sb__footer">
        <button
          type="button"
          className="fd-sb__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          <span className="fd-sb__label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}