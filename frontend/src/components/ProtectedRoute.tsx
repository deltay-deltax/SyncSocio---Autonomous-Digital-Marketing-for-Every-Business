import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const setupDone = localStorage.getItem('velocity_setup_done') === 'true';

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!setupDone) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
