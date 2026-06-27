import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "SyncSocio Starter",
    basePrice: 999,
    period: "/month",
    description: "For creators ready to scale at speed.",
    features: [
      "3 times a week posting",
      "Static + Carousels",
      "12 posts/month",
      "Deep DNA brand synthesis",
      "3 active agents",
      "Daily sync",
      "Cross platform posting",
      "Priority support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "SyncSocio PRO",
    basePrice: 1999,
    period: "/month",
    description: "Maximum efficiency for power creators.",
    features: [
      "Daily posting",
      "Static + Carousel + Reels",
      "30 posts/month",
      "Deep DNA brand synthesis",
      "3 active agents",
      "Daily sync",
      "Cross platform posting",
      "Priority support",
    ],
    popular: true,
    cta: "Go Pro",
  }
];

const Pricing = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    "SyncSocio Starter": false,
    "SyncSocio PRO": false,
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
                className={`relative rounded-2xl p-8 hover-lift transition-all flex flex-col ${
                  plan.popular
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
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">₹{currentPrice}</span>
                  <span className={`text-sm ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>

                {/* DM Automation Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-xl mb-8 ${plan.popular ? "bg-white/10" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-3">
                    <BotMessageSquare size={20} className={plan.popular ? "text-primary-foreground" : "text-primary"} />
                    <div>
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

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check size={18} className={`shrink-0 mt-0.5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {isDmEnabled && (
                    <li className="flex items-start gap-3 text-sm font-bold">
                      <Check size={18} className={`shrink-0 mt-0.5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      <span>Automated DM Replies & Lead Capture</span>
                    </li>
                  )}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full mt-auto ${
                    plan.popular
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
      </div>
    </section>
  );
};

export default Pricing;
