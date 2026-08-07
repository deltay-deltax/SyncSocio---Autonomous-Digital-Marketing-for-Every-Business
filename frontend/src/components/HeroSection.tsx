import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackMetaEvent } from "@/utils/metaPixel";
import { useEffect } from "react";
import { Link } from "react-router-dom";



interface HeroSectionProps {
  onWaitlistClick: () => void;
}

const HeroSection = ({ onWaitlistClick }: HeroSectionProps) => {
    // Removed old states

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl bg-primary" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl bg-primary" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto text-center">
          
          {/* Text Content */}
          <div className="flex flex-col items-center text-center">
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
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-4 md:mb-6"
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
              className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 leading-relaxed max-w-xl px-4"
            >
              Drop your URL. Watch your brand come to life in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
            >
              <Link to="/signup" onClick={() => trackMetaEvent('Lead', { content_name: 'Hero Free Creatives Click' })}>
                <Button
                  size="lg"
                  className="gradient-bg text-primary-foreground border-0 text-sm md:text-base px-6 py-5 md:px-8 md:py-6 hover-lift w-fit"
                >
                  Claim 3 Free Creatives
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link to="/signup" className="sm:hidden flex justify-center">
                <Button variant="outline" size="lg" className="text-sm px-6 py-5 hover-lift bg-background/50 backdrop-blur-sm">
                  Sign up
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
