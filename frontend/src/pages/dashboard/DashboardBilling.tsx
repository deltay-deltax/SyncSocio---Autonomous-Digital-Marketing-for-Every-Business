import { motion } from "framer-motion";
import { useState } from "react";
import { Check, BotMessageSquare, HelpCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link, useOutletContext } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Checkout } from "@/components/Checkout";

const plans = [
  {
    name: "Starter",
    basePrice: 999,
    originalPrice: 999,
    period: "/month",
    description: "For small businesses, local brands, SaaS startups, and service companies getting started with AI-powered content.",
    features: [
      "200 credits/month",
      "500 email campaigns/month",
      "1 active brand profile",
      "Import or Add Up to 50 Products",
      "All image generation types",
      "UGC video generation",
      "Product video generation",
      "E-commerce listing generator",
      "Festival calendar",
      "English + 13 languages",
      "Queue up to 30 scheduled posts",
      "Email support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Elite",
    basePrice: 3199,
    originalPrice: 3199,
    period: "/month",
    description: "For growing D2C and ecommerce brands ready to scale content, automate campaigns, and generate videos — all from one platform.",
    features: [
      "700 credits/month",
      "2,000 email campaigns/month",
      "2 brand profiles",
      "Import or Add Up to 100 Products",
      "Everything in Starter",
      "All-in-One Drop feature",
      "UGC video generation",
      "Product video generation",
      "Best time to post analysis",
      "Unlimited scheduled queue",
      "Priority generation",
      "WhatsApp support",
    ],
    popular: true,
    cta: "Get Started",
  }
];

const DashboardBilling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useOutletContext<{ profile: any }>() || {};

  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    "Starter": false,
    "Elite": false,
  });
  
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const handleSelectPlan = (planName: string) => {
    const isDmEnabled = dmToggles[planName];
    const basePrice = planName === 'Elite' ? 3199 : 999;
    const amount = basePrice + (isDmEnabled ? 399 : 0);
    const creditsAdded = planName === 'Elite' ? 700 : 200;
    
    const currentPlan = (profile?.selectedPlan || '').toLowerCase();
    const isStarter = currentPlan.includes('starter') || currentPlan.includes('brand');
    const isUpgrading = isStarter && planName === 'Elite';
    
    // Store DM choice in local storage for onboarding scripts reference
    localStorage.setItem('syncsocio_dm_automation', isDmEnabled ? 'true' : 'false');
    
    setCheckoutData({
      baseAmount: amount,
      description: isUpgrading ? 'Upgrade to Elite Plan' : `Purchase ${planName} Plan`,
      type: isUpgrading ? 'plan_upgrade' : 'plan_purchase',
      planName: planName,
      creditsAdded: creditsAdded
    });
  };

  if (checkoutData) {
    return (
      <Checkout
        baseAmount={checkoutData.baseAmount}
        description={checkoutData.description}
        type={checkoutData.type}
        planName={checkoutData.planName}
        creditsAdded={checkoutData.creditsAdded}
        onSuccess={() => {
           toast({ title: 'Success!', description: `Successfully processed your plan.` });
           setTimeout(() => navigate('/dashboard'), 1500);
        }}
        onBack={() => setCheckoutData(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-4">
      <div className="text-center mb-12 mt-8">
        <h2 className="text-3xl font-bold mb-3">
          Choose how active your agent is
        </h2>
        <p className="text-muted-foreground">
          Upgrade or downgrade anytime
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, i) => {
          const isDmEnabled = dmToggles[plan.name];
          const currentPrice = (plan.name === 'Elite' ? 1899 : 599) + (isDmEnabled ? 399 : 0);
          
          const currentPlan = (profile?.selectedPlan || '').toLowerCase();
          const isStarter = currentPlan.includes('starter');
          const isElite = currentPlan.includes('elite');
          const isCurrentPlan = (plan.name === 'Starter' && isStarter) || (plan.name === 'Elite' && isElite);

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 hover-lift transition-all flex flex-col border ${
                isCurrentPlan
                  ? plan.popular
                    ? "bg-gradient-to-br from-blue-700 to-indigo-900 text-white border-emerald-500 shadow-xl ring-2 ring-emerald-500 scale-[1.02]"
                    : "bg-emerald-500/5 text-foreground border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : plan.popular
                  ? "bg-blue-600 text-white border-transparent shadow-xl ring-2 ring-blue-600 scale-[1.02]"
                  : "bg-card text-foreground border-border/50 shadow-sm"
              }`}
            >
              {isCurrentPlan ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-md">
                  ✓ Current Plan
                </span>
              ) : plan.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <SparklesIcon /> RECOMMENDED FOR YOU
                </span>
              ) : null}
              
              <div className={`w-full py-2 px-4 rounded-xl flex justify-between items-center mb-6 font-bold text-sm ${plan.popular ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-inner text-white" : "bg-blue-500 text-white"}`}>
                <div className="flex items-center gap-1.5">
                  <ZapIcon /> {plan.name === 'Elite' ? 700 : 200} CREDITS
                </div>
                <span className="text-xs font-medium">Included</span>
              </div>

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className={`text-xs mb-6 ${plan.popular ? "text-white/80" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              
              <div className="flex flex-col gap-1 mb-6">
                {currentPrice < plan.originalPrice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg line-through ${plan.popular ? "text-white/60" : "text-muted-foreground/60"}`}>
                      ₹{plan.originalPrice}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.popular ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                      {Math.floor(((plan.originalPrice - currentPrice) / plan.originalPrice) * 100)}% OFF
                    </span>
                  </div>
                )}
                <div className="flex items-center w-full relative">
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-4xl font-bold">₹{currentPrice}</span>
                    <span className={`text-sm ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                      {plan.period}
                    </span>
                  </div>
                  
                  {/* Launch Offer Ribbon Badge */}
                  <div className="ml-auto relative flex items-center shrink-0">
                    <div className="absolute -left-3 z-10">
                      <svg width="28" height="28" viewBox="0 0 120 120" className={`animate-spin-slow ${plan.popular ? 'text-white drop-shadow-md' : 'text-primary drop-shadow-sm'}`}>
                        <path fill="currentColor" d="M60 5 L74 15 L91 10 L96 27 L113 32 L107 48 L120 60 L107 72 L113 88 L96 93 L91 110 L74 105 L60 115 L46 105 L29 110 L24 93 L7 88 L13 72 L0 60 L13 48 L7 32 L24 27 L29 10 L46 15 Z" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Gift size={13} className={plan.popular ? 'text-primary' : 'text-white'} />
                      </div>
                    </div>
                    
                    <div className={`relative pl-6 pr-3 py-1.5 rounded-r-lg border ${
                      plan.popular 
                        ? 'bg-white/20 border-white/40 text-white shadow-[inset_0_1px_4px_rgba(255,255,255,0.3)]' 
                        : 'bg-primary/10 border-primary/20 text-primary shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]'
                    }`}>
                      <div className="font-black text-xs uppercase tracking-wide leading-tight">40% Off On Launch</div>
                      <div className={`text-[9px] leading-tight mt-0.5 ${plan.popular ? 'text-white/90' : 'text-primary/80'}`}>
                        Use code <span className={`font-bold px-1 rounded ${plan.popular ? 'bg-white/30 text-white' : 'bg-primary/20 text-primary'}`}>LAUNCH</span> for benefit
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              <ul className="space-y-3.5 mb-8 flex-1 mt-2">
                {plan.features.map((feature) => {
                  let text = feature;
                  if (feature.includes('credits/month')) {
                    text = plan.name === 'Elite' ? '700 credits/month' : '200 credits/month';
                  }
                  return (
                    <li key={feature} className="flex items-start gap-3 text-[13px] font-medium">
                      <Check size={16} className={`shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-blue-500"}`} />
                      <span>{text}</span>
                    </li>
                  );
                })}

              </ul>
              
              <Button
                disabled={isCurrentPlan}
                onClick={() => handleSelectPlan(plan.name)}
                className={`w-full mt-auto py-6 rounded-xl ${
                  isCurrentPlan 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : plan.popular
                    ? "bg-white text-blue-600 hover:bg-white/90 font-bold"
                    : "bg-blue-600 text-white hover:bg-blue-700 font-bold"
                }`}
              >
                {isCurrentPlan ? "Current Plan" : plan.cta}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-center mt-12 pb-8">
        <Link
          to="/dashboard/credits"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 hover:underline cursor-pointer group"
        >
          <HelpCircle size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          Credits explained
        </Link>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor"/>
  </svg>
);

export default DashboardBilling;
