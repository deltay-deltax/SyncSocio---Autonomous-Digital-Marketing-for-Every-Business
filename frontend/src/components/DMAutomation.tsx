import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Reply, MousePointerClick, Mail, Send, Sparkles, ChevronRight } from "lucide-react";

const InstagramIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);
import { useEffect, useState } from "react";

const dmScenes = [
  {
    title: "Comment Trigger",
    icon: MessageCircle,
    userMsg: "Link",
    aiMsg: "Hey! Thanks for reaching out 💙",
    btn: "Send me the link",
    meta: "When someone comments a keyword, your agent instantly slides into their DMs.",
  },
  {
    title: "Story Reply",
    icon: Reply,
    userMsg: "Replied to your story",
    aiMsg: "Saw your story reply! Here's the good stuff ✨",
    btn: "Get access",
    meta: "Story reactions and replies automatically get a personalised DM flow.",
  },
  {
    title: "Smart Follow-Up",
    icon: MousePointerClick,
    userMsg: "Tapped 'Get access'",
    aiMsg: "You haven't followed yet! Tap below to unlock everything 🔓",
    btn: "Follow & continue",
    meta: "Conditional logic checks follow status and adapts the next message.",
  },
  {
    title: "DM Keyword",
    icon: Mail,
    userMsg: "Price?",
    aiMsg: "Hey! Here's our pricing breakdown 📋",
    btn: "Book a call",
    meta: "Set any keyword — 'price', 'menu', 'collab' — and let the agent handle it.",
  },
];

const DMAutomation = () => {
  const [dmScene, setDmScene] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDmScene((s) => (s + 1) % dmScenes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="auto-dm" className="relative py-24 overflow-hidden">
      <div className="absolute top-1/2 left-0 w-72 h-72 rounded-full opacity-10 blur-3xl bg-primary -translate-y-1/2" />
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl bg-primary" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <MessageCircle size={16} />
            DM Automation Engine
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
          >
            Your DMs, on <span className="gradient-text">autopilot</span>
          </motion.h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Comment triggers, story replies, keyword DMs — every conversation handled while you sleep.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
          {/* Scene Selector */}
          <div className="space-y-3">
            {dmScenes.map((scene, i) => {
              const isActive = i === dmScene;
              return (
                <motion.button
                  key={scene.title}
                  onClick={() => setDmScene(i)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
                      : "border-border/50 bg-card/40 hover:bg-card/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      <scene.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{scene.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{scene.meta}</div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 transition-transform ${isActive ? "rotate-90 text-primary" : "text-muted-foreground"}`} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Live DM Preview */}
          <div className="relative pt-6 pb-6 px-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={dmScene}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="glass-card rounded-2xl p-5 sm:p-6 border border-border/40"
              >
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <InstagramIcon size={18} className="text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">syncsocio_agent</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Active now</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                      {dmScenes[dmScene].userMsg}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <Sparkles size={12} className="text-primary" />
                    </div>
                    <div className="flex gap-1">
                      {[0, 0.3, 0.6].map((delay, idx) => (
                        <motion.div
                          key={idx}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-secondary/70 text-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm mb-2">
                        {dmScenes[dmScene].aiMsg}
                      </div>
                      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 w-fit">
                        <MousePointerClick size={14} className="text-primary" />
                        <span className="text-sm font-medium text-primary">{dmScenes[dmScene].btn}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-1">
                    <Send size={10} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Sent by SyncSocio Agent</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Floating stat pills */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute top-0 right-0 px-3 py-1.5 rounded-full bg-background shadow-lg text-xs font-medium text-foreground border border-border/40 z-10"
            >
              <span className="text-primary font-bold">2.4k</span> replies sent
            </motion.div>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 px-3 py-1.5 rounded-full bg-background shadow-lg text-xs font-medium text-foreground border border-border/40 z-10"
            >
              <span className="text-green-500 font-bold">94%</span> response rate
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DMAutomation;
