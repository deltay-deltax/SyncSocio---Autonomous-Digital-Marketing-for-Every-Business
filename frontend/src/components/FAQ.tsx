import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const LANDING_FAQS = [
  {
    q: "What exactly is SyncSocio?",
    a: "SyncSocio is an all-in-one AI content workspace built for organic Instagram growth. It creates a customized weekly strategy, generates on-brand visuals (images, reels, carousels), writes captions, automates DMs, and provides analytics — all in one dashboard. No extra tools required.",
  },
  {
    q: "How does the AI keep my branding consistent?",
    a: "During onboarding, you outline your brand's colors, tone, USP, category, and visual vibe. SyncSocio creates a persistent Brand DNA profile that automatically gets sent to our image and prompt engines, ensuring every post looks and sounds uniquely yours.",
  },
  {
    q: "Do I need any design, editing, or marketing experience?",
    a: "None at all. SyncSocio acts as your strategist, designer, and copywriter. It decides your posting frequency, suggests topic ideas, and automatically structures gorgeous ad layouts, captions, and script ideas for you.",
  },
  {
    q: "Can I manage multiple brand profiles?",
    a: "Yes. Our Starter plan supports 1 active brand profile, while the Elite plan supports up to 2 brand profiles. Each brand has its own isolated Brand DNA, image upload library, and analytics dashboards.",
  },
  {
    q: "Do you offer a free trial?",
    a: "We don't offer a standard free trial, but all of our plans are launched at a heavily discounted initial pricing tier. You can also purchase a credit top-up pack to test our AI generation tools without committing to a subscription.",
  },
  {
    q: "Does it work if I don't have a website?",
    a: "Absolutely! Having a website is optional. SyncSocio works directly with your Instagram Creator or Business profile to generate, schedule, and analyze content directly on social channels.",
  },
];

const FAQ = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-border/40" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Frequently asked <span className="gradient-text">questions.</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {LANDING_FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-[1.5rem] border transition-all overflow-hidden ${
                  isOpen
                    ? "border-primary/20 bg-card shadow-xl shadow-primary/5"
                    : "border-border/40 bg-card/40 hover:border-border hover:bg-card/70"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span
                    className={`text-base font-bold tracking-tight transition-colors ${
                      isOpen ? "text-foreground" : "text-foreground/90"
                    }`}
                  >
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isOpen
                        ? "bg-primary text-primary-foreground rotate-45"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="px-6 pb-6 pt-0">
                        <div className="h-px bg-border/40 mb-4" />
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                          {i === 3 ? (
                            <>
                              Yes. Our Starter plan supports 1 active brand profile, while the Elite plan supports up to 2 brand profiles. Each brand has its own{" "}
                              <Link to="/signup" className="text-muted-foreground hover:text-muted-foreground cursor-default">
                                isolated
                              </Link>{" "}
                              Brand DNA, image upload library, and analytics dashboards.
                            </>
                          ) : (
                            item.a
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
