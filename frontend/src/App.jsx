import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout.tsx';
import Dashboard from './pages/Dashboard.jsx';
import LiveTrackingPage from './pages/LiveTrackingPage.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import LoginPage from './components/LoginPage.tsx';
import SignUpPage from './components/SignUpPage.tsx';

const ComingSoon = ({ title }) => <h2>{title}</h2>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/live-tracking" element={<LiveTrackingPage />} />
        <Route path="/dashboard/vehicles" element={<ComingSoon title="Vehicles" />} />
        <Route path="/dashboard/vehicles/:id" element={<VehicleDetails />} />
        <Route path="/dashboard/alerts" element={<AlertsPage />} />
        <Route path="/dashboard/settings" element={<ComingSoon title="Settings" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}