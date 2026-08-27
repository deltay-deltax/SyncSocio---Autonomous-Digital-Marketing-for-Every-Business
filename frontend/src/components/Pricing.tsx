import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, BotMessageSquare, HelpCircle, Gift, Info, X, Minus, Plus, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ImageCompareDialog } from "@/components/ImageCompareDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  name: string;
  badge: string | null;
  creditTag: string;
  prices: {
    INR: { basePrice: number; originalPrice: number };
    USD: { basePrice: number; originalPrice: number };
  };
  period: string;
  description: string;
  features: string[];
  lockedFeatures: string[];
  popular: boolean;
  cta: string;
  isCustom?: boolean;
  quality: string;
};

const plans: Plan[] = [
  {
    name: "Free Trial",
    badge: "Start Free",
    creditTag: "35 Credits",
    quality: "SD Quality",
    prices: {
      INR: { basePrice: 0, originalPrice: 0 },
      USD: { basePrice: 0, originalPrice: 0 }
    },
    period: "/forever",
    description: "Try SyncSocio for free. No credit card needed. Generate 7 AI creatives instantly.",
    features: [
      "35 credits (7 AI images)",
      "5 credits per image generation",
      "SD quality image exports",
      "Image, Carousel, Festival posts",
      "Ecomm listing generator",
      "Photoshoot mode",
      "AI Editor",
      "1 brand profile",
      "No credit card required",
    ],
    lockedFeatures: [
      "Post scheduling",
      "DM Automation",
      "Nexa AI Sales Agent",
      "WhatsApp & Email campaigns",
      "Best time to post analytics",
    ],
    popular: false,
    cta: "Start Free Trial",
  },
  {
    name: "Starter",
    badge: null,
    creditTag: "160 Credits",
    quality: "SD Quality",
    prices: {
      INR: { basePrice: 799, originalPrice: 999 },
      USD: { basePrice: 10, originalPrice: 15 }
    },
    period: "/month",
    description: "For first-time business owners ready to start creating AI content.",
    features: [
      "160 credits / month (32 AI images)",
      "5 credits per image generation",
      "SD quality image exports",
      "Image, Carousel, Festival posts",
      "Ecomm listing generator",
      "Photoshoot mode",
      "AI Editor ",
      "1 brand profile",
      "50 products catalog",
      "Schedule up to 30 posts",
      "🤖 Nexa AI Sales Agent (IG only)",
      "20 AI-handled leads/month",
      "Email support",
    ],
    lockedFeatures: [
      "Clone Mode",
      "Sprint (bulk generation)",
      "Video & Reels generation",
      "All-in-One Drop mode",
      "DM Automation",
      "Nexa: WhatsApp + payments",
      "Email Campaign",
      "WhatsApp Campaign",
      "Best time to post analytics",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Growth",
    badge: "Most Popular",
    creditTag: "400 Credits",
    quality: "SD Quality",
    prices: {
      INR: { basePrice: 1499, originalPrice: 2499 },
      USD: { basePrice: 19, originalPrice: 35 }
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
    lockedFeatures: [
      "HD quality image exports",
      "Multiple brand profiles",
    ],
    popular: true,
    cta: "Get Started",
  },
  {
    name: "Pro",
    badge: "High Capacity",
    creditTag: "1,000 Credits",
    quality: "HD Quality",
    prices: {
      INR: { basePrice: 3499, originalPrice: 4999 },
      USD: { basePrice: 45, originalPrice: 69 }
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
    lockedFeatures: [],
    popular: false,
    cta: "Get Started",
  },
];

const topups = [
  {
    name: "Starter Top-up",
    credits: 50,
    prices: {
      INR: { price: 250, per_credit: 5.00 },
      USD: { price: 3.5, per_credit: 0.07 }
    }
  },
  {
    name: "Value Pack",
    credits: 100,
    prices: {
      INR: { price: 475, per_credit: 4.75 },
      USD: { price: 6.5, per_credit: 0.065 }
    }
  },
  {
    name: "Growth Pack",
    credits: 300,
    prices: {
      INR: { price: 1275, per_credit: 4.25 },
      USD: { price: 16, per_credit: 0.053 }
    }
  },
  {
    name: "Pro Pack",
    credits: 700,
    prices: {
      INR: { price: 2730, per_credit: 3.90 },
      USD: { price: 35, per_credit: 0.05 }
    }
  },
];

interface PricingProps {
  onWaitlistClick: (planName?: string) => void;
  onFreeTrialClick?: () => void;
  isTrialLoading?: boolean;
  className?: string;
  hideFreeTrialCard?: boolean;
}

const Pricing = ({ onWaitlistClick, onFreeTrialClick, isTrialLoading = false, className, hideFreeTrialCard = false }: PricingProps) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency, symbol, setCurrency } = useCurrency();
  const [eliteImageMode, setEliteImageMode] = useState<'SD' | 'HD'>('SD');
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const handleSelectPlan = (planName: string) => {
    if (planName === 'Custom') {
      window.location.href = "mailto:support@syncsocio.com?subject=Book%20a%20Custom%20Plan%20Inquiry";
      return;
    }
    onWaitlistClick(planName);
  };

  return (
    <section id="pricing" className={cn("py-16 sm:py-24 lg:py-32", className)} ref={ref}>
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16 relative"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block">
            Investment
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Simple pricing. <span className="gradient-text">No surprises.</span>
          </h2>

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

          {/* Free Trial Option - High conversion, mobile-optimized card */}
          {onFreeTrialClick && (
            <div className="max-w-xl mx-auto mt-8 mb-2 px-1 sm:px-0">
              <div
                onClick={!isTrialLoading ? onFreeTrialClick : undefined}
                role="button"
                tabIndex={0}
                className={cn(
                  "group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card/80 to-primary/[0.03] p-4 sm:p-5 shadow-sm hover:shadow-xl hover:border-primary/60 transition-all duration-300 text-left cursor-pointer backdrop-blur-sm",
                  isTrialLoading ? "opacity-75 pointer-events-none" : "hover:-translate-y-0.5 active:scale-[0.99]"
                )}
              >
                {/* Ambient glow decoration */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-24 h-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Icon container */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      {isTrialLoading ? (
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary group-hover:text-primary-foreground" />
                      ) : (
                        <Gift className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-12" />
                      )}
                    </div>

                    {/* Text Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                          Continue with Free Trial
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                          <Sparkles size={11} className="text-primary" />
                          7 Free Creatives
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        35 credits included • No credit card required • Instant access
                      </p>
                    </div>
                  </div>

                  {/* CTA Action */}
                  <div className="flex items-center justify-end sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <Button
                      type="button"
                      disabled={isTrialLoading}
                      className="w-full sm:w-auto rounded-xl px-5 h-10 text-xs sm:text-sm font-bold shadow-md shadow-primary/20 group-hover:shadow-primary/30 flex items-center justify-center gap-1.5 transition-all pointer-events-none"
                    >
                      {isTrialLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <span>Start Free</span>
                          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {(() => {
          const visiblePlans = plans.filter(p => p.name !== 'Free Trial' || !hideFreeTrialCard);
          const gridColsClass = visiblePlans.length === 3 ? "xl:grid-cols-3 xl:max-w-5xl" : "xl:grid-cols-4 max-w-7xl";
          
          return (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 lg:gap-8 mx-auto items-stretch justify-center`}>
              {visiblePlans.map((plan, i) => {
            const planPrices = plan.prices[currency];
            const currentPrice = planPrices.basePrice;
            const originalPrice = planPrices.originalPrice || 0;
            const discountPercent = originalPrice ? Math.floor(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${plan.popular
                  ? "bg-gradient-to-b from-primary/95 via-primary to-primary text-primary-foreground ring-2 ring-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10"
                  : plan.name === 'Free Trial'
                    ? "bg-card border border-primary/30 text-card-foreground shadow-sm hover:border-primary/60 hover:shadow-md ring-1 ring-primary/10"
                    : plan.isCustom
                      ? "bg-card border border-primary/30 text-card-foreground shadow-lg hover:border-primary/50"
                      : "bg-card border border-border/60 text-card-foreground shadow-sm hover:border-border hover:shadow-md"
                  }`}
              >
                {/* Top Badge */}
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md z-20 whitespace-nowrap ${plan.popular
                    ? "bg-amber-400 text-slate-900"
                    : "bg-primary text-primary-foreground"
                    }`}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Header & Title */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-extrabold tracking-tight">{plan.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${plan.popular
                      ? "bg-white/20 text-white backdrop-blur-sm"
                      : "bg-primary/10 text-primary"
                      }`}>
                      {plan.creditTag}
                    </span>
                  </div>

                  {/* Subtitle / Description */}
                  <p className={`text-xs min-h-[36px] leading-relaxed mb-4 ${plan.popular ? "text-primary-foreground/85" : "text-muted-foreground"
                    }`}>
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pt-3 border-t border-border/20">
                    {plan.name === 'Free Trial' ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-primary/10 text-primary">
                            No card needed
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight">₹0</span>
                          <span className="text-xs font-semibold text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                    ) : !plan.isCustom ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs line-through font-semibold ${plan.popular ? "text-primary-foreground/60" : "text-muted-foreground/60"
                            }`}>
                            {symbol}{originalPrice}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${plan.popular ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600"
                            }`}>
                            {discountPercent}% OFF
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight">{symbol}{currentPrice}</span>
                          <span className={`text-xs font-semibold ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"
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
                  <ul className="space-y-2.5 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs font-medium leading-normal">
                        <Check size={15} className={`shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-primary"}`} />
                        <span className={plan.popular ? "text-primary-foreground/95" : "text-foreground/90"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                    {plan.lockedFeatures && plan.lockedFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs font-medium leading-normal">
                        <X size={15} className="shrink-0 mt-0.5 text-muted-foreground/50" />
                        <span className={`line-through ${plan.popular ? "text-primary-foreground/40" : "text-muted-foreground/50"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button Pinned at Bottom */}
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      if (plan.name === 'Free Trial' && onFreeTrialClick) {
                        onFreeTrialClick();
                      } else {
                        handleSelectPlan(plan.name);
                      }
                    }}
                    disabled={plan.name === 'Free Trial' && isTrialLoading}
                    className={`w-full py-6 rounded-2xl font-bold text-xs tracking-wide shadow-md transition-all ${plan.popular
                      ? "bg-white text-primary hover:bg-white/90 hover:shadow-lg"
                      : plan.name === 'Free Trial'
                        ? "gradient-bg text-primary-foreground border-0 hover:opacity-95"
                        : plan.isCustom
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "gradient-bg text-primary-foreground border-0 hover:opacity-95"
                      }`}
                    size="lg"
                  >
                    {plan.name === 'Free Trial' && isTrialLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" /><span>Activating...</span></>
                    ) : plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
            </div>
          );
        })()}
        {/* Credits Explained Link (Moved Below All Plans) */}
        <div className="flex flex-col items-center justify-center mt-8 sm:mt-10">
          <Link
            to="/credits"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group shadow-sm"
          >
            <HelpCircle size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Credits explained</span>
          </Link>
        </div>
      </div>
      <ImageCompareDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} />
    </section>
  );
};

export default Pricing;
