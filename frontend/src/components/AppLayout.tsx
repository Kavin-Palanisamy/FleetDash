import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Truck } from "lucide-react";
import Sidebar from "./Sidebar";
import "./Sidebar.css";

const TABLET_QUERY = "(max-width: 1024px)";
const MOBILE_QUERY = "(max-width: 768px)";

interface AppLayoutProps {
  alertCount?: number;
}

export default function AppLayout({ alertCount }: AppLayoutProps) {
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(TABLET_QUERY).matches
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(TABLET_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className={`fd-shell${collapsed ? " is-collapsed" : ""}`}>
      <header className="fd-topbar">
        <button
          type="button"
          className="fd-topbar__menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-controls="fd-sidebar"
          aria-expanded={mobileOpen}
        >
          <Menu size={22} />
        </button>
        <div className="fd-topbar__brand">
          <span className="fd-sb__mark fd-sb__mark--sm">
            <Truck size={16} strokeWidth={2.2} />
          </span>
          <span className="fd-sb__name">
            Fleet<span>Dash</span>
          </span>
        </div>
      </header>

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        alertCount={alertCount}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`fd-overlay${mobileOpen ? " is-visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <main className="fd-main">
        <Outlet />
      </main>
    </div>
  );
}