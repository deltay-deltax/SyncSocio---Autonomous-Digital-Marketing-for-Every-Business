import { Navigate, Outlet } from 'react-router-dom';

const SetupRoute = () => {
  const token = localStorage.getItem('token');
  const profileStr = localStorage.getItem('syncsocio_profile');

  // If user is not authenticated at all
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
      }
    } catch (e) {}
  }

  // If setup is ALREADY done, they shouldn't be on the onboarding or setup screens
  if (isSetupDone) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated but setup is NOT done -> render setup/onboarding route
  return <Outlet />;
};

export default SetupRoute;
