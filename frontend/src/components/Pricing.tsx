import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, BotMessageSquare, HelpCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";

const plans = [
  {
    name: "Starter",
    prices: {
      INR: { basePrice: 599, originalPrice: 999, dmAddon: 399 },
      USD: { basePrice: 9, originalPrice: 15, dmAddon: 5 }
    },
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
    prices: {
      INR: { basePrice: 1899, originalPrice: 3199, dmAddon: 399 },
      USD: { basePrice: 29, originalPrice: 49, dmAddon: 5 }
    },
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

  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    "Brand": false,
    "Growth": false,
  });

  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const handleSelectPlan = (planName: string) => {
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
          <h2 className="text-sm sm:text-4xl lg:text-5xl font-bold mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const isDmEnabled = dmToggles[plan.name];
            const planPrices = plan.prices[currency];
            const currentPrice = planPrices.basePrice + (isDmEnabled ? planPrices.dmAddon : 0);
            const originalPrice = planPrices.originalPrice;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 hover-lift transition-all flex flex-col ${plan.popular
                  ? "bg-primary text-primary-foreground ring-2 ring-primary shadow-xl scale-[1.02]"
                  : "glass-card"
                  }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ background: "hsl(214, 100%, 97%)", color: "hsl(221, 83%, 53%)" }}>
                    Most Popular
                  </span>
                )}
                
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>
                
                <p className={`text-sm mb-6 mt-2 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"} pr-4`}>
                  {plan.description}
                </p>
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg line-through ${plan.popular ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                      {symbol}{originalPrice}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.popular ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                      {Math.floor(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0 w-full relative">
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-4xl font-bold">{symbol}{currentPrice}</span>
                      <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {plan.period}
                      </span>
                    </div>
                    
                    {/* Launch Offer Ribbon Badge */}
                    <div className="sm:ml-auto relative flex items-center shrink-0 w-fit">
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



                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check size={18} className={`shrink-0 mt-0.5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {isDmEnabled && plan.name === 'Starter' && (
                    <li className="flex items-start gap-3 text-sm font-bold">
                      <Check size={18} className={`shrink-0 mt-0.5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      <span>Automated DM Replies & Lead Capture</span>
                    </li>
                  )}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full mt-auto ${plan.popular
                    ? "bg-card text-primary hover:bg-card/90 font-bold"
                    : "gradient-bg text-primary-foreground border-0 font-bold"
                    }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
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
