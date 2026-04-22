import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Setup from './pages/Setup';
import SetPassword from './pages/SetPassword';
import InstagramInstructions from './pages/InstagramInstructions';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

// Dashboard imports
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import DashboardFeed from './pages/dashboard/DashboardFeed';
import DashboardAnalytics from './pages/dashboard/DashboardAnalytics';
import DashboardAds from './pages/dashboard/DashboardAds';
import DashboardSettings from './pages/dashboard/DashboardSettings';
import ContentStrategy from './pages/dashboard/ContentStrategy';
import PostOptimizer from './pages/PostOptimizer';
import DashboardDMs from './pages/dashboard/DashboardDMs';
import ContentMix from './pages/dashboard/ContentMix';
import ContentPlan from './pages/dashboard/ContentPlan';
import DashboardFAQ from './pages/dashboard/DashboardFAQ';
import History from './pages/dashboard/History';
import ActivityLog from './pages/dashboard/ActivityLog';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/instagram-setup" element={<InstagramInstructions />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/resetpassword/:resetToken" element={<ResetPassword />} />
        
        {/* Dashboard Routes with Protection */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="feed" element={<DashboardFeed />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="ads" element={<DashboardAds />} />
            <Route path="content" element={<ContentMix />} />
            <Route path="content/plan" element={<ContentPlan />} />
            <Route path="strategy" element={<ContentStrategy />} />
            <Route path="post-optimizer" element={<PostOptimizer />} />
            <Route path="dms" element={<DashboardDMs />} />
            <Route path="settings" element={<DashboardSettings />} />
            <Route path="history" element={<History />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="faq" element={<DashboardFAQ />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
