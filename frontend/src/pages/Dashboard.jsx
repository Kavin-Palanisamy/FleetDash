import SummaryCards from '../components/SummaryCards.jsx';
import MapView from '../components/MapView.jsx';
import VehicleTable from '../components/VehicleTable.jsx';
import AlertPanel from '../components/AlertPanel.jsx';

export default function Dashboard() {
  return (
    <>
      <SummaryCards />
      <div className="grid">
        <MapView />
        <AlertPanel />
      </div>
      <h3>Vehicles</h3>
      <VehicleTable />
    </>
  );
}
