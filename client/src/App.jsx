import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './components/layout/LandingPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import HubPage from './components/layout/HubPage';
import LeagueDashboard from './components/league/LeagueDashboard';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="ff-loading-screen">
        <svg className="ff-hex-spinner" viewBox="0 0 48 52">
          <polygon points="24,2 46,14 46,38 24,50 2,38 2,14" />
        </svg>
        Loading
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hub/:tab?" element={<HubPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/league/:leagueId/:tab?" element={<LeagueDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
