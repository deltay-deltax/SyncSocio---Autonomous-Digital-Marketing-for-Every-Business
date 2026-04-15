import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onWaitlistClick: () => void;
  isJoined?: boolean;
}

const CTASection = ({ onWaitlistClick, isJoined }: CTASectionProps) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 bg-card" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            <span className="liquid-underline">Stop wasting time.</span>
            <br />
            <span className="gradient-text">Start automating.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            We're cooking something crazy. Drop your details and be the first to know when we go live. 🚀
          </p>
          <Button
            size="lg"
            className={`${isJoined ? "bg-muted text-muted-foreground cursor-not-allowed" : "gradient-bg text-primary-foreground hover-lift"} border-0 text-base px-10 py-6 transition-all`}
            onClick={isJoined ? undefined : onWaitlistClick}
            disabled={isJoined}
          >
            {isJoined ? "Intelligence Revolution Joined" : "Join the Intelligence Revolution"}
            {!isJoined && <ArrowRight size={18} className="ml-2" />}
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
