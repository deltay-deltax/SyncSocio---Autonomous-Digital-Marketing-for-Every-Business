import { motion } from "framer-motion";
import { useState } from "react";
import { Check, BotMessageSquare, HelpCircle, Gift, Info, X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link, useOutletContext } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Checkout } from "@/components/Checkout";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ImageCompareDialog } from "@/components/ImageCompareDialog";

type Plan = {
  name: string;
  badge: string | null;
  creditTag: string;
  prices: {
    INR: { basePrice: number; originalPrice: number; dmAddon: number };
    USD: { basePrice: number; originalPrice: number; dmAddon: number };
  };
  period: string;
  description: string;
  features: string[];
  lockedFeatures?: string[];
  addons?: { name: string; prices: { INR: number; USD: number } }[];
  popular: boolean;
  cta: string;
  isCustom?: boolean;
  quality?: string;
};

const plans: Plan[] = [
  {
    name: "Starter",
    badge: null,
    creditTag: "80 Credits",
    prices: {
      INR: { basePrice: 399, originalPrice: 599, dmAddon: 0 },
      USD: { basePrice: 5, originalPrice: 8, dmAddon: 0 }
    },
    period: "/month",
    description: "For first-time business owners ready to start creating AI content.",
    features: [
      "80 credits / month (16 AI images)",
      "5 credits per image generation",
      "SD quality image exports",
      "Image, Carousel, Festival posts",
      "Ecomm listing generator",
      "Photoshoot mode",
      "AI Editor ",
      "1 brand profile",
      "50 products catalog",
      "Schedule up to 30 posts",
      "Email support",
    ],
    addons: [],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Growth",
    badge: "Most Popular",
    creditTag: "400 Credits",
    prices: {
      INR: { basePrice: 1499, originalPrice: 2499, dmAddon: 0 },
      USD: { basePrice: 19, originalPrice: 35, dmAddon: 0 }
    },
    period: "/month",
    description: "For active D2C brands ready to automate content and close sales in DMs.",
    features: [
      "400 credits / month (80 AI images)",
      "5 credits per image generation",
      "SD quality image exports",
      "All content formats unlocked",
      "Clone Mode & Sprint (bulk gen)",
      "Video & Reels (up to 8/mo)",
      "All-in-One Drop mode",
      "AI Editor ",
      "1 brand profile",
      "200 products catalog",
      "Unlimited post scheduling",
      "💬 DM Automation (IG + WA)",
      "🤖 Nexa AI Sales Agent",
      "Nexa: Razorpay + UPI payments",
      "500 Email sends/month",
      "WhatsApp Campaign (Meta self-paid)",
      "Best time to post analytics",
      "Priority WhatsApp support",
    ],
    addons: [],
    popular: true,
    cta: "Get Started",
  },
  {
    name: "Pro",
    badge: "High Capacity",
    creditTag: "1,000 Credits",
    prices: {
      INR: { basePrice: 3499, originalPrice: 4999, dmAddon: 0 },
      USD: { basePrice: 45, originalPrice: 69, dmAddon: 0 }
    },
    period: "/month",
    description: "For power users and high-volume brands managing serious sales operations.",
    features: [
      "1,000 credits / month (125 HD images)",
      "8 credits per image generation",
      "HD quality image exports",
      "All content formats unlocked",
      "Clone Mode & Sprint (bulk gen)",
      "Video & Reels ",
      "All-in-One Drop mode",
      "AI Editor ",
      "500 products catalog",
      "Unlimited post scheduling",
      "💬 DM Automation (IG + WA)",
      "🤖 Nexa AI Sales Agent",
      "Nexa: Unlimited conversations",
      "Nexa: Razorpay + UPI + COD",
      "2,000 Email sends/month",
      "WhatsApp Campaign (Meta self-paid)",
      "Best time to post analytics",
      "Dedicated WhatsApp support",
    ],
    addons: [],
    popular: false,
    cta: "Get Started",
  }
];

