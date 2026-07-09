import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetails from './pages/UserDetails';
import Coupons from './pages/Coupons';
import Brands from './pages/Brands';
import Layout from './pages/Layout';
import Analytics from './pages/Analytics';
import Transactions from './pages/Transactions';
import SystemHealth from './pages/SystemHealth';
import Waitlist from './pages/Waitlist';
import Testers from './pages/Testers';
import LandingGallery from './pages/LandingGallery';
import './App.css';

// Protected Route for Admin
const AdminRoute = () => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<AdminRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="brands" element={<Brands />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="refunds" element={<Transactions />} />
            <Route path="system-health" element={<SystemHealth />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="testers" element={<Testers />} />
            <Route path="landing-gallery" element={<LandingGallery />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
