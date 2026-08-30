import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MessageSquare, Mail, CheckCheck, Paperclip, Upload, Users, Send, Sparkles, FileSpreadsheet } from "lucide-react";

type Channel = "whatsapp" | "email";

const waMessages = [
  { from: "brand", text: "Hey Priya 👋 Diwali drop is live — 30% off everything ✨", time: "10:24" },
  { from: "brand", text: "Use code DIWALI30 at checkout. Free shipping above ₹999 🚚", time: "10:24", img: true },
  { from: "user", text: "Loved the new collection! 😍", time: "10:26" },
];

const emailPreview = {
  subject: "🪔 Diwali drop is live — 30% off, just for you",
  from: "SyncSocio Studio <hello@syncsocio.in>",
  preheader: "Your favourites + new arrivals. Code DIWALI30 inside.",
};

const CampaignChannels = () => {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSentCount((c) => (c + 47) % 12480);
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="channels" className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[120px] bg-emerald-500" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[120px] bg-primary" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block font-mono"
          >
            Broadcast Engine
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight"
          >
            Talk to every customer.{" "}
            <span className="gradient-text">At the same time.</span>
          </motion.h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg mt-5 font-medium leading-relaxed">
            Upload your list, drop a description, hit generate — your WhatsApp and email campaigns ship to thousands in one click.
          </p>
        </div>

        {/* Channel toggle */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="inline-flex p-1 rounded-full border border-border/50 bg-card/40 backdrop-blur-sm">
            {(["whatsapp", "email"] as Channel[]).map((c) => {
              const isActive = c === channel;
              const Icon = c === "whatsapp" ? MessageSquare : Mail;
              return (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="ch-bg"
                      className="absolute inset-0 rounded-full bg-primary/15 border border-primary/30"
                    />
                  )}
                  <Icon size={14} className="relative z-10 text-primary" />
                  <span className="relative z-10 capitalize">{c === "whatsapp" ? "WhatsApp Campaign (Beta)" : "Email Campaign"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 max-w-6xl mx-auto items-start">
          {/* LEFT — Composer mock */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 space-y-3"
          >
            <div className="glass-card rounded-2xl p-5 border border-border/40 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-primary animate-pulse" />
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Campaign Brief</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1.5">Product</div>
                  <div className="text-sm text-foreground font-bold">Diwali Gifting Box — Premium</div>
                </div>
                <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1.5">Description</div>
                  <div className="text-sm text-foreground font-semibold leading-relaxed">Festive drop with 30% off, free shipping above ₹999, code DIWALI30. Warm, celebratory tone.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Language</div>
                    <div className="text-sm font-black text-foreground">Hinglish</div>
                  </div>
                  <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Tone</div>
                    <div className="text-sm font-black text-foreground">Festive 🪔</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient list */}
            <div className="glass-card rounded-2xl p-5 border border-border/40 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recipients</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-bold">{sentCount.toLocaleString()} contacts</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: FileSpreadsheet, label: "CSV" },
                  { icon: Upload, label: "Excel" },
                  { icon: Paperclip, label: "Paste" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-dashed border-border/60 bg-secondary/30 p-2.5 text-center hover:border-primary/40 transition-colors cursor-pointer group">
                    <s.icon size={14} className="text-muted-foreground mx-auto mb-1 group-hover:text-primary transition-colors" />
                    <div className="text-[10px] font-bold text-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex -space-x-2">
                {["P", "R", "A", "S", "N"].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-black text-primary-foreground bg-gradient-to-br ${
                    ["from-rose-400 to-rose-600", "from-amber-400 to-orange-600", "from-emerald-400 to-teal-600", "from-sky-400 to-indigo-600", "from-fuchsia-400 to-purple-600"][i]
                  }`}>{c}</div>
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-black text-muted-foreground">
                  +12k
                </div>
              </div>
            </div>

            {/* Send button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full rounded-2xl px-5 py-4 gradient-bg text-primary-foreground font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <Send size={14} className="animate-pulse" />
              Send to {sentCount.toLocaleString()} {channel === "whatsapp" ? "numbers" : "inboxes"}
            </motion.button>
          </motion.div>

          {/* RIGHT — Live preview */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {channel === "whatsapp" ? (
                <motion.div
                  key="wa"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mx-auto max-w-sm"
                >
                  {/* Phone frame */}
                  <div className="rounded-[2.5rem] border-[10px] border-foreground/90 bg-foreground/90 shadow-2xl shadow-emerald-500/10 overflow-hidden">
                    <div className="bg-[#075E54] text-white px-4 pt-3 pb-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-black">VS</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">SyncSocio Studio</div>
                        <div className="text-[10px] opacity-80 font-semibold">online</div>
                      </div>
                      <div className="text-[10px] bg-white/20 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">Business</div>
                    </div>
                    <div className="bg-[#ECE5DD] p-3 space-y-2 min-h-[420px]">
                      {waMessages.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.3 }}
                          className={`flex ${m.from === "brand" ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-[12.5px] shadow-sm ${
                            m.from === "brand" ? "bg-white text-neutral-900 rounded-tl-none font-semibold" : "bg-[#DCF8C6] text-neutral-900 rounded-tr-none font-semibold"
                          }`}>
                            {m.img && (
                              <div className="rounded-lg overflow-hidden mb-1.5 -mx-0.5 aspect-[4/3] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-4xl shadow-inner">
                                🪔
                              </div>
                            )}
                            <p className="leading-snug">{m.text}</p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <span className="text-[9px] text-neutral-400 font-bold">{m.time}</span>
                              {m.from === "brand" && <CheckCheck size={11} className="text-sky-500" />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
                          <div className="flex gap-1.5 items-center">
                            {[0, 0.2, 0.4].map((d, i) => (
                              <motion.span
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.2, delay: d }}
                                className="w-1.5 h-1.5 rounded-full bg-neutral-400"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">
                    Delivered to <span className="text-foreground font-black">12,480</span> WhatsApp numbers
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="em"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5"
                >
                  {/* Mac window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-secondary/30">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
                    <span className="text-[10px] font-bold text-muted-foreground ml-3 uppercase tracking-wider">Inbox — Priya Sharma</span>
                  </div>
                  {/* Email header */}
                  <div className="p-5 border-b border-border/40">
                    <h3 className="text-base sm:text-lg font-black text-foreground mb-2">{emailPreview.subject}</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center text-xs font-black text-primary-foreground">VS</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground">{emailPreview.from}</div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">to priya@example.com · 10:24 AM</div>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1 uppercase tracking-wider">DELIVERED</span>
                    </div>
                  </div>
                  {/* Email body */}
                  <div className="p-6">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 aspect-[16/9] flex items-center justify-center text-7xl mb-5 shadow-lg">
                      🪔
                    </div>
                    <h4 className="text-lg font-black text-foreground mb-2">Diwali drop is live ✨</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-5">
                      Hey Priya, the festival drop is here. 30% off across the entire collection, plus free shipping on orders above ₹999. Limited stock — grab yours before it's gone.
                    </p>
                    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-bg text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all cursor-pointer">
                      Shop the drop →
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground mt-6 uppercase tracking-wider">Use code <span className="font-black text-foreground">DIWALI30</span> at checkout.</p>
                  </div>
                  <div className="px-5 py-3 border-t border-border/40 bg-secondary/20 flex items-center justify-between">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sent to 12,480 inboxes</span>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-foreground">42% open</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-foreground">11% CTR</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CampaignChannels;
