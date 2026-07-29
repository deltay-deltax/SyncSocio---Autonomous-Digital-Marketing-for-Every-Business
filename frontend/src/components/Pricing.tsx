import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, BotMessageSquare, HelpCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

const plans = [
  {
    name: "Starter",
    badge: null,
    creditTag: "200 Credits",
    prices: {
      INR: { basePrice: 799, originalPrice: 999, dmAddon: 299 },
      USD: { basePrice: 11, originalPrice: 15, dmAddon: 4 }
    },
    period: "/month",
    description: "For small businesses & creators getting started with AI content.",
    features: [
      "200 credits / month (40 AI images)",
      "Soft copy image exports",
      "500 email campaigns / month",
      "1 active brand profile",
      "Import up to 50 products",
      "E-commerce listing generator",
      "Festival calendar & planner",
      "Queue up to 30 scheduled posts",
      "Standard email support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Elite",
    badge: "Most Popular",
    creditTag: "700 Credits",
    prices: {
      INR: { basePrice: 2199, originalPrice: 3199, dmAddon: 0 },
      USD: { basePrice: 35, originalPrice: 49, dmAddon: 0 }
    },
    period: "/month",
    description: "For growing D2C brands ready to scale content & generate video.",
    features: [
      "700 credits / month (70 AI images)",
      "HD quality image exports",
      "2,000 email campaigns / month",
      "2 active brand profiles",
      "Import up to 100 products",
      "DM Automation (Included free)",
      "All-in-One Drop & AI Mode",
      "UGC & Product Video generation",
      "Best time to post analytics",
      "Priority WhatsApp support",
    ],
    popular: true,
    cta: "Get Started",
  },
  {
    name: "Agency",
    badge: "High Capacity",
    creditTag: "1,750 Credits",
    prices: {
      INR: { basePrice: 4999, originalPrice: 6999, dmAddon: 0 },
      USD: { basePrice: 79, originalPrice: 109, dmAddon: 0 }
    },
    period: "/month",
    description: "For agencies & brand managers requiring top-tier capacity.",
    features: [
      "1,750 credits / month (175 AI images)",
      "HD quality image exports",
      "10,000 email campaigns / month",
      "8 active brand profiles",
      "Import up to 500 products",
      "Everything in Elite plan",
      "DM Automation (Included free)",
      "UGC & Product Video generation",
      "Dedicated Account Manager",
      "24/7 Priority support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Custom",
    badge: "Enterprise",
    creditTag: "Custom Limits",
    isCustom: true,
    prices: {
      INR: { basePrice: 0, originalPrice: 0, dmAddon: 0 },
      USD: { basePrice: 0, originalPrice: 0, dmAddon: 0 }
    },
    period: "",
    description: "For multi-agency networks, enterprise scaling & white-labeling.",
    features: [
      "Custom credit volume & limits",
      "Unlimited active brand profiles",
      "Custom AI model & prompt tuning",
      "Dedicated Account Manager & SLA",
      "Enterprise API & custom workflows",
      "White-label options & custom invoicing",
      "24/7 Priority phone & WhatsApp support",
    ],
    popular: false,
    cta: "Talk to Us",
  }
];

const topups = [
  {
    credits: 100,
    prices: {
      INR: { price: 299, per_credit: 2.99 },
      USD: { price: 5, per_credit: 0.05 }
    }
  },
  {
    credits: 300,
    prices: {
      INR: { price: 799, per_credit: 2.66 },
      USD: { price: 12, per_credit: 0.04 }
    }
  },
  {
    credits: 700,
    prices: {
      INR: { price: 1699, per_credit: 2.42 },
      USD: { price: 24, per_credit: 0.03 }
    }
  },
];

interface PricingProps {
  onWaitlistClick: () => void;
}

const Pricing = ({ onWaitlistClick }: PricingProps) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();
  const { currency, symbol, setCurrency } = useCurrency();

  const handleSelectPlan = (planName: string) => {
    if (planName === 'Custom') {
      window.location.href = "mailto:support@syncsocio.com?subject=Book%20a%20Custom%20Plan%20Inquiry";
      return;
    }
    onWaitlistClick();
  };

  return (
    <section id="pricing" className="py-24 sm:py-32" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 relative"
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
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            const planPrices = plan.prices[currency];
            const currentPrice = planPrices.basePrice;
            const originalPrice = planPrices.originalPrice;
            const discountPercent = originalPrice ? Math.floor(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${plan.popular
                    ? "bg-gradient-to-b from-primary/95 via-primary to-primary text-primary-foreground ring-2 ring-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10"
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
                    {!plan.isCustom ? (
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
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs font-medium leading-normal">
                        <Check size={15} className={`shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-primary"
                          }`} />
                        <span className={plan.popular ? "text-primary-foreground/95" : "text-foreground/90"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button Pinned at Bottom */}
                <div className="pt-2">
                  <Button
                    onClick={() => handleSelectPlan(plan.name)}
                    className={`w-full py-6 rounded-2xl font-bold text-xs tracking-wide shadow-md transition-all ${plan.popular
                        ? "bg-white text-primary hover:bg-white/90 hover:shadow-lg"
                        : plan.isCustom
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "gradient-bg text-primary-foreground border-0 hover:opacity-95"
                      }`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                  
                  {/* DM Automation Add-on Indicator */}
                  {!plan.isCustom && planPrices.dmAddon > 0 && (
                    <div className="mt-3 text-center">
                      <p className={`text-[10px] font-medium ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        + Optional DM Automation Add-on: {symbol}{planPrices.dmAddon}/mo
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Credits Explained Link */}
        <div className="flex flex-col items-center justify-center mt-10 mb-2">
          <Link
            to="/credits"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 hover:underline cursor-pointer group"
          >
            <HelpCircle size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            Credits explained
          </Link>
        </div>

        {/* Credit Topups */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 max-w-4xl mx-auto text-center border-t border-border/50 pt-16"
        >
          <h3 className="text-2xl font-bold mb-2">Need extra credits?</h3>
          <p className="text-sm text-muted-foreground mb-10">Get instant top-ups to power your creative campaigns without upgrading your monthly plan.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {topups.map((topup) => {
              const topupPrices = topup.prices[currency];
              return (
                <div key={topup.credits} className="glass-card rounded-2xl p-6 flex flex-col justify-between hover-lift transition-all text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 block">Value Pack</span>
                    <h4 className="text-2xl font-black text-foreground mb-1">{topup.credits} Credits</h4>
                    <p className="text-xs text-muted-foreground mb-4">{symbol}{topupPrices.per_credit} / credit</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground mb-4">{symbol}{topupPrices.price}</p>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl py-4 font-semibold text-xs border-border hover:bg-primary hover:text-white transition-all h-10 flex items-center justify-center"
                      onClick={onWaitlistClick}
                    >
                      Buy Top-up
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
