import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, BotMessageSquare, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    basePrice: 599,
    originalPrice: 999,
    period: "/month",
    description: "For small businesses, local brands, SaaS startups, and service companies getting started with AI-powered content.",
    features: [
      "200 credits/month",
      "1 active brand profile",
      "All image generation types",
      "UGC video generation",
      "Product video generation",
      "E-commerce listing generator",
      "Festival calendar",
      "English + 13 languages",
      "Schedule posts",
      "Email support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Elite",
    basePrice: 1899,
    originalPrice: 2999,
    period: "/month",
    description: "For growing D2C and ecommerce brands ready to scale content, automate campaigns, and generate videos — all from one platform.",
    features: [
      "700 credits/month",
      "2 brand profiles",
      "Everything in Starter",
      "All-in-One Drop feature",
      "UGC video generation",
      "Product video generation",
      "Best time to post analysis",
      "Priority generation",
      "WhatsApp support",
    ],
    popular: true,
    cta: "Get Started",
  }
];

const topups = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

const Pricing = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    "Brand": false,
    "Growth": false,
  });

  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const handleSelectPlan = (planName: string) => {
    const isDmEnabled = dmToggles[planName];
    navigate(`/signup?plan=${encodeURIComponent(planName)}&dm=${isDmEnabled}`);
  };

  return (
    <section id="pricing" className="py-24 sm:py-32" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block">
            Investment
          </span>
          <h2 className="text-sm sm:text-4xl lg:text-5xl font-bold">
            Simple pricing. <span className="gradient-text">No surprises.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const isDmEnabled = dmToggles[plan.name];
            const currentPrice = plan.basePrice + (isDmEnabled ? 399 : 0);

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
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg line-through ${plan.popular ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                      ₹{plan.originalPrice}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.popular ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                      {Math.round(((plan.originalPrice - currentPrice) / plan.originalPrice) * 100)}% OFF
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">₹{currentPrice}</span>
                    <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {plan.period}
                    </span>
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
            {topups.map((topup) => (
              <div key={topup.credits} className="glass-card rounded-2xl p-6 flex flex-col justify-between hover-lift transition-all text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 block">Value Pack</span>
                  <h4 className="text-2xl font-black text-foreground mb-1">{topup.credits} Credits</h4>
                  <p className="text-xs text-muted-foreground mb-4">₹{topup.per_credit} / credit</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground mb-4">₹{topup.price}</p>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-4 font-semibold text-xs border-border hover:bg-primary hover:text-white transition-all h-10 flex items-center justify-center"
                    onClick={() => navigate('/login')}
                  >
                    Buy Top-up
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
