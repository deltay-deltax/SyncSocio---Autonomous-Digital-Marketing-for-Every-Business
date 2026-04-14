import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Rocket, CreditCard, BookOpen, PenTool, BarChart3, Bell, AlertTriangle, ExternalLink, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
    name: 'Bootstrapper',
    price: '₹0',
    period: '/month',
    frequency: 'Once a week',
    formats: 'Static only',
    postsPerMonth: '4 posts/month',
    features: ['Basic Brand Mapping', '1 Active Agent', 'Weekly Reports', 'Community Support'],
    cta: 'Start Free',
    ctaStyle: 'outline',
  },
  {
    name: 'Velocity Starter',
    price: '₹199',
    period: '/month',
    frequency: '3-4x a week',
    formats: 'Static + Carousels',
    postsPerMonth: '16 posts/month',
    features: ['Deep DNA Synthesis', '3 Active Agents', 'Daily Velocity Sync', 'Cross-Platform Multi-Post', 'Priority Support'],
    cta: 'Get Started',
    ctaStyle: 'primary',
  },
  {
    name: 'Velocity Pro',
    price: '₹499',
    period: '/month',
    frequency: 'Daily',
    formats: 'Static + Carousels + Reels',
    postsPerMonth: '30 posts/month',
    features: ['Everything in Starter', 'Unlimited Agents', 'Custom Voice Models', '24/7 Strategic Support', 'Full Creative Control', 'Custom Integrations'],
    popular: true,
    cta: 'Get Started',
    ctaStyle: 'inverted',
  },
  {
    name: 'Empire',
    price: '₹999',
    period: '/month',
    frequency: 'Daily',
    formats: 'All content types',
    postsPerMonth: '30+ posts/month',
    features: ['Everything in Pro', 'Dedicated Account Manager', 'White-label Reports', 'API Access', 'Team Collaboration', 'Advanced Analytics', 'Custom Integrations'],
    cta: 'Contact Sales',
    ctaStyle: 'outline',
  },
];

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


// ─── Main Component ──────────────────────────────────────────────────
const Setup = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('checklist');
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
      setScreen('plan');
    }
    if (params.get('error')) {
      setError(params.get('error'));
      setScreen('instagram');
    }
  }, []);

  const handleInstagramConnect = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/auth/instagram/auth`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.message || 'Failed to get auth URL');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  // Load onboarding data and determine recommendation
  useEffect(() => {
    const stored = localStorage.getItem('velocity_profile');
    if (stored) {
      const data = JSON.parse(stored);
      setOnboardingData(data);
      
      const freq = data.postingFrequency;
      const types = data.contentTypes || [];
      const hasReels = types.includes('Reels');
      
      if (freq === 'Once / wk' && !hasReels) {
        setRecommendedPlan('Bootstrapper');
      } else if (freq === '3-4x / wk' && !hasReels) {
        setRecommendedPlan('Velocity Starter');
      } else if (freq === 'Daily' || hasReels) {
        setRecommendedPlan('Velocity Pro');
      } else {
        setRecommendedPlan('Velocity Pro');
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

    if (plan.name === 'Bootstrapper') {
      if (currentFreq !== 'Once / wk') {
        issues.push('Frequency will be reduced to Weekly');
        sync.postingFrequency = 'Once / wk';
      }
      if (currentTypes.length > 1 || (currentTypes.length === 1 && !currentTypes.includes('Static Posts'))) {
        issues.push('Reels & Carousels will be disabled');
        sync.contentTypes = ['Static Posts'];
      }
    } else if (plan.name === 'Velocity Starter') {
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
      setSelectedPlan(plan.name);
      setScreen('activation');
    }
  };

  const [syncData, setSyncData] = useState<any>(null);

  const igConnected = screen === 'plan' || screen === 'activation';
  const planChosen = screen === 'activation';

  const steps: StepItem[] = [
    { label: 'Brand Profile Created', description: 'Your brand DNA has been captured', status: 'done', icon: <Check size={16} /> },
    { label: 'Connect Instagram', description: 'Allow Velocity to post on your behalf', status: igConnected ? 'done' : 'active', icon: <InstagramIcon size={16} /> },
    { label: 'Choose Your Plan', description: 'Pick how often your agent posts', status: planChosen ? 'done' : igConnected ? 'active' : 'locked', icon: <CreditCard size={16} /> },
    { label: 'Agent Goes Live 🚀', description: 'Your autonomous agent activates', status: planChosen ? 'active' : 'locked', icon: <Rocket size={16} /> },
  ];

  // Activation animation
  useEffect(() => {
    if (screen !== 'activation') return;
    const msgs = ['Brand profile loaded', 'Instagram connected', `${selectedPlan} plan activated`, 'First post generating...'];
    let i = 0;
    const timer = setInterval(async () => {
      i++;
      setActivationStep(i);
      if (i >= msgs.length + 1) {
        clearInterval(timer);
        localStorage.setItem('velocity_setup_done', 'true');
        
        // Save selected plan and synced preferences to backend
        try {
          const token = localStorage.getItem('token');
          const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
          
          const payload = { 
            selectedPlan,
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

          // Update local storage to match new sync
          if (syncData) {
            const updatedProfile = { ...onboardingData, ...syncData, selectedPlan };
            localStorage.setItem('velocity_profile', JSON.stringify(updatedProfile));
          }
        } catch (err) {
          console.error('Failed to save selected plan:', err);
        }
        
        setTimeout(() => navigate('/dashboard'), 1800);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [screen, selectedPlan, navigate]);

  // ── Shared wrapper ──
  const Wrapper = ({ children, maxW = 'max-w-xl' }: { children: React.ReactNode; maxW?: string }) => (
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
            localStorage.removeItem('velocity_profile');
            localStorage.removeItem('velocity_setup_done');
            window.location.href = '/login';
          }}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          Sign Out
        </Button>
      </div>

      <motion.div
        key={screen}
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

  // ════════════════════════════════════════════════════════════════════
  // SCREEN 1 — CHECKLIST
  // ════════════════════════════════════════════════════════════════════
  if (screen === 'checklist') {
    return (
      <Wrapper>
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
      <Wrapper maxW="max-w-md">
        <div className="glass-card rounded-3xl p-8 sm:p-10 text-center">
          <div className="flex justify-center mb-6">
            <InstagramGradientIcon />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Connect your Instagram</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Velocity needs permission to read and publish content on your behalf
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
      <Wrapper maxW="max-w-7xl">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Choose how active your agent is</h1>
          <p className="text-sm text-muted-foreground">Upgrade or downgrade anytime</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
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

              <h3 className="text-sm font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={`text-xs ${plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{plan.period}</span>
              </div>
              <p className={`text-[11px] mb-1 ${plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {plan.frequency} · {plan.formats}
              </p>
              <p className={`text-xs font-semibold mb-4 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                {plan.postsPerMonth}
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <Check size={13} className={plan.popular ? 'text-primary-foreground' : 'text-primary'} />
                    {f}
                  </li>
                ))}
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
          ))}
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
    'First post generating...',
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
