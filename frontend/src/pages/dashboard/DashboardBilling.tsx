import { motion } from "framer-motion";
import { useState } from "react";
import { Check, BotMessageSquare, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    basePrice: 799,
    period: "/month",
    description: "Ideal for businesses getting started with visual marketing.",
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
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Elite",
    basePrice: 2199,
    period: "/month",
    description: "For brands ready to automate and dominate socials.",
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
    cta: "Get Started",
  }
];

const DashboardBilling = () => {
  const navigate = useNavigate();

  const [dmToggles, setDmToggles] = useState<Record<string, boolean>>({
    "Starter": false,
    "Elite": false,
  });

  const handleToggle = (planName: string) => {
    setDmToggles(prev => ({ ...prev, [planName]: !prev[planName] }));
  };

  const handleSelectPlan = (planName: string) => {
    const isDmEnabled = dmToggles[planName];
    console.log("Selected plan:", planName, "DM Enabled:", isDmEnabled);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-4">
      <div className="text-center mb-12 mt-8">
        <h2 className="text-3xl font-bold mb-3">
          Choose how active your agent is
        </h2>
        <p className="text-muted-foreground">
          Upgrade or downgrade anytime
        </p>
        
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-full border border-border/50 shadow-sm w-full max-w-md">
            <input 
              type="text" 
              placeholder="PROMO CODE (E.G. WELCOME10)" 
              className="flex-1 bg-transparent border-none outline-none text-xs px-4 font-medium uppercase placeholder:text-muted-foreground/50"
            />
            <Button size="sm" className="rounded-full px-6 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold h-8">
              Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, i) => {
          const isDmEnabled = dmToggles[plan.name];
          const currentPrice = plan.basePrice + (isDmEnabled ? 399 : 0);

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 hover-lift transition-all flex flex-col ${
                plan.popular
                  ? "bg-blue-600 text-white ring-2 ring-blue-600 shadow-xl scale-[1.02]"
                  : "bg-card text-foreground border border-border/50 shadow-sm"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <SparklesIcon /> RECOMMENDED FOR YOU
                </span>
              )}
              
              <div className={`w-full py-2 px-4 rounded-xl flex justify-between items-center mb-6 font-bold text-sm ${plan.popular ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-inner text-white" : "bg-blue-500 text-white"}`}>
                <div className="flex items-center gap-1.5">
                  <ZapIcon /> {plan.features[0].split(' ')[0]} CREDITS
                </div>
                <span className="text-xs font-medium">Included</span>
              </div>

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className={`text-xs mb-6 ${plan.popular ? "text-white/80" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">₹{currentPrice}</span>
                <span className={`text-sm ${plan.popular ? "text-white/70" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>
              {/* DM Automation Toggle */}
              {plan.name === 'Starter' && (
                <div className="flex items-center justify-between p-4 rounded-xl mb-8 bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-3">
                    <BotMessageSquare size={18} className="text-blue-500" />
                    <div>
                      <p className="text-sm font-bold text-foreground">DM Automation</p>
                      <p className="text-xs text-muted-foreground">+₹399 / month</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(plan.name)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isDmEnabled ? 'bg-blue-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-sm ring-0 transition-transform ${
                        isDmEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <ul className="space-y-3.5 mb-8 flex-1 mt-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[13px] font-medium">
                    <Check size={16} className={`shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-blue-500"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
                {isDmEnabled && plan.name === 'Starter' && (
                  <li className="flex items-start gap-3 text-[13px] font-bold">
                    <Check size={16} className={`shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-blue-500"}`} />
                    <span>Automated DM Replies & Lead Capture</span>
                  </li>
                )}
              </ul>
              
              <Button
                onClick={() => handleSelectPlan(plan.name)}
                className={`w-full mt-auto py-6 rounded-xl ${
                  plan.popular
                    ? "bg-white text-blue-600 hover:bg-white/90 font-bold"
                    : "bg-blue-600 text-white hover:bg-blue-700 font-bold"
                }`}
              >
                {plan.cta}
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
