import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackMetaEvent } from "@/utils/metaPixel";

export default function FreeCreativesSection() {
  const navigate = useNavigate();

  return (
    <section id="free-creatives" className="relative py-16 md:py-24 overflow-hidden border-t border-border/40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/20 blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-accent/20 blur-3xl opacity-40" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Limited offer
          </div>
          <h2 className="mt-5 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Get <span className="text-primary">3 free creatives</span><br /> crafted for your brand.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Share your brand, pick a vibe, and our AI studio ships 3 scroll-stopping creatives
            to your inbox — free, no card required.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                trackMetaEvent('Lead', { content_name: 'Free Creatives Click' });
                navigate("/signup");
              }}
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              Claim 3 Free Creatives
             
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => {
                trackMetaEvent('Lead', { content_name: 'Demo Call Click' });
                navigate("/signup");
              }}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-border/60 bg-card/40 font-bold text-sm hover:bg-card/70 transition-all"
            >
              Book a demo call
            </button>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
