import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  
  const setupDone = localStorage.getItem('syncsocio_setup_done') === 'true';

  if (!localStorage.getItem('syncsocio_profile')) {
    return <Navigate to="/login" replace />;
  }

  if (!setupDone) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
