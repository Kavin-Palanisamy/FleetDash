import {
  Truck,
  Activity,
  CirclePause, // if your Lucide version is older, use PauseCircle instead
  Wrench,
  Users,
  type LucideIcon,
} from "lucide-react";

type Tone = "blue" | "green" | "orange" | "red" | "purple";

export interface StatsValues {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  maintenance: number;
  totalDrivers: number;
}

/** Demo values from the design spec. Pass `values` to show real numbers. */
const DEFAULT_VALUES: StatsValues = {
  totalVehicles: 128,
  activeVehicles: 96,
  inactiveVehicles: 24,
  maintenance: 8,
  totalDrivers: 112,
};

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
}

function StatCard({ label, value, subtitle, icon: Icon, tone }: StatCardProps) {
  return (
    <article className={`fd-stat fd-stat--${tone}`}>
      <div className="fd-stat__top">
        <h3 className="fd-stat__label">{label}</h3>
        <span className="fd-stat__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
      </div>
      <p className="fd-stat__value">{value.toLocaleString()}</p>
      <p className="fd-stat__subtitle">{subtitle}</p>
    </article>
  );
}

interface StatsCardsProps {
  values?: Partial<StatsValues>;
}

export default function StatsCards({ values }: StatsCardsProps) {
  const v: StatsValues = { ...DEFAULT_VALUES, ...values };

  return (
    <section className="fd-stats" aria-label="Fleet statistics">
      <StatCard
        label="Total Vehicles"
        value={v.totalVehicles}
        subtitle="Total registered vehicles"
        icon={Truck}
        tone="blue"
      />
      <StatCard
        label="Active Vehicles"
        value={v.activeVehicles}
        subtitle="Currently active vehicles"
        icon={Activity}
        tone="green"
      />
      <StatCard
        label="Inactive Vehicles"
        value={v.inactiveVehicles}
        subtitle="Currently inactive vehicles"
        icon={CirclePause}
        tone="orange"
      />
      <StatCard
        label="Maintenance"
        value={v.maintenance}
        subtitle="Vehicles under maintenance"
        icon={Wrench}
        tone="red"
      />
      <StatCard
        label="Total Drivers"
        value={v.totalDrivers}
        subtitle="Registered drivers"
        icon={Users}
        tone="purple"
      />
    </section>
  );
}