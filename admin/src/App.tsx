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
import Leads from './pages/Leads';
import MarketingLeads from './pages/MarketingLeads';
import LandingGallery from './pages/LandingGallery';
import ScheduledPosts from './pages/ScheduledPosts';
import Creators from './pages/Creators';
import AdminEntry from './pages/AdminEntry';
import Generations from './pages/Generations';
import LeadGeneration from './pages/LeadGeneration';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import NexaConversations from './pages/NexaConversations';
import NexaKnowledge from './pages/NexaKnowledge';
import DMAutomations from './pages/DMAutomations';
import Products from './pages/Products';
import Campaigns from './pages/Campaigns';
import AdminNotifications from './pages/AdminNotifications';
import SupportTickets from './pages/SupportTickets';
import AIOperations from './pages/AIOperations';
import AdminAds from './pages/AdminAds';
import BrandDeepConfig from './pages/BrandDeepConfig';
import CreativeShowcaseGallery from './pages/CreativeShowcaseGallery';
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
          <Route path="/" element={<AdminEntry />} />
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="brands" element={<Brands />} />
            <Route path="brands/:id/deep-config" element={<BrandDeepConfig />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="refunds" element={<Transactions />} />
            <Route path="system-health" element={<SystemHealth />} />
            <Route path="creators" element={<Creators />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="whatsapp-templates" element={<WhatsAppTemplates />} />
            <Route path="nexa-conversations" element={<NexaConversations />} />
            <Route path="nexa-knowledge" element={<NexaKnowledge />} />
            <Route path="dm-automations" element={<DMAutomations />} />
            <Route path="products" element={<Products />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="support-tickets" element={<SupportTickets />} />
            <Route path="landing-gallery" element={<LandingGallery />} />
            <Route path="creative-showcase-gallery" element={<CreativeShowcaseGallery />} />
            <Route path="scheduled-posts" element={<ScheduledPosts />} />
            <Route path="generations" element={<Generations />} />
            <Route path="ai-operations" element={<AIOperations />} />
            <Route path="ads-console" element={<AdminAds />} />
            <Route path="lead-generation" element={<LeadGeneration />} />
            <Route path="leads-management" element={<Leads />} />
            <Route path="marketing-crm" element={<MarketingLeads />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
