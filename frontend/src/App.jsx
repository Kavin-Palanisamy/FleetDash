import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import LoginPage from './components/LoginPage.tsx';

function DashboardLayout() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/vehicles/:id" element={<VehicleDetails />} />
        <Route path="/dashboard/alerts" element={<AlertsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}