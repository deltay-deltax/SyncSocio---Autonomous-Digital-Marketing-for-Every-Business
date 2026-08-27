import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const profileStr = localStorage.getItem('syncsocio_profile');
  const token = localStorage.getItem('token');

  if (!token && !profileStr) {
    return <Navigate to="/login" replace />;
  }

  let isSetupDone = localStorage.getItem('syncsocio_setup_done') === 'true';

  if (!isSetupDone && profileStr) {
    try {
      const parsed = JSON.parse(profileStr);
      const profile = parsed && parsed.success !== undefined ? (parsed.success ? parsed.data : parsed) : parsed;
      
      if (profile && profile._id) {
        isSetupDone = true;
        localStorage.setItem('syncsocio_setup_done', 'true');
        // Heal the local storage so it's unwrapped going forward
        localStorage.setItem('syncsocio_profile', JSON.stringify(profile));
      }
    } catch (e) {}
  }

  if (!isSetupDone) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
