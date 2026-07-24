import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Terminal, AnimatedSpan, TypingAnimation } from "@/registry/magicui/terminal";



interface HeroSectionProps {
  onWaitlistClick: () => void;
}

const HeroSection = ({ onWaitlistClick }: HeroSectionProps) => {
    // Removed old states

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-36">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl bg-primary" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl bg-primary" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          
          {/* Left Text Column */}
          <div className="text-left">
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
              className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl"
            >
              Drop your URL. Watch your brand come to life in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="gradient-bg text-primary-foreground border-0 text-base px-8 py-6 hover-lift w-fit"
                onClick={onWaitlistClick}
              >
                Claim 3 Free Creatives
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Right Column (Mockup) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-10 lg:mt-0 relative flex justify-center w-full"
          >
            <Terminal className="w-full">
              <TypingAnimation delay={500}>&gt; syncsocio init --agent=instagram</TypingAnimation>

              <AnimatedSpan delay={2000} className="text-primary mt-2">
                ✔ Ingesting brand context.
              </AnimatedSpan>

              <AnimatedSpan delay={2500} className="text-primary">
                ✔ Analyzing recent trends.
              </AnimatedSpan>

              <AnimatedSpan delay={3000} className="text-primary">
                ✔ Generating creative copy & imagery.
              </AnimatedSpan>

              <AnimatedSpan delay={3500} className="text-primary">
                ✔ Scheduling post for optimal engagement.
              </AnimatedSpan>

              <AnimatedSpan delay={4000} className="text-primary">
                ✔ Syncing with reach engine.
              </AnimatedSpan>

              <AnimatedSpan delay={4500} className="text-emerald-500 mt-2">
                <span>ℹ Created 3 new creatives:</span>
                <span className="block pl-4 mt-1">- post_vision_01.png</span>
                <span className="block pl-4">- reel_script_02.mp4</span>
                <span className="block pl-4">- story_poll_03.jpg</span>
              </AnimatedSpan>

              <TypingAnimation delay={5500} className="text-muted-foreground mt-4">
                Success! Agent orchestration completed.
              </TypingAnimation>

              <TypingAnimation delay={6500} className="text-muted-foreground font-semibold">
                Your brand is now posting itself.
              </TypingAnimation>
            </Terminal>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
