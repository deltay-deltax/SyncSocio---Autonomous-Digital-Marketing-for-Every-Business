import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Rocket, CreditCard, BookOpen, PenTool, BarChart3, Bell, AlertTriangle, ExternalLink, AlertCircle, ChevronRight, Sparkles, BotMessageSquare, Zap, ShieldCheck, CheckCircle2, Gift, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRazorpay } from '../hooks/useRazorpay';
import { Checkout } from '@/components/Checkout';

import { getFriendlyErrorMessage } from '@/lib/errorHandler';
import Pricing from '@/components/Pricing';
import { useCurrency } from '@/contexts/CurrencyContext';
import fpPromise from '@fingerprintjs/fingerprintjs';

// ─── Types ───────────────────────────────────────────────────────────
type Screen = 'checklist' | 'instagram' | 'plan' | 'checkout' | 'activation';



// ─── Checklist Steps ─────────────────────────────────────────────────
interface StepItem {
  label: string;
  description: string;
  status: 'done' | 'active' | 'locked';
  icon: React.ReactNode;
}

// ─── Instagram Logo ──────────────────────────────────────────────────
const InstagramIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const InstagramGradientIcon = () => (
  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)' }}>
    <InstagramIcon className="text-white" size={32} />
  </div>
);


// ─── Shared wrapper ───────────────────────────────────────────────────
const Wrapper = ({ children, maxW = 'max-w-xl', screenKey }: { children: React.ReactNode; maxW?: string; screenKey: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
    {/* ambient blobs */}
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
    
    {/* Sign Out Button */}
    <div className="absolute top-6 right-6 z-[100]">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => {
          
          localStorage.removeItem('syncsocio_profile');
          localStorage.removeItem('syncsocio_setup_done');
          window.location.href = '/login';
        }}
        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        Sign Out
      </Button>
    </div>

    <motion.div
      key={screenKey}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45 }}
      className={`relative z-10 w-full ${maxW}`}
    >
      {children}
    </motion.div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────
