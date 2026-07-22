import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Pencil, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const steps = [
  { icon: Brain, label: "Ingesting Context", status: "Completed ✓" },
  { icon: Pencil, label: "Orchestrating Creative", status: "Running…" },
  { icon: BarChart3, label: "Calibrating Reach Engine", status: "Queued" },
];

interface HeroSectionProps {
  onWaitlistClick: () => void;
}

const HeroSection = ({ onWaitlistClick }: HeroSectionProps) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const getTimeout = () => {
      if (activeStep < steps.length) return 3000;
      return 1500; // Pause briefly when all jobs report completed before starting over
    };

    const timeoutId = setTimeout(() => {
      setActiveStep((s) => {
        if (s === steps.length) return 0;
        return s + 1;
      });
    }, getTimeout());

    return () => clearTimeout(timeoutId);
  }, [activeStep]);

  const getStepStatus = (i: number) => {
    if (activeStep === steps.length) return "completed";
    if (i < activeStep) return "completed";
    if (i === activeStep) return "running";
    return "queued";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-36" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl bg-primary" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl bg-primary" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest mb-6"
          >
            <Sparkles className="w-3 h-3" /> AI-Powered Social Media Automation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6"
          >
            Your brand,{" "}
            <span className="liquid-underline">posting itself.</span>
            <br />
            <span className="gradient-text">Every single day.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            SyncSocio is the AI engine that creates on-brand content, schedules it, and publishes directly to your Instagram — fully automated, while you focus on the business.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="gradient-bg text-primary-foreground border-0 text-base px-8 py-6 hover-lift"
              onClick={onWaitlistClick}
            >
              Claim 3 Free Creatives
              <ArrowRight size={18} className="ml-2" />
            </Button>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 relative"
          >
            <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto animate-float">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full" style={{ background: "hsl(45, 93%, 58%)" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} />
              </div>
              <div className="space-y-4">
                {steps.map((step, i) => {
                  const status = getStepStatus(i);
                  const isActive = i === activeStep;
                  return (
                    <div key={step.label} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === "queued" ? "bg-secondary" : "gradient-bg"}`}>
                        <step.icon size={18} className={status === "queued" ? "text-muted-foreground" : "text-primary-foreground"} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">{step.label}</div>
                        <div className="h-2 rounded-full bg-muted/60 w-3/5 mt-1.5 overflow-hidden relative">
                          {isActive && (
                            <motion.div
                              key={`progress-${activeStep}`} // forces re-animation on new step
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 3, ease: "linear" }}
                              className="absolute inset-y-0 left-0 rounded-full gradient-bg"
                            />
                          )}
                          {status === "completed" && (
                            <div className="absolute inset-y-0 left-0 rounded-full w-full" style={{ background: "hsl(142, 71%, 45%)" }} />
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${status === "completed"
                        ? ""
                        : status === "running"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                        }`} style={status === "completed" ? { background: "hsl(142, 71%, 95%)", color: "hsl(142, 71%, 35%)" } : undefined}>
                        {status === "completed" ? "Completed ✓" : status === "running" ? "Running…" : "Queued"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
