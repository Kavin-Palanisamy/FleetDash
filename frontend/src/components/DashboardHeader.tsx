import { useState, type ChangeEvent, type FormEvent } from "react";
import { Search, Bell, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  userRole?: string;
  hasNotifications?: boolean;
  /** Optional: called as the user types. UI only, no search logic included. */
  onSearch?: (query: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardHeader({
  userName = "Admin",
  userRole = "Fleet Manager",
  hasNotifications = true,
  onSearch,
}: DashboardHeaderProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="fd-dh">
      <div className="fd-dh__titles">
        <h1 className="fd-dh__title">Fleet Overview</h1>
        <p className="fd-dh__subtitle">
          Welcome back! Here&apos;s what&apos;s happening with your fleet today.
        </p>
      </div>

      <div className="fd-dh__tools">
        <form
          className="fd-dh__search"
          role="search"
          onSubmit={(e: FormEvent) => e.preventDefault()}
        >
          <Search size={18} className="fd-dh__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search vehicles, drivers, or alerts..."
            aria-label="Search vehicles, drivers, or alerts"
          />
        </form>

        <div className="fd-dh__actions">
          <button
            type="button"
            className="fd-dh__bell"
            aria-label={hasNotifications ? "Notifications (new)" : "Notifications"}
          >
            <Bell size={20} />
            {hasNotifications && <span className="fd-dh__bell-dot" aria-hidden="true" />}
          </button>

          <button type="button" className="fd-dh__profile" aria-label="Open profile menu">
            <span className="fd-dh__avatar" aria-hidden="true">
              {getInitials(userName)}
            </span>
            <span className="fd-dh__who">
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </span>
            <ChevronDown size={16} className="fd-dh__chevron" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}