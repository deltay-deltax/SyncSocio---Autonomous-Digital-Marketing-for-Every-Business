import { useEffect, lazy, Suspense } from 'react';
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
import { MetaPixel } from './components/MetaPixel';

// Dashboard imports (Lazy loaded for code splitting)
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
const Support = lazy(() => import('./pages/dashboard/Support').then(module => ({ default: module.Support })));
import { Toaster } from './components/ui/toaster';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Thin component to call useCanonical inside BrowserRouter context
function CanonicalUpdater() {
  useCanonical();
  return null;
}

const GlobalSkeleton = () => (
  <div className="flex h-screen w-full bg-background overflow-hidden">
    <div className="w-64 border-r border-border bg-card p-4 hidden md:flex flex-col gap-4">
      <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-8" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 w-full bg-muted/50 rounded-md animate-pulse" />
      ))}
    </div>
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-16 border-b border-border bg-card/50 flex items-center px-6 gap-4">
        <div className="h-6 w-48 bg-muted rounded-md animate-pulse" />
        <div className="ml-auto h-8 w-8 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-hidden">
        <div className="h-10 w-1/4 bg-muted rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    // Global media error fallback to handle broken images/videos gracefully
    const handleMediaError = (e: Event) => {
      const target = e.target as HTMLElement;
      const fallbackUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ3NTU2OSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PGxpbmUgeDE9IjMiIHkxPSIzIiB4Mj0iMjEiIHkyPSIyMSIvPjwvc3ZnPg==';
      
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        if (!img.src.startsWith('data:image/svg+xml')) {
          img.src = fallbackUrl;
          img.classList.add('opacity-50');
        }
      } else if (target.tagName === 'VIDEO') {
        const vid = target as HTMLVideoElement;
        if (!vid.poster || !vid.poster.startsWith('data:image/svg+xml')) {
          vid.poster = fallbackUrl;
          vid.classList.add('opacity-50');
        }
      }
    };
    
    // Capture phase is required because error events don't bubble
    window.addEventListener('error', handleMediaError, true);

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
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      fetch(`${API_BASE}/analytics/visit`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionToken,
          path: window.location.pathname
        }),
      }).catch(err => console.error('Failed to track visit:', err));
    }
    
    return () => window.removeEventListener('error', handleMediaError, true);
  }, []);

  return (
    <CurrencyProvider>
      <BrowserRouter>
        <CanonicalUpdater />
        <MetaPixel />
        <ErrorBoundary>
          <Suspense fallback={<GlobalSkeleton />}>
            <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/book-demo" element={<BookDemo />} />
            <Route path="/instagram-setup" element={<InstagramInstructions />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/a/:id" element={<AssetPage />} />
            <Route path="/credits" element={<CreditsExplainer />} />
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

            {/* Public Asset Page - dynamic route (must be before catch-all) */}
            <Route path="/:username/:slug" element={<AssetPage />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <Toaster />
      </BrowserRouter>
    </CurrencyProvider>
  );
}

export default App;
