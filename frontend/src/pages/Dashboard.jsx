import { useFleet } from '../context/FleetContext.jsx';
import DashboardHeader from '../components/DashboardHeader.tsx';
import StatsCards from '../components/StatsCards.tsx';
import MapView from '../components/MapView.tsx';
import VehicleTable from '../components/VehicleTable.jsx';
import AlertPanel from '../components/AlertPanel.jsx';

export default function Dashboard() {
  const { vehicles } = useFleet();
  const list = Object.values(vehicles);
  const online = list.filter((v) => v.status === 'online').length;

  return (
    <>
      <DashboardHeader />
      <StatsCards
        values={{
          totalVehicles: list.length,
          activeVehicles: online,
          inactiveVehicles: list.length - online,
        }}
      />
      <div className="grid">
        {/* <MapView /> */}
        {/* <AlertPanel /> */}
      </div>
      <h3>Vehicles</h3>
      <VehicleTable />
    </>
  );
}