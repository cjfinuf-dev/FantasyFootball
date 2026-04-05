import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const context = useOutletContext();

  if (loading) return <div className="ff-loading-screen"><svg className="ff-hex-spinner" viewBox="0 0 48 52"><polygon points="24,2 46,14 46,38 24,50 2,38 2,14" /></svg>Loading</div>;
  if (!user) return <Navigate to="/" replace />;
  return <Outlet context={context} />;
}
