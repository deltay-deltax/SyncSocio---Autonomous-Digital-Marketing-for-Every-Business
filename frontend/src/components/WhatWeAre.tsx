import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "6", label: "Content Formats" },
  { value: "40+", label: "Festival Templates" },
  { value: "13", label: "Languages Supported" },
  { value: "1-tap", label: "Instagram Publishing" },
];

const WhatWeAre = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-16 sm:py-20 overflow-hidden border-b border-border/40" ref={ref}>
      <div className="container mx-auto px-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-14">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-2xl py-6 px-4 text-center hover-lift"
            >
              <div className="text-3xl sm:text-4xl font-extrabold gradient-text leading-none mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Vision copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-3xl mx-auto text-center"
        >
          <span className="inline-block text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5">
            The Vision
          </span>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Building a brand manually is a relic of 2023. In the new economy,{" "}
            <span className="font-semibold text-foreground">those who leverage agents win</span>.
            SyncSocio gives you the infrastructure to own your market — without
            touching a keyboard.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatWeAre;
