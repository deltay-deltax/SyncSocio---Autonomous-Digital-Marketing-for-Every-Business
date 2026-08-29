import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCanonical } from './hooks/useCanonical';
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
import AssetPage from './pages/AssetPage';
import BookDemo from './pages/BookDemo';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import SetupRoute from './components/SetupRoute';
import { MetaPixel } from './components/MetaPixel';
import CreatorDashboard from './pages/CreatorDashboard';

// Dashboard imports (Lazy Loaded)
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const DashboardFeed = lazy(() => import('./pages/dashboard/DashboardFeed'));
const DashboardAnalytics = lazy(() => import('./pages/dashboard/DashboardAnalytics'));
const DashboardAds = lazy(() => import('./pages/dashboard/DashboardAds'));
const DashboardSettings = lazy(() => import('./pages/dashboard/DashboardSettings'));
const EditorPage = lazy(() => import('./pages/dashboard/Editor'));
const ContentStrategy = lazy(() => import('./pages/dashboard/ContentStrategy'));
const AutopilotPage = lazy(() => import('./pages/dashboard/Autopilot'));
const CloneMode = lazy(() => import('./pages/dashboard/CloneMode'));
const PostOptimizer = lazy(() => import('./pages/PostOptimizer'));
const DashboardDMs = lazy(() => import('./pages/dashboard/DashboardDMs'));
const DashboardNexa = lazy(() => import('./pages/dashboard/DashboardNexa'));
const ContentMix = lazy(() => import('./pages/dashboard/ContentMix'));
const ContentPlan = lazy(() => import('./pages/dashboard/ContentPlan'));
const DashboardFAQ = lazy(() => import('./pages/dashboard/DashboardFAQ'));
const History = lazy(() => import('./pages/dashboard/History'));
const AssetLibrary = lazy(() => import('./pages/dashboard/AssetLibrary'));
const Products = lazy(() => import('./pages/dashboard/Products'));
const CreditsExplainer = lazy(() => import('./pages/CreditsExplainer'));
const CreditTopup = lazy(() => import('./pages/dashboard/CreditTopup'));
const DashboardBilling = lazy(() => import('./pages/dashboard/DashboardBilling'));
const Support = lazy(() => import('./pages/dashboard/Support').then(m => ({ default: m.Support })));
import { Toaster } from './components/ui/toaster';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Thin component to call useCanonical inside BrowserRouter context
function CanonicalUpdater() {
  useCanonical();
  return null;
}

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function App() {
  useEffect(() => {
    // Clear out any old bloated localStorage caches that were causing QuotaExceededError
    try {
      localStorage.removeItem('syncsocio_generated_assets');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('syncsocio_strategy_assets_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    // Only track once per session
    if (!sessionStorage.getItem('velocity_visit_tracked')) {
      const sessionToken = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('velocity_visit_tracked', 'true');
      
      let API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      if (!API_BASE.endsWith('/api')) API_BASE += '/api';
      fetch(`${API_BASE}/analytics/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionToken,
          path: window.location.pathname
        }),
      }).catch(err => console.error('Failed to track visit:', err));

      // ── Affiliate Referral Tracking ──
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode && !sessionStorage.getItem('velocity_ref_tracked')) {
        sessionStorage.setItem('velocity_ref_tracked', 'true');
        sessionStorage.setItem('velocity_ref_code', refCode);
        
        fetch(`${API_BASE}/creators/track-click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refCode }),
        }).catch(err => console.error('Failed to track referral click:', err));
      }
    }
  }, []);

  return (
    <CurrencyProvider>
      <BrowserRouter>
        <CanonicalUpdater />
        <MetaPixel />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Public Auth Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgotpassword" element={<ForgotPassword />} />
              <Route path="/resetpassword/:resetToken" element={<ResetPassword />} />
            </Route>

            {/* Setup & Onboarding Routes */}
            <Route element={<SetupRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/set-password" element={<SetPassword />} />
            </Route>

            <Route path="/book-demo" element={<BookDemo />} />
            <Route path="/instagram-setup" element={<InstagramInstructions />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/a/:id" element={<AssetPage />} />
            <Route path="/credits" element={<CreditsExplainer />} />
            
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
                <Route path="nexa" element={<DashboardNexa />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="history" element={<History />} />
                <Route path="assets" element={<AssetLibrary />} />
                <Route path="products" element={<Products />} />
                <Route path="faq" element={<DashboardFAQ />} />
                <Route path="credits" element={<CreditsExplainer />} />
                <Route path="buy-credits" element={<CreditTopup />} />
                <Route path="billing" element={<DashboardBilling />} />
                <Route path="support" element={<Support />} />
                <Route path="editor" element={<EditorPage />} />
                <Route path="autopilot" element={<AutopilotPage />} />
                <Route path="clone" element={<CloneMode />} />
              </Route>
            </Route>

            {/* Creator Dashboard (must be before /:username/:slug to avoid collision) */}
            <Route path="/creator/:token" element={<CreatorDashboard />} />

            {/* Public Asset Page - dynamic route (must be before catch-all) */}
            <Route path="/:username/:slug" element={<AssetPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </CurrencyProvider>
  );
}

export default App;