const DashboardBilling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const { currency, symbol, setCurrency } = useCurrency();

  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [eliteImageMode, setEliteImageMode] = useState<'SD' | 'HD'>('SD');
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, Record<string, number>>>({});

  const updateAddonQuantity = (planName: string, addonName: string, delta: number) => {
    setAddonQuantities(prev => {
      const current = prev[planName]?.[addonName] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [planName]: {
          ...prev[planName],
          [addonName]: next
        }
      };
    });
  };

  const handleSelectPlan = (planName: string) => {
    if (planName === 'Custom') {
      window.location.href = "mailto:support@syncsocio.com?subject=Book%20a%20Custom%20Plan%20Inquiry";
      return;
    }

    const planObj = plans.find(p => p.name === planName);
    if (!planObj) return;

    const planPrices = planObj.prices[currency];
    const amount = planPrices.basePrice;
    const creditsAdded = planName.toLowerCase() === 'pro' ? 1000 : planName.toLowerCase() === 'growth' ? 400 : 80;
    
    const currentPlan = (profile?.selectedPlan || '').toLowerCase();
    const isStarter = currentPlan.includes('starter') || currentPlan.includes('brand');
    const isUpgrading = isStarter && (planName.toLowerCase() === 'pro' || planName.toLowerCase() === 'growth');
    
    setCheckoutData({
      baseAmount: amount,
      description: isUpgrading ? `Upgrade to ${planName} Plan` : `Purchase ${planName} Plan`,
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
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4">
      <div className="text-center mb-12 mt-8">
        <h2 className="text-3xl font-bold mb-3">
          Choose how active your agent is
        </h2>
        <p className="text-muted-foreground mb-6">
          Upgrade or downgrade anytime
        </p>

        <div className="flex justify-center items-center gap-2 mt-6">
          <span className={`text-sm font-semibold ${currency === 'INR' ? 'text-foreground' : 'text-muted-foreground'}`}>INR (₹)</span>
          <button 
            onClick={() => setCurrency(currency === 'INR' ? 'USD' : 'INR')}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/20 transition-colors focus:outline-none"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${currency === 'USD' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-semibold ${currency === 'USD' ? 'text-foreground' : 'text-muted-foreground'}`}>USD ($)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, i) => {
          const planPrices = plan.prices[currency];
          
          const addonTotal = (plan.addons || []).reduce((sum, addon) => {
            const isSelected = (addonQuantities[plan.name]?.[addon.name] || 0) > 0;
            return sum + (isSelected ? addon.prices[currency as 'INR' | 'USD'] : 0);
          }, 0);

          const currentPrice = planPrices.basePrice + addonTotal;
          const originalPrice = planPrices.originalPrice ? planPrices.originalPrice + addonTotal : 0;
          const discountPercent = originalPrice ? Math.floor(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
          
          const currentPlan = (profile?.selectedPlan || '').toLowerCase();
          const isStarter = currentPlan.includes('starter') || currentPlan.includes('brand') || !currentPlan;
          const isGrowth = currentPlan.includes('growth');
          const isPro = currentPlan.includes('pro');
          const isCurrentPlan = (plan.name === 'Starter' && isStarter) || (plan.name === 'Growth' && isGrowth) || (plan.name === 'Pro' && isPro);

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${
                isCurrentPlan
                  ? "bg-emerald-500/5 text-foreground border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : plan.popular
                  ? "bg-gradient-to-b from-primary/95 via-primary to-primary text-primary-foreground ring-2 ring-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10"
                  : "bg-card border border-border/60 text-card-foreground shadow-sm hover:border-border hover:shadow-md"
              }`}
            >
              {/* Top Badges */}
              {isCurrentPlan ? (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md z-20">
                  ✓ Current Plan
                </span>
              ) : plan.badge ? (
                <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md z-20 whitespace-nowrap ${
                  plan.popular ? "bg-amber-400 text-slate-900" : "bg-primary text-primary-foreground"
                }`}>
                  {plan.badge}
                </span>
              ) : null}

              <div>
                {/* Title & Credit Tag */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-extrabold tracking-tight">{plan.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      plan.popular
                        ? "bg-white/20 text-white backdrop-blur-sm"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {plan.creditTag}
                    </span>
                  </div>
                </div>

                <p className={`text-xs min-h-[36px] leading-relaxed mb-4 ${
                  plan.popular ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}>
                  {plan.description}
                </p>

                {/* Price Block */}
                <div className="mb-6 pt-3 border-t border-border/20">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs line-through font-semibold ${
                          plan.popular ? "text-primary-foreground/60" : "text-muted-foreground/60"
                        }`}>
                          {symbol}{originalPrice}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          plan.popular ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {discountPercent}% OFF
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight">{symbol}{currentPrice}</span>
                        <span className={`text-xs font-semibold ${
                          plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          {plan.period}
                        </span>
                      </div>
                    </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feature) => {
                    let displayFeature = feature;
                    return (
                      <li key={feature} className="flex items-start gap-2.5 text-xs font-medium leading-normal">
                        {feature === 'No edit option in image' ? (
                          <X size={15} className="shrink-0 mt-0.5 text-muted-foreground" />
                        ) : (
                          <Check size={15} className={`shrink-0 mt-0.5 ${
                            plan.popular ? "text-white" : "text-primary"
                          }`} />
                        )}
                        <span className={plan.popular ? "text-primary-foreground/95" : (feature === 'No edit option in image' ? "text-muted-foreground line-through" : "text-foreground/90")}>
                          {displayFeature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Add-ons */}
                {plan.addons && plan.addons.length > 0 && (
                  <div className="mb-6 border-t border-border/20 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Add-ons</span>
                      <div className={`flex-1 h-px ${plan.popular ? "bg-white/10" : "bg-border/40"}`}></div>
                    </div>
                    <div className="space-y-3">
                      {plan.addons.map((addon) => {
                        const addonPrice = addon.prices[currency as 'INR' | 'USD'];
                        const quantity = addonQuantities[plan.name]?.[addon.name] || 0;
                        const isSelected = quantity > 0;
                        return (
                          <div 
                            key={addon.name} 
                            onClick={() => updateAddonQuantity(plan.name, addon.name, isSelected ? -1 : 1)}
                            className={`flex items-center justify-between gap-4 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? (plan.popular ? "border-white/40 bg-white/10 shadow-sm" : "border-primary/40 bg-primary/5 shadow-sm") 
                                : (plan.popular ? "border-white/10 hover:bg-white/5" : "border-border hover:bg-muted/50")
                            }`}
                          >
                            <div>
                              <p className={`text-xs font-semibold ${
                                isSelected 
                                  ? (plan.popular ? "text-white" : "text-primary") 
                                  : (plan.popular ? "text-primary-foreground" : "text-foreground")
                              }`}>
                                {addon.name}
                              </p>
                              <p className={`text-[10px] ${
                                isSelected 
                                  ? (plan.popular ? "text-white/80" : "text-primary/80") 
                                  : (plan.popular ? "text-primary-foreground/70" : "text-muted-foreground")
                              }`}>
                                + {symbol}{addonPrice}/month
                              </p>
                            </div>
                            <div className="flex items-center">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                isSelected 
                                  ? (plan.popular ? "bg-white text-primary border-white" : "bg-primary text-primary-foreground border-primary") 
                                  : (plan.popular ? "border-white/30 text-transparent" : "border-muted-foreground/30 text-transparent")
                              }`}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <Button
                  disabled={isCurrentPlan}
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full py-6 rounded-2xl font-bold text-xs tracking-wide shadow-md transition-all ${
                    isCurrentPlan
                      ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                      : plan.popular
                      ? "bg-white text-primary hover:bg-white/90 hover:shadow-lg"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                  size="lg"
                >
                  {isCurrentPlan ? "Current Plan" : plan.cta}
                </Button>
              </div>
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

      <ImageCompareDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} />
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
