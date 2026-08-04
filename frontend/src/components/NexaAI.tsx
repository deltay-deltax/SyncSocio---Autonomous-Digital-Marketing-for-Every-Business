import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bot,
  IndianRupee,
  MessageSquare,
  Moon,
  Package,
  Phone,
  ShoppingBag,
  Zap,
} from "lucide-react";

const InstagramIcon = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

type Turn = { from: "user" | "agent"; text: string };

const flows = {
  instagram: {
    label: "Instagram DM",
    handle: "@aarav.styles",
    icon: InstagramIcon,
    turns: [
      { from: "user", text: "Bhai is the oversized tee in stock? 👀" },
      { from: "agent", text: "Yes! Black & sand, S–XXL. ₹1,299 with free shipping." },
      { from: "user", text: "Take one black, size L" },
      { from: "agent", text: "Locked it in 🔒 Sending you a secure payment link now." },
    ] as Turn[],
    order: { title: "Oversized Tee · Black · L", value: "₹1,299", channel: "Instagram" },
  },
  whatsapp: {
    label: "WhatsApp",
    handle: "+91 98•• ••4412",
    icon: Phone,
    turns: [
      { from: "user", text: "Do you deliver to Coimbatore?" },
      { from: "agent", text: "We do — 2 day delivery, COD available 🚚" },
      { from: "agent", text: "Want me to reserve the combo pack at ₹2,499?" },
      { from: "user", text: "Yes please, COD" },
    ] as Turn[],
    order: { title: "Combo Pack · COD", value: "₹2,499", channel: "WhatsApp" },
  },
};

type ChannelKey = keyof typeof flows;

const NexaAI = () => {
  const [channel, setChannel] = useState<ChannelKey>("instagram");
  const [step, setStep] = useState(0);
  const flow = flows[channel];
  const total = flow.turns.length;

  useEffect(() => {
    setStep(0);
  }, [channel]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (step < total) setStep((s) => s + 1);
      else {
        setChannel((c) => (c === "instagram" ? "whatsapp" : "instagram"));
      }
    }, step === total ? 2600 : 1300);
    return () => clearTimeout(t);
  }, [step, total]);

  const closed = step >= total;

  return (
    <section id="nexa-ai" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 left-1/3 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
            >
              <Bot size={15} /> Meet Nexa AI
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-6"
            >
              It sells while you{" "}
              <span className="gradient-text">sleep.</span>
            </motion.h2>

            <p className="text-lg text-muted-foreground max-w-lg mb-8">
              Nexa AI answers every DM and WhatsApp message in your brand voice, handles
              objections, takes the order and drops it straight into your CRM dashboard —
              at 3am, on a festival, during a sale spike.
            </p>

            <div className="space-y-3 mb-9">
              {[
                { icon: Moon, t: "Always on", d: "Zero missed replies between 11pm and 9am." },
                { icon: ShoppingBag, t: "Closes the order", d: "Size, colour, COD, payment link — all handled." },
                { icon: Package, t: "Straight to CRM", d: "Every order lands in your dashboard, ready to ship." },
              ].map((f, i) => (
                <motion.div
                  key={f.t}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-start gap-4 p-4 rounded-2xl glass-card"
                >
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                    <f.icon size={18} className="text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{f.t}</div>
                    <div className="text-sm text-muted-foreground">{f.d}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {(Object.keys(flows) as ChannelKey[]).map((k) => {
                const active = k === channel;
                const Icon = flows[k].icon;
                return (
                  <button
                    key={k}
                    onClick={() => setChannel(k)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? "gradient-bg text-primary-foreground border-transparent shadow-lg"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon size={15} /> {flows[k].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live conversation */}
          <div className="relative">
            <div className="rounded-[2rem] glass-card p-5 sm:p-6 border border-border/40">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/40">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                  <flow.icon size={17} className="text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{flow.handle}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Nexa AI handling
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  02:41 AM
                </span>
              </div>

              <div className="space-y-3 min-h-[280px]">
                <AnimatePresence mode="popLayout">
                  {flow.turns.slice(0, step).map((turn, i) => (
                    <motion.div
                      key={`${channel}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 14, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      className={`flex ${turn.from === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[82%] px-4 py-2.5 text-sm rounded-2xl ${
                          turn.from === "user"
                            ? "bg-secondary/70 text-foreground rounded-tl-sm"
                            : "gradient-bg text-primary-foreground rounded-tr-sm shadow-lg shadow-primary/20"
                        }`}
                      >
                        {turn.from === "agent" && (
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80 mb-1">
                            <Zap size={10} /> NEXA AI
                          </span>
                        )}
                        {turn.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!closed && (
                  <div className="flex gap-1 pl-1 pt-1">
                    {[0, 0.2, 0.4].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.1, delay: d }}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* CRM handoff */}
              <AnimatePresence>
                {closed && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <BadgeCheck size={16} className="text-primary" />
                      <span className="text-xs font-bold tracking-wide text-primary uppercase">
                        Order pushed to CRM
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{flow.order.title}</div>
                        <div className="text-xs text-muted-foreground">
                          via {flow.order.channel} · auto-confirmed
                        </div>
                      </div>
                      <div className="flex items-center text-lg font-bold text-foreground">
                        <IndianRupee size={15} className="mr-0.5" />
                        {flow.order.value.replace("₹", "")}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
              className="absolute -top-4 -right-2 sm:-right-5 px-3 py-2 rounded-2xl bg-background border border-border/50 shadow-xl text-xs font-semibold flex items-center gap-2"
            >
              <MessageSquare size={13} className="text-primary" />
              <span><span className="text-primary font-bold">18</span> deals closed tonight</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NexaAI;
