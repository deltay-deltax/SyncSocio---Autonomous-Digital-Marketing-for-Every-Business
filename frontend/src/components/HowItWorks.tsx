import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Fingerprint, Cog, Rocket } from "lucide-react";

const steps = [
  {
    icon: Fingerprint,
    step: "01",
    title: "Identity Mapping",
    description: "Complete our 11-step strategic deep-dive. Tell the agent who you are and what you solve.",
  },
  {
    icon: Cog,
    step: "02",
    title: "Agent Calibration",
    description: "The system synthesizes your Brand DNA, mapping your vocal signature and competitor benchmarks.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "VelocityDM Launch",
    description: "Your agent goes live. Platform-native posts go out automatically — right format, right caption, right time.",
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-card" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-widest mb-4 block">
            The 1-2-3
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Three steps. <span className="gradient-text">Zero friction.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-300">
                <step.icon size={28} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-bold text-accent tracking-widest uppercase mb-2 block">
                Step {step.step}
              </span>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-16 h-[2px] bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
