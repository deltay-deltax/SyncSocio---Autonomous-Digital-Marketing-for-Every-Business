import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Rocket, CreditCard, BookOpen, PenTool, BarChart3, Bell, AlertTriangle, ExternalLink, AlertCircle, ChevronRight, Sparkles, BotMessageSquare, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────
type Screen = 'checklist' | 'instagram' | 'plan' | 'activation';

interface Plan {
  name: string;
  price: string;
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
    name: 'Brand',
    price: '₹799',
    period: '/month',
    frequency: 'Schedule up to 30 posts',
    formats: 'All image generation types',
    postsPerMonth: '200 credits/month',
    features: [
      "200 credits/month",
      "1 active brand profile",
      "All image generation types",
      "Festival calendar",
      "Hinglish + 5 languages",
      "Caption + hashtags — free",
      "Schedule up to 30 posts",
      "Post scheduling — free",
      "Analytics dashboard — free",
      "Email support",
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
  },
  {
    name: 'Growth',
    price: '₹2199',
    period: '/month',
    frequency: 'Best time to post analysis',
    formats: 'Reels + Video + UGC + DMs',
    postsPerMonth: '700 credits/month',
    features: [
      "700 credits/month",
      "3 brand profiles",
      "Everything in Brand",
      "All-in-One Drop feature",
      "AI Mode (Auto Generate)",
      "E-commerce listing generator",
      "UGC video generation",
      "Product video generation",
      "DM Automation",
      "WhatsApp campaign generator",
      "Best time to post analysis",
      "Priority generation",
      "WhatsApp support",
    ],
    popular: true,
    cta: 'Get Started',
    ctaStyle: 'inverted',
  },
];

const TOPUPS = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

