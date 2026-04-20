import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle, Mail, Phone, MapPin, MessageCircle } from "lucide-react";

const FAQS = [
  {
    q: "What is Velocity?",
    a: "Velocity is an AI-powered content workspace that helps creators plan, optimize and publish high-performing posts across reels, images and carousels — all from one elegant dashboard.",
  },
  {
    q: "How does the Content Mix work?",
    a: "Tap Content Mix to generate a balanced 7-day plan: 3 reels, 2 images and 2 carousels. Each card includes the format, optimal posting time, topic and a ready-to-use AI prompt.",
  },
  {
    q: "Can I upload my own media?",
    a: "Yes. Tick any card in your weekly plan to highlight it, then upload your own image, reel or carousel asset directly to that slot before publishing.",
  },
  {
    q: "What happens when I publish a post?",
    a: "Once published, the post is removed from your active weekly plan so you always see what's left to do. Generate the next week anytime when your queue is empty.",
  },
  {
    q: "How is the optimal posting time decided?",
    a: "Velocity analyzes engagement patterns by content format and audience behavior to suggest the time slot most likely to maximize reach for each individual post.",
  },
  {
    q: "Is my data private?",
    a: "Absolutely. Your prompts, uploads and schedules are tied to your workspace and never shared. You stay in full control of every piece of content.",
  },
];

function DashboardFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-5">
            <HelpCircle size={12} />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Frequently asked<br/>
            <span className="text-primary">questions.</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto font-medium leading-relaxed">
            Everything you need to know about creating, scheduling and shipping content with Velocity.
          </p>
        </motion.div>

        <div className="space-y-4">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className={`rounded-[1.5rem] border transition-all overflow-hidden ${
                  isOpen
                    ? "border-primary/20 bg-white shadow-xl shadow-primary/5"
                    : "border-border/40 bg-white/40 hover:border-border hover:bg-white/70"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-7 py-5 text-left"
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
                        ? "bg-primary text-white rotate-45"
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
                      <div className="px-7 pb-6 pt-0">
                        <div className="h-px bg-border/40 mb-4" />
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-16"
        >
          <div className="rounded-[2.5rem] border border-border/50 bg-white p-8 md:p-10 shadow-sm">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <MessageCircle size={12} />
                Get in touch
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Still have questions?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Our team usually replies within a few hours.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Mail,
                  label: "Email us",
                  value: "hello@velocity.app",
                  href: "mailto:hello@velocity.app",
                },
                {
                  icon: Phone,
                  label: "Call us",
                  value: "+1 (415) 287-0420",
                  href: "tel:+14152870420",
                },
                {
                  icon: MapPin,
                  label: "Visit",
                  value: "548 Market St, SF",
                  href: "#",
                },
              ].map((c, i) => (
                <a
                  key={i}
                  href={c.href}
                  className="group flex flex-col items-start gap-4 p-5 rounded-2xl border border-border/50 bg-slate-50/50 hover:border-primary/30 hover:bg-white transition-all hover:shadow-md"
                >
                  <span className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors border border-border/50 shadow-sm">
                    <c.icon size={18} />
                  </span>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                      {c.label}
                    </div>
                    <div className="text-[13px] font-bold text-foreground">
                      {c.value}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Mon–Fri · 9am – 6pm PST · We're just one message away.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default DashboardFAQ;
