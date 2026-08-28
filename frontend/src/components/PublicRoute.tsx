import { Navigate, Outlet } from 'react-router-dom';

const PublicRoute = () => {
  const token = localStorage.getItem('token');
  const isSetupDone = localStorage.getItem('syncsocio_setup_done') === 'true';

  // If user is already authenticated
  if (token) {
    if (isSetupDone) {
      // Setup complete -> Go to dashboard
      return <Navigate to="/dashboard" replace />;
    } else {
      // Setup incomplete -> Go to setup
      return <Navigate to="/setup" replace />;
    }
  }

  // Not authenticated, render the public route
  return <Outlet />;
};

export default PublicRoute;