const Setup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [screen, setScreen] = useState<Screen>(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    return stepParam === 'plan' ? 'plan' : stepParam === '1' ? 'instagram' : 'checklist';
  });
  const [igConnectStage, setIgConnectStage] = useState<'initial' | 'connecting' | 'success' | 'failed'>('initial');
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(0);
  const { toast } = useToast();
  const isRazorpayLoaded = useRazorpay();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { currency } = useCurrency();


  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    if (stepParam === 'plan') {
      setScreen('plan');
    } else if (stepParam === '1') {
      setScreen('instagram');
    }
  }, [location.search]);
  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    'Starter': localStorage.getItem('syncsocio_dm_automation') === 'true',
    'Growth': localStorage.getItem('syncsocio_dm_automation') === 'true',
    'Pro': localStorage.getItem('syncsocio_dm_automation') === 'true',
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgScrapeError, setBgScrapeError] = useState<string | null>(null);

  // Read any persisted background-scrape error from onboarding and clear it once shown
  useEffect(() => {
    const storedErr = localStorage.getItem('syncsocio_bg_scrape_error');
    if (storedErr) {
      setBgScrapeError(storedErr);
      localStorage.removeItem('syncsocio_bg_scrape_error');
    }
  }, []);

  // Coupon Checkout State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  // Validate Coupon handler
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponCodeInput.trim()) return;

    setCouponLoading(true);
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/coupons/validate`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({ code: couponCodeInput.toUpperCase().trim() })
      });
      const _rawJson23 = await res.json();
        const data = _rawJson23 && _rawJson23.success !== undefined ? (_rawJson23.success ? _rawJson23.data : _rawJson23) : _rawJson23;
      if (!res.ok) {
        throw new Error(data.message || 'Invalid coupon code');
      }
      setAppliedCoupon({
        code: data.code,
        discountPercentage: data.discountPercentage
      });
      localStorage.setItem('velocity_applied_coupon', data.code);
      setCouponCodeInput('');
    } catch (err: any) {
      console.error(err);
      setCouponError(getFriendlyErrorMessage(err));
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle OAuth callback parameters and fragment cleanup
  useEffect(() => {
    // Meta/Facebook appends #_=_ to the redirect URI after OAuth
    if (window.location.hash === '#_=_') {
      window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      if (localStorage.getItem('syncsocio_setup_done') === 'true') {
        navigate('/dashboard');
      } else {
        setScreen('plan');
      }
    }
    if (params.get('error')) {
      setError(params.get('error'));
      setScreen('instagram');
    }
  }, []);

  const handleInstagramConnect = async () => {
    console.log('🔄 Setup: Connect Instagram clicked. Starting OAuth flow...');
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

      if (!localStorage.getItem('syncsocio_profile')) {
        console.error('❌ Setup: No session token found');
        setError('Your session has expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      console.log('📡 Setup: Fetching auth URL from:', `${API_BASE}/auth/instagram/auth`);
      const res = await fetch(`${API_BASE}/auth/instagram/auth`, { credentials: 'include',
        headers: { }
      });

      if (res.status === 401 || res.status === 403) {
        console.error('❌ Setup: Auth session invalid (401/403)');
        
        setError('Your session has expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const data = await res.json().catch(() => ({}));
      console.log('🚀 Setup: Auth Response:', data);

      if (!res.ok) {
        throw new Error(data.message || `Request failed (${res.status})`);
      }
      if (data.url) {
        console.log('➡️ Setup: Redirecting to Meta OAuth:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Failed to get auth URL');
      }
    } catch (err: any) {
      console.error('❌ Setup: Connection Error:', err);
      setError(getFriendlyErrorMessage(err));
    }
  };

  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartFreeTrial = async () => {
    if (isStartingTrial) return;
    setIsStartingTrial(true);
    try {
      
      if (!localStorage.getItem('syncsocio_profile')) throw new Error('User not authenticated');

      const fp = await fpPromise.load();
      const result = await fp.get();
      const visitorId = result.visitorId;

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/auth/start-trial`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({ deviceFingerprint: visitorId })
      });

      const _rawJson22 = await res.json();
        const data = _rawJson22 && _rawJson22.success !== undefined ? (_rawJson22.success ? _rawJson22.data : _rawJson22) : _rawJson22;
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start free trial');
      }

      toast({ title: 'Free Trial Activated!', description: 'You have received 15 free credits.' });
      localStorage.setItem('syncsocio_setup_done', 'true');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to start free trial:', err);
      setError(getFriendlyErrorMessage(err));
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const proceedToCheckout = (planName: string) => {
    setSelectedPlan(planName);
    
    // --- META REVIEW BYPASS ---
    if (localStorage.getItem('isMetaReviewer') === 'true' || onboardingData?.userEmail === 'support@syncsocio.com') {
      localStorage.setItem('syncsocio_dm_automation', dmToggles[planName] ? 'true' : 'false');
      setScreen('activation');
      return;
    }
    // --- END BYPASS ---

    const basePrice = planName === 'Pro' ? (currency === 'USD' ? 45 : 3499) : planName === 'Growth' ? (currency === 'USD' ? 19 : 1499) : (currency === 'USD' ? 10 : 799);
    let currentPrice = basePrice;
    
    if (appliedCoupon) {
      if (appliedCoupon.code === 'LAUNCH') {
        currentPrice = basePrice;
      } else {
        const discount = appliedCoupon.discountPercentage;
        currentPrice = Math.round(currentPrice * (1 - discount / 100));
      }
    }
    
    setSelectedPlanAmount(currentPrice);
    setScreen('checkout');
  };

  const handleCheckoutSuccess = (verifyData: any) => {
    const isDmEnabled = localStorage.getItem('syncsocio_dm_automation') === 'true';
    localStorage.setItem('syncsocio_dm_automation', dmToggles[selectedPlan!] ? 'true' : 'false');
    setScreen('activation');
  };

  // Load onboarding data and determine recommendation
  useEffect(() => {
    const stored = localStorage.getItem('syncsocio_profile');
    if (stored) {
      const data = JSON.parse(stored);
      setOnboardingData(data);
      
      const freq = data.postingFrequency;
      const types = data.contentTypes || [];
      const hasReels = types.includes('Reels');
      
      if (freq === 'Once / wk' && !hasReels) {
        setRecommendedPlan('Starter');
      } else if (freq === '3-4x / wk' && !hasReels) {
        setRecommendedPlan('Growth');
      } else if (freq === 'Daily' || hasReels) {
        setRecommendedPlan('Pro');
      } else {
        setRecommendedPlan('Growth');
      }
    }
  }, []);



  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const igConnected = screen === 'plan' || screen === 'activation';
  const planChosen = screen === 'activation';

  const steps: StepItem[] = [
    { label: 'Brand Profile Created', description: 'Your brand DNA has been captured', status: 'done', icon: <Check size={16} /> },
    { label: 'Connect Instagram', description: 'Allow SyncSocio to post on your behalf', status: igConnected ? 'done' : 'active', icon: <InstagramIcon size={16} /> },
    { label: 'Choose Your Plan', description: 'Pick how often your agent posts', status: planChosen ? 'done' : igConnected ? 'active' : 'locked', icon: <CreditCard size={16} /> },
    { label: 'Agent Goes Live 🚀', description: 'Your autonomous agent activates', status: planChosen ? 'active' : 'locked', icon: <Rocket size={16} /> },
  ];

  // Activation animation
  useEffect(() => {
    if (screen !== 'activation') return;
    const msgs = ['Brand profile loaded', 'Instagram connected', `${selectedPlan} plan activated`];
    let i = 0;
    const timer = setInterval(async () => {
      i++;
      setActivationStep(i);
      if (i >= msgs.length + 1) {
        clearInterval(timer);
        localStorage.setItem('syncsocio_setup_done', 'true');
        
        // Save selected plan and synced preferences to backend
        try {
          
          const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
          
          const isDmEnabled = localStorage.getItem('syncsocio_dm_automation') === 'true';

          const payload = { 
            selectedPlan,
            DM_Automation_Service: isDmEnabled,
            isPaid: true
          };

          await fetch(`${API_BASE}/profile`, { credentials: 'include',
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              },
            body: JSON.stringify(payload)
          });

          // Assign credits for chosen plan
          if (selectedPlan) {
            try {
              const isDmEnabled = localStorage.getItem('velocity_dm_automation') === 'true';
              const couponCode = localStorage.getItem('velocity_applied_coupon') || undefined;

              const credRes = await fetch(`${API_BASE}/credits/assign`, { credentials: 'include',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  },
                body: JSON.stringify({ 
                  plan: selectedPlan,
                  isDmEnabled,
                  couponCode
                })
              });
              if (credRes.ok) {
                const _rawJson21 = await credRes.json();
                  const credData = _rawJson21 && _rawJson21.success !== undefined ? (_rawJson21.success ? _rawJson21.data : _rawJson21) : _rawJson21;
                localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
                // Clean up applied coupon from storage
                localStorage.removeItem('velocity_applied_coupon');
              }
            } catch (credErr) {
              console.error('[Setup] Failed to assign credits:', credErr);
            }
          }

          // Update local storage to match selected plan
          const updatedProfile = { ...onboardingData, selectedPlan };
          localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
        } catch (err) {
          console.error('Failed to save selected plan:', err);
        }
        
        setTimeout(() => navigate('/dashboard'), 1800);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [screen, selectedPlan, navigate]);

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 1 — CHECKLIST
  // ════════════════════════════════════════════════════════════════════
  if (screen === 'checklist') {
    return (
      <Wrapper screenKey={screen}>
        {/* ── Persistent auto-scan error banner ── */}
        {bgScrapeError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-lg">
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-destructive text-destructive-foreground shadow-2xl shadow-destructive/30 border border-destructive/60 backdrop-blur-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="flex-1 text-sm font-semibold leading-snug">{bgScrapeError}</p>
              <button
                onClick={() => setBgScrapeError(null)}
                className="shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Dismiss"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest mb-4">
              <Rocket size={12} /> Almost there
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Let's activate your agent</h1>
            <p className="text-sm text-muted-foreground">2 quick steps and your AI starts working</p>
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                {/* Vertical connector */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[17px] top-[36px] w-[2px] h-[calc(100%-8px)] bg-border" />
                )}

                {/* Icon circle */}
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    step.status === 'done'
                      ? 'bg-blue-500 text-white'
                      : step.status === 'active'

                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.status === 'done' ? <Check size={16} /> : step.icon}
                </div>

                {/* Content */}
                <div className={`pb-8 ${step.status === 'locked' ? 'opacity-40' : ''}`}>
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>

                  {step.status === 'active' && i === 1 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        onClick={() => setScreen('instagram')}
                        className="gradient-bg text-primary-foreground border-0 text-xs px-5 h-9 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                      >
                        Connect Instagram Account →
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setScreen('plan')}
                        className="text-xs px-5 h-9 rounded-xl border border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-4">This takes less than 2 minutes</p>
        </div>
      </Wrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 2 — CONNECT INSTAGRAM
  // ════════════════════════════════════════════════════════════════════
  if (screen === 'instagram') {
    const perms = [
      { icon: <BookOpen size={16} />, label: 'Read your posts and profile' },
      { icon: <PenTool size={16} />, label: 'Publish content automatically' },
      { icon: <BarChart3 size={16} />, label: 'Access post insights and analytics' },
      { icon: <Bell size={16} />, label: 'Monitor comments and engagement' },
    ];

    return (
      <Wrapper maxW="max-w-md" screenKey={screen}>
        <div className="glass-card rounded-3xl p-8 sm:p-10 text-center">
          <div className="flex justify-center mb-6">
            <InstagramGradientIcon />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Connect your Instagram</h1>
          <p className="text-sm text-muted-foreground mb-8">
            SyncSocio needs permission to read and publish content on your behalf
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-semibold text-destructive mb-1">Connection Failed</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-3 text-left mb-6">
            {perms.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                <span className="text-primary">{p.icon}</span>
                {p.label}
              </div>
            ))}
          </div>

          {/* Setup Guide */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-left mb-8 relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate('/instagram-setup')}>
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <BookOpen size={48} className="text-primary" />
            </div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Setup Guide & Requirements</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Check the requirements for connecting your Instagram Business or Creator account to SyncSocio.
                </p>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  View Guide <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleInstagramConnect}
            className="w-full h-12 text-sm font-semibold"
            style={{ background: '#1877F2' }}
          >
            <svg className="w-5 h-5 fill-white mr-2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Continue with Facebook
          </Button>


          <Button
            variant="ghost"
            onClick={() => {
              if (localStorage.getItem('syncsocio_setup_done') === 'true') {
                navigate('/dashboard');
              } else {
                setScreen('plan');
              }
            }}
            className="w-full h-11 mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border"
          >
            Skip for Now
          </Button>

          <p className="text-[11px] text-muted-foreground mt-4">You can disconnect at any time from Settings</p>
        </div>
      </Wrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 3 — CHOOSE PLAN
  // ════════════════════════════════════════════════════════════════════
  if (screen === 'plan') {
    const hasUsedTrial = onboardingData?.freeTrialUsed || (onboardingData?.userPlan || '').toLowerCase().includes('trial');
    return (
      <Wrapper maxW="max-w-7xl" screenKey={screen}>
        <div className="-mt-12 sm:-mt-16">
          <Pricing 
            onWaitlistClick={(planName) => proceedToCheckout(planName || 'Starter')} 
            onFreeTrialClick={hasUsedTrial ? undefined : handleStartFreeTrial}
            isTrialLoading={isStartingTrial}
          />
        </div>
      </Wrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 3.5 — CHECKOUT
  // ════════════════════════════════════════════════════════════════════
  if (screen === 'checkout') {
    return (
      <Wrapper maxW="max-w-7xl" screenKey="checkout">
        <Checkout
          baseAmount={selectedPlanAmount}
          description={`Subscription: ${selectedPlan} Plan`}
          type="plan_purchase"
          planName={selectedPlan || ''}
          creditsAdded={
            selectedPlan === 'Pro' ? 1000 :
            selectedPlan === 'Growth' ? 400 : 160
          }
          onSuccess={handleCheckoutSuccess}
          onBack={() => setScreen('plan')}
        />
      </Wrapper>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 4 — AGENT ACTIVATION
  // ════════════════════════════════════════════════════════════════════
  const activationMessages = [
    'Brand profile loaded',
    'Instagram connected',
    `${selectedPlan} plan activated`,
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Pulsing glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full bg-primary/10 animate-pulse blur-[80px]" />
      </div>

      <div className="relative z-10 text-center px-6">
        {/* Logo pulse */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-10 w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-primary/30"
        >
          <Rocket className="text-primary-foreground" size={36} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-semibold text-muted-foreground mb-8"
        >
          Activating your agent...
        </motion.p>

        <div className="space-y-3 max-w-xs mx-auto text-left">
          {activationMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={activationStep > i ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </div>

              <span className="text-sm text-foreground">{msg}</span>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {activationStep > activationMessages.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-10"
            >
              <p className="text-2xl font-bold text-foreground">🚀 Your agent is live</p>
              <p className="text-xs text-muted-foreground mt-2">Redirecting to dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Setup;
