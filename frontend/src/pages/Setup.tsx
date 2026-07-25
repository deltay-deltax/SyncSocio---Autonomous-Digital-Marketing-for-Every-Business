import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Rocket, CreditCard, BookOpen, PenTool, BarChart3, Bell, AlertTriangle, ExternalLink, AlertCircle, ChevronRight, Sparkles, BotMessageSquare, Zap, ShieldCheck, CheckCircle2, Gift } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRazorpay } from '../hooks/useRazorpay';
import { Checkout } from '@/components/Checkout';

import { getFriendlyErrorMessage } from '@/lib/errorHandler';

// ─── Types ───────────────────────────────────────────────────────────
type Screen = 'checklist' | 'instagram' | 'plan' | 'checkout' | 'activation';

interface Plan {
  name: string;
  price: string;
  originalPrice?: number;
  period: string;
  frequency: string;
  formats: string;
  postsPerMonth: string;
  features: string[];
  popular?: boolean;
  cta: string;
  ctaStyle: 'outline' | 'primary' | 'inverted';
}

// ─── Plan Data ───────────────────────────────────────────────────────
const plans: Plan[] = [
  {
    name: 'Starter',
    price: '₹799',
    originalPrice: 999,
    period: '/month',
    frequency: 'Queue up to 30 scheduled posts',
    formats: 'All image generation types',
    postsPerMonth: '200 credits/month',
    features: [
      "200 credits/month",
      "Soft copy images",
      "500 email campaigns/month",
      "1 active brand profile",
      "Import or Add Up to 50 Products",
      "All image generation types",
      "E-commerce listing generator",
      "Festival calendar",
      "English + 13 languages",
      "Queue up to 30 scheduled posts",
      "Email support",
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
  },
  {
    name: 'Elite',
    price: '₹2199',
    originalPrice: 3199,
    period: '/month',
    frequency: 'Best time to post analysis',
    formats: 'UGC & Product Video + All-in-One Drops',
    postsPerMonth: '700 credits/month (70 AI images)',
    features: [
      "700 credits/month (70 AI images)",
      "HD quality images",
      "2,000 email campaigns/month",
      "2 brand profiles",
      "Import or Add Up to 100 Products",
      "Everything in Starter",
      "All-in-One Drop feature",
      "UGC & Product video generation",
      "Best time to post analysis",
      "Unlimited scheduled queue",
      "Priority WhatsApp support",
    ],
    popular: true,
    cta: 'Get Started',
    ctaStyle: 'inverted',
  },
  {
    name: 'Agency',
    price: '₹4999',
    originalPrice: 6999,
    period: '/month',
    frequency: 'Highest Priority generation',
    formats: 'HD Quality Images + Unlimited Drops',
    postsPerMonth: '1,750 credits/month (175 AI images)',
    features: [
      "1,750 credits/month (175 AI images)",
      "10 credits per generation",
      "⚡ 45-55% Margin",
      "HD quality images",
      "10,000 email campaigns/month",
      "8 active brand profiles",
      "Import or Add Up to 500 Products",
      "Everything in Elite",
      "All-in-One Drop feature",
      "UGC & Product video generation",
      "Dedicated Account Manager",
      "Unlimited scheduled queue",
      "Highest Priority generation",
      "24/7 Priority support",
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
  },
  {
    name: 'Custom',
    price: 'Talk to Us',
    period: '',
    frequency: 'Enterprise Scale & Workflows',
    formats: 'Custom AI Models & API Integration',
    postsPerMonth: 'Custom Credit Package',
    features: [
      "Custom credit volume & limits",
      "Book a custom plan tailored to you",
      "Unlimited active brand profiles",
      "Dedicated Account Manager & SLA",
      "Custom AI model & prompt tuning",
      "24/7 Priority phone & WhatsApp support",
      "White-label options & custom invoicing",
    ],
    cta: 'Talk to Us',
    ctaStyle: 'outline',
  }
];

const TOPUPS = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

// Credits awarded per plan (shown in UI)
const PLAN_CREDITS_DISPLAY: Record<string, { label: string; color: string; glow: string }> = {
  'Starter':  { label: '200 Credits', color: 'from-sky-400 to-blue-600', glow: 'shadow-blue-500/30' },
  'Elite': { label: '700 Credits', color: 'from-violet-500 to-purple-700', glow: 'shadow-purple-500/40' },
  'Agency': { label: '1,750 Credits', color: 'from-emerald-500 to-teal-700', glow: 'shadow-emerald-500/40' },
  'Custom': { label: 'Custom Credits', color: 'from-indigo-500 to-purple-800', glow: 'shadow-indigo-500/40' },
};

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
          localStorage.removeItem('token');
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
    return stepParam === '1' ? 'instagram' : 'checklist';
  });
  const [igConnectStage, setIgConnectStage] = useState<'initial' | 'connecting' | 'success' | 'failed'>('initial');
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(0);
  const { toast } = useToast();
  const isRazorpayLoaded = useRazorpay();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);


  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    if (stepParam === '1') {
      setScreen('instagram');
    }
  }, [location.search]);
  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    'Starter': localStorage.getItem('syncsocio_dm_automation') === 'true',
    'Elite': localStorage.getItem('syncsocio_dm_automation') === 'true',
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Coupon Checkout State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Meta Tester State
  const [metaTesterIgHandle, setMetaTesterIgHandle] = useState('');
  const [metaTesterLoading, setMetaTesterLoading] = useState(false);
  const [metaTesterSuccess, setMetaTesterSuccess] = useState(false);

  // Validate Coupon handler
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponCodeInput.trim()) return;

    setCouponLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCodeInput.toUpperCase().trim() })
      });
      const data = await res.json();
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

  const handleMetaTesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaTesterIgHandle.trim()) {
      toast({ title: 'Username required', description: 'Please enter your Instagram username.', variant: 'destructive' });
      return;
    }
    setMetaTesterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/profile/request-meta-tester`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ igHandle: metaTesterIgHandle.trim() })
      });
      if (!res.ok) throw new Error('Failed to request tester access');
      
      // Persist state in localStorage so it survives reloads
      const stored = localStorage.getItem('syncsocio_profile');
      let profile = stored ? JSON.parse(stored) : {};
      profile.metaTesterStatus = 'pending';
      localStorage.setItem('syncsocio_profile', JSON.stringify(profile));
      setOnboardingData(profile);
      
      setMetaTesterSuccess(true);
      toast({ title: 'Request Sent', description: 'We will approve your Meta tester request shortly.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setMetaTesterLoading(false);
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
        navigate('/dashboard/feed');
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
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

      if (!token) {
        console.error('❌ Setup: No session token found');
        setError('Your session has expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      console.log('📡 Setup: Fetching auth URL from:', `${API_BASE}/auth/instagram/auth`);
      const res = await fetch(`${API_BASE}/auth/instagram/auth`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        console.error('❌ Setup: Auth session invalid (401/403)');
        localStorage.removeItem('token');
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

  const proceedToCheckout = (planName: string) => {
    setSelectedPlan(planName);
    
    // --- META REVIEW BYPASS ---
    if (localStorage.getItem('isMetaReviewer') === 'true' || onboardingData?.userEmail === 'supportvelocitydm@gmail.com') {
      localStorage.setItem('syncsocio_dm_automation', dmToggles[planName] ? 'true' : 'false');
      setScreen('activation');
      return;
    }
    // --- END BYPASS ---

    const basePrice = planName === 'Agency' ? 4999 : planName === 'Elite' ? 2199 : 599;
    let currentPrice = basePrice;
    
    if (appliedCoupon) {
      if (appliedCoupon.code === 'LAUNCH') {
        currentPrice = planName === 'Agency' ? 4999 : planName === 'Elite' ? 2199 : 599;
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
        setRecommendedPlan('Starter');
      } else if (freq === 'Daily' || hasReels) {
        setRecommendedPlan('Elite');
      } else {
        setRecommendedPlan('Elite');
      }
    }
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === 'Custom') {
      window.location.href = "mailto:support@syncsocio.com?subject=Book%20a%20Custom%20Plan%20Inquiry";
      return;
    }
    proceedToCheckout(plan.name);
  };

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
          const token = localStorage.getItem('token');
          const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
          
          const isDmEnabled = localStorage.getItem('syncsocio_dm_automation') === 'true';

          const payload = { 
            selectedPlan,
            DM_Automation_Service: isDmEnabled,
            isPaid: true
          };

          await fetch(`${API_BASE}/profile`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          // Assign credits for chosen plan
          if (selectedPlan) {
            try {
              const isDmEnabled = localStorage.getItem('velocity_dm_automation') === 'true';
              const couponCode = localStorage.getItem('velocity_applied_coupon') || undefined;

              const credRes = await fetch(`${API_BASE}/credits/assign`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                  plan: selectedPlan,
                  isDmEnabled,
                  couponCode
                })
              });
              if (credRes.ok) {
                const credData = await credRes.json();
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
                    <Button
                      onClick={() => setScreen('instagram')}
                      className="mt-3 gradient-bg text-primary-foreground border-0 text-xs px-5 h-9"
                    >
                      Connect Instagram Account →
                    </Button>
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

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 text-left mb-8 relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer" onClick={() => navigate('/instagram-setup')}>
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <AlertTriangle size={48} className="text-amber-500" />
            </div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1 group-hover:text-amber-500 transition-colors">Important: Setup Checklist</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Meta's "Business" API requires strict account settings. Avoid connection errors by following the checklist.
                </p>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  View Setup Requirements <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          {(onboardingData?.isTesterEnabled || onboardingData?.userEmail === 'supportvelocitydm@gmail.com' || localStorage.getItem('isMetaReviewer') === 'true') ? (
            <Button
              onClick={handleInstagramConnect}
              className="w-full h-12 text-sm font-semibold"
              style={{ background: '#1877F2' }}
            >
              <svg className="w-5 h-5 fill-white mr-2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </Button>
          ) : (
            <div className="bg-muted/30 border border-border rounded-2xl p-5 text-left mb-6 relative">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Meta App in Review
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                SyncSocio is currently waiting on Meta approval. To connect right now, request tester access below.
              </p>

              {(metaTesterSuccess || onboardingData?.metaTesterStatus === 'pending') ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold">
                  <CheckCircle2 size={14} /> Request Pending Approval
                </div>
              ) : (
                <form onSubmit={handleMetaTesterSubmit} className="space-y-3">
                  <Input 
                    placeholder="Instagram Username (e.g. @mybrand)" 
                    value={metaTesterIgHandle}
                    onChange={e => setMetaTesterIgHandle(e.target.value)}
                    className="text-xs h-10"
                  />
                  <Button type="submit" disabled={metaTesterLoading} className="w-full h-10 text-xs font-semibold gradient-bg text-white">
                    {metaTesterLoading ? 'Submitting...' : 'Request Tester Access'}
                  </Button>
                </form>
              )}

              <Button
                disabled
                className="w-full h-12 text-sm font-semibold opacity-50 cursor-not-allowed mt-4"
                style={{ background: '#1877F2' }}
              >
                <svg className="w-5 h-5 fill-white mr-2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Continue with Facebook (Locked)
              </Button>
            </div>
          )}


          <Button
            variant="ghost"
            onClick={() => {
              if (localStorage.getItem('syncsocio_setup_done') === 'true') {
                navigate('/dashboard/feed');
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
    const discount = appliedCoupon ? appliedCoupon.discountPercentage : 0;

    return (
      <Wrapper maxW="max-w-7xl" screenKey={screen}>
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Choose how active your agent is</h1>
          <p className="text-sm text-muted-foreground">Upgrade or downgrade anytime</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            let currentPrice = plan.name === 'Agency' ? 4999 : plan.name === 'Elite' ? 2199 : plan.name === 'Custom' ? 0 : 799;
            const originalPrice = plan.originalPrice;
            const discountPercent = originalPrice ? Math.floor(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
            const credInfo = PLAN_CREDITS_DISPLAY[plan.name];

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={cn(
                  "relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300",
                  plan.popular
                    ? "bg-gradient-to-b from-primary/95 via-primary to-primary text-primary-foreground ring-2 ring-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10"
                    : plan.name === 'Custom'
                    ? "bg-card border border-primary/30 text-card-foreground shadow-lg hover:border-primary/50"
                    : "bg-card border border-border/60 text-card-foreground shadow-sm hover:border-border hover:shadow-md",
                  recommendedPlan === plan.name && !plan.popular ? "ring-2 ring-emerald-500/50 scale-[1.01]" : ""
                )}
              >
                {/* Top Badge */}
                {plan.popular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 shadow-md z-20 whitespace-nowrap">
                    Most Popular
                  </div>
                ) : plan.name === 'Custom' ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-md z-20 whitespace-nowrap">
                    Enterprise
                  </div>
                ) : recommendedPlan === plan.name ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-md z-20 flex items-center gap-1 whitespace-nowrap">
                    <Sparkles size={10} /> Recommended
                  </div>
                ) : null}

                <div>
                  {/* Header & Title */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-extrabold tracking-tight">{plan.name}</h3>
                    {credInfo && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        plan.popular
                          ? "bg-white/20 text-white backdrop-blur-sm"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {credInfo.label}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs min-h-[36px] leading-relaxed mb-4 ${
                    plan.popular ? "text-primary-foreground/85" : "text-muted-foreground"
                  }`}>
                    {plan.frequency}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pt-3 border-t border-border/20">
                    {plan.name !== 'Custom' ? (
                      <div>
                        {originalPrice && currentPrice < originalPrice && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs line-through font-semibold ${
                              plan.popular ? "text-primary-foreground/60" : "text-muted-foreground/60"
                            }`}>
                              ₹{originalPrice}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              plan.popular ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600"
                            }`}>
                              {discountPercent}% OFF
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight">₹{currentPrice}</span>
                          <span className={`text-xs font-semibold ${
                            plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {plan.period}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-1">
                        <span className="text-3xl font-black tracking-tight">Talk to Us</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Bespoke pricing & volume</p>
                      </div>
                    )}
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-2.5 mb-8 text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs font-medium leading-normal">
                        <Check size={15} className={`shrink-0 mt-0.5 ${
                          plan.popular ? 'text-white' : 'text-primary'
                        }`} />
                        <span className={plan.popular ? "text-primary-foreground/95" : "text-foreground/90"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-6 rounded-2xl font-bold text-xs tracking-wide shadow-md transition-all ${
                      plan.popular
                        ? 'bg-white text-primary hover:bg-white/90 hover:shadow-lg'
                        : plan.ctaStyle === 'primary'
                        ? 'gradient-bg text-primary-foreground border-0 hover:opacity-95'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
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
          creditsAdded={selectedPlan === 'Elite' ? 700 : 200}
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