// Credits awarded per plan (shown in UI — actual amount is random within range)
const PLAN_CREDITS_DISPLAY: Record<string, { label: string; color: string; glow: string }> = {
  'Brand':  { label: '200 Credits', color: 'from-sky-400 to-blue-600', glow: 'shadow-blue-500/30' },
  'Growth': { label: '700 Credits', color: 'from-violet-500 to-purple-700', glow: 'shadow-purple-500/40' },
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    if (stepParam === '1') {
      setScreen('instagram');
    }
  }, [location.search]);
  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    'Brand': localStorage.getItem('syncsocio_dm_automation') === 'true',
    'Growth': localStorage.getItem('syncsocio_dm_automation') === 'true',
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);
  const [warningPlan, setWarningPlan] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [pendingSync, setPendingSync] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message);
    }
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
        setRecommendedPlan('Brand');
      } else if (freq === '3-4x / wk' && !hasReels) {
        setRecommendedPlan('Brand');
      } else if (freq === 'Daily' || hasReels) {
        setRecommendedPlan('Growth');
      } else {
        setRecommendedPlan('Growth');
      }
    }
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    if (!onboardingData) {
      setSelectedPlan(plan.name);
      setScreen('activation');
      return;
    }
    const currentFreq = onboardingData.postingFrequency;
    const currentTypes = onboardingData.contentTypes || [];
    const hasReels = currentTypes.includes('Reels');

    let issues = [];
    let sync: any = {};

    if (plan.name === 'Brand') {
      if (currentFreq === 'Daily') {
        issues.push('Frequency will be reduced to 3-4x/wk');
        sync.postingFrequency = '3-4x / wk';
      }
      if (hasReels) {
        issues.push('Reels will be disabled');
        sync.contentTypes = currentTypes.filter((t: string) => t !== 'Reels');
      }
    }

    if (issues.length > 0) {
      setSyncData(sync);
      setWarningPlan(plan.name);
    } else {
      localStorage.setItem('syncsocio_dm_automation', dmToggles[plan.name] ? 'true' : 'false');
      setSelectedPlan(plan.name);
      setScreen('activation');
    }
  };

  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const [syncData, setSyncData] = useState<any>(null);

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
            isPaid: true,
            ...(syncData || {})
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
              const credRes = await fetch(`${API_BASE}/credits/assign`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan: selectedPlan })
              });
              if (credRes.ok) {
                const credData = await credRes.json();
                localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
              }
            } catch (credErr) {
              console.error('[Setup] Failed to assign credits:', credErr);
            }
          }

          // Update local storage to match new sync
          if (syncData) {
            const updatedProfile = { ...onboardingData, ...syncData, selectedPlan };
            localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
          }
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
    return (
      <Wrapper maxW="max-w-7xl" screenKey={screen}>
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Choose how active your agent is</h1>
          <p className="text-sm text-muted-foreground">Upgrade or downgrade anytime</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const isDmEnabled = dmToggles[plan.name];
            const basePrice = parseInt(plan.price.replace('₹', ''));
            const currentPrice = basePrice + (isDmEnabled ? 399 : 0);
            const credInfo = PLAN_CREDITS_DISPLAY[plan.name];

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={cn(
                  "relative rounded-2xl p-6 flex flex-col transition-all duration-300",
                  plan.popular ? "bg-primary text-primary-foreground ring-2 ring-primary shadow-xl scale-[1.02]" : "glass-card hover:border-primary/30",
                  recommendedPlan === plan.name && !plan.popular ? "ring-2 ring-emerald-500/50 scale-[1.01] shadow-lg shadow-emerald-500/5" : ""
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-card text-primary shadow-md">
                    Most Popular
                  </span>
                )}
                
                {recommendedPlan === plan.name && (
                  <div className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md border",
                    plan.popular ? "bg-emerald-500 text-white border-emerald-400" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    <Sparkles size={10} /> Recommended for you
                  </div>
                )}

                {/* ── Credits Badge ─────────────────────────────────── */}
                {credInfo && (
                  <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${credInfo.color} shadow-lg ${credInfo.glow}`}>
                    <Zap size={14} className="text-white fill-white shrink-0" />
                    <span className="text-white text-xs font-black tracking-widest uppercase">{credInfo.label}</span>
                    <span className="ml-auto text-white/70 text-[10px] font-bold">Included</span>
                  </div>
                )}

                <h3 className="text-sm font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-3xl font-bold">₹{currentPrice}</span>
                  <span className={`text-xs ${plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{plan.period}</span>
                </div>
                <p className={`text-[11px] mb-1 ${plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.frequency} · {plan.formats}
                </p>
                <p className={`text-xs font-semibold mb-4 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.postsPerMonth}
                </p>

                {/* DM Automation Toggle */}
                {plan.name === 'Brand' && (
                  <div className={`flex items-center justify-between p-4 rounded-xl mb-6 ${plan.popular ? "bg-white/10" : "bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <BotMessageSquare size={20} className={plan.popular ? "text-primary-foreground" : "text-primary"} />
                      <div className="text-left">
                        <p className={`text-sm font-bold ${plan.popular ? "text-white" : "text-foreground"}`}>DM Automation</p>
                        <p className={`text-xs ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>+₹399 / month</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(plan.name)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        isDmEnabled 
                          ? (plan.popular ? 'bg-white' : 'bg-primary') 
                          : (plan.popular ? 'bg-primary-foreground/30' : 'bg-input')
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                          isDmEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                <ul className="space-y-2 mb-6 flex-1 text-left">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check size={14} className={`shrink-0 mt-0.5 ${plan.popular ? 'text-primary-foreground' : 'text-primary'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                  {isDmEnabled && (
                    <li className="flex items-start gap-2 text-xs font-bold">
                      <Check size={14} className={`shrink-0 mt-0.5 ${plan.popular ? 'text-primary-foreground' : 'text-primary'}`} />
                      <span>Automated DM Replies & Lead Capture</span>
                    </li>
                  )}
                </ul>

              <Button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full text-xs font-semibold mt-auto ${
                  plan.popular
                    ? 'bg-card text-primary hover:bg-card/90'
                    : plan.ctaStyle === 'primary'
                    ? 'gradient-bg text-primary-foreground border-0'
                    : 'bg-transparent border border-border text-foreground hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Button>
            </motion.div>
          );
        })}
        </div>

        {/* Plan Drift Warning Overlay */}
        <AnimatePresence>
          {warningPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-sm w-full glass-card rounded-[2.5rem] p-8 shadow-2xl border-amber-500/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                  <AlertTriangle className="text-amber-500" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">Sync Preferences?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Picking <span className="font-bold text-foreground">{warningPlan}</span> will adjust your onboarding preferences (Frequency/Formats) to fit this plan's limitations.
                </p>
                <div className="space-y-3">
                  <Button 
                    className="w-full gradient-bg text-white h-12 rounded-xl text-xs font-bold"
                    onClick={() => {
                      setSelectedPlan(warningPlan);
                      setWarningPlan(null);
                      setScreen('activation');
                    }}
                  >
                    Auto-Sync & Activate
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full h-11 text-xs font-bold text-muted-foreground"
                    onClick={() => {
                      setWarningPlan(null);
                      setSyncData(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
