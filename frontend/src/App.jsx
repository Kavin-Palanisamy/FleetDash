import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import AlertsPage from './pages/AlertsPage.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Routes>
      </main>
    </>
  );
}
