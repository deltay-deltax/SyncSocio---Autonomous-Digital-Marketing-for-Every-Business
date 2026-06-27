import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Layers,
  Film,
  ShoppingBag,
  Sparkles,
  Play,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";

// Beautiful Unsplash fallback URLs to avoid missing local asset import compile errors
const imgCoffee = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600";
const imgJuice = "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=600";
const imgPerfume = "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=600";
const imgChocolate = "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=600";

const carousel1 = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600";
const carousel2 = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=600";
const carousel3 = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600";

const videoUgc = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600";
const videoProduct = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600";
const videoDance = "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=600";

const ecommEarbuds = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600";
const ecommBag = "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600";
const ecommShoes = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600";

const festDiwali = "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&q=80&w=600";
const festHoli = "https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&q=80&w=600";
const festEid = "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600";
const festXmas = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600";

type Format = {
  id: string;
  label: string;
  icon: any;
  tagline: string;
  accent: string;
  count: string;
};

const formats: Format[] = [
  { id: "image", label: "Static Image", icon: ImageIcon, tagline: "Scroll-stopping single frames", accent: "from-sky-400 via-indigo-500 to-violet-600", count: "2–8" },
  { id: "carousel", label: "Carousel", icon: Layers, tagline: "Swipeable multi-slide stories", accent: "from-amber-400 via-orange-500 to-rose-600", count: "3/5/7" },
  { id: "video", label: "Reel · Video", icon: Film, tagline: "AI UGC + Image-to-Video", accent: "from-rose-500 via-pink-500 to-fuchsia-600", count: "Up to 4" },
  { id: "ecomm", label: "E-Comm", icon: ShoppingBag, tagline: "Amazon & Flipkart-ready creatives", accent: "from-emerald-400 via-teal-500 to-cyan-600", count: "Hero+" },
  { id: "festival", label: "Festival", icon: Sparkles, tagline: "40+ festivals, auto-timed drops", accent: "from-violet-500 via-purple-500 to-fuchsia-600", count: "40+" },
];

type Item = { src: string; caption: string; tag: string; isVideo?: boolean };

const mocks: Record<string, Item[]> = {
  image: [
    { src: imgCoffee, caption: "Mornings, sorted with our artisan blend.", tag: "Lifestyle" },
    { src: imgPerfume, caption: "The drop you've been waiting for.", tag: "Launch" },
    { src: imgJuice, caption: "Clean. Cold-pressed. Yours.", tag: "Product" },
    { src: imgChocolate, caption: "Bite-sized happiness, delivered.", tag: "Food" },
  ],
  carousel: [
    { src: carousel1, caption: "5 secrets nobody tells you", tag: "Slide 1/5" },
    { src: carousel2, caption: "Focus on progress, not perfection", tag: "Slide 2/5" },
    { src: carousel3, caption: "Save this for later", tag: "Slide 5/5" },
    { src: imgChocolate, caption: "Bonus cover slide", tag: "Cover" },
  ],
  video: [
    { src: videoUgc, caption: "AI UGC creator speaking in Hinglish.", tag: "0:15 · UGC", isVideo: true },
    { src: videoProduct, caption: "Image → cinematic slow-mo splash.", tag: "Img2Video", isVideo: true },
    { src: videoDance, caption: "Trending audio synced with motion.", tag: "Reel", isVideo: true },
    { src: imgPerfume, caption: "Product close-up cutaway.", tag: "B-roll", isVideo: true },
  ],
  ecomm: [
    { src: ecommEarbuds, caption: "Hero shot · A+ content for Amazon.", tag: "Amazon" },
    { src: ecommBag, caption: "Spec callouts · infographic style.", tag: "Detail" },
    { src: ecommShoes, caption: "Lifestyle backdrop · Flipkart-ready.", tag: "Flipkart" },
    { src: imgJuice, caption: "Variant grid · multiple angles.", tag: "Variant" },
  ],
  festival: [
    { src: festDiwali, caption: "Diwali drop — 30% off everything ✨", tag: "Diwali" },
    { src: festHoli, caption: "Holi vibes, bold colours, bolder offers.", tag: "Holi" },
    { src: festEid, caption: "Eid Mubarak from the team.", tag: "Eid" },
    { src: festXmas, caption: "Year-end gifting guide is here.", tag: "X-mas" },
  ],
};

const CreativeShowcase = () => {
  const [active, setActive] = useState<string>("image");
  const items = mocks[active];
  const current = formats.find((f) => f.id === active)!;

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden">
      {/* Ambient gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/3 w-[700px] h-[700px] rounded-full opacity-[0.10] blur-[160px] bg-primary" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[140px] bg-fuchsia-500" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Editorial header */}
        <div className="grid grid-cols-12 gap-6 items-end mb-14 max-w-6xl mx-auto">
          <div className="col-span-12 lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-6"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-black text-primary uppercase tracking-[0.18em]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                The Creative Engine
              </span>
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest hidden sm:inline">
                Vol. 01 — Output Gallery
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]"
            >
              Every format your brand needs.
              <br />
              <span className="gradient-text italic font-serif">Shipped in seconds.</span>
            </motion.h2>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed border-l-2 border-primary/30 pl-5 font-medium">
              From scroll-stopping statics to swipeable carousels, AI UGC reels, Amazon listings and 40+ festival drops — one agent, every format, every language.
            </p>
          </div>
        </div>

        {/* Format selector — segmented control */}
        <div className="max-w-6xl mx-auto mb-10">
          <div className="relative p-1.5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md flex flex-wrap gap-1 sm:flex-nowrap">
            {formats.map((f) => {
              const isActive = f.id === active;
              return (
                <button
                  key={f.id}
                  onClick={() => setActive(f.id)}
                  className={`relative flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                    isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="format-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className={`absolute inset-0 rounded-xl bg-gradient-to-br ${f.accent} shadow-lg shadow-primary/20`}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <f.icon size={14} />
                    <span className="whitespace-nowrap">{f.label}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f.count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editorial split layout */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="grid grid-cols-12 gap-4 sm:gap-5"
            >
              {/* LEFT — meta card */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                {/* Format meta */}
                <div className="rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md p-6 sm:p-7 relative overflow-hidden">
                  <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${current.accent} opacity-20 blur-3xl`} />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${current.accent} flex items-center justify-center shadow-lg mb-5`}>
                    <current.icon size={22} className="text-white" />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">
                    Format · {String(formats.findIndex(f => f.id === active) + 1).padStart(2, "0")}/{String(formats.length).padStart(2, "0")}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">{current.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-semibold">{current.tagline}</p>

                  <div className="space-y-2.5 pt-5 border-t border-border/40">
                    {[
                      { k: "Per asset", v: "<30s" },
                      { k: "Languages", v: "5" },
                      { k: "Output", v: current.count },
                    ].map((row) => (
                      <div key={row.k} className="flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground font-mono uppercase tracking-wider">{row.k}</span>
                        <span className="text-foreground">{row.v}</span>
                      </div>
                    ))}
                  </div>

                  <button className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${current.accent} text-white text-xs font-black uppercase tracking-widest shadow-lg group hover:brightness-110 transition-all`}>
                    Generate {current.label}
                    <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
                  </button>
                </div>

                {/* Languages strip */}
                <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
                    Speaks fluently
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["English", "Hinglish", "हिंदी", "தமிழ்", "ಕನ್ನಡ"].map((l) => (
                      <span
                        key={l}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-foreground/5 border border-border/40 text-foreground"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — hero + masonry */}
              <div className="col-span-12 lg:col-span-8 grid grid-cols-6 gap-4 sm:gap-5 auto-rows-[120px] sm:auto-rows-[150px]">
                <HeroTile item={items[0]} accent={current.accent} className="col-span-6 row-span-3" />
                <Tile item={items[1]} accent={current.accent} className="col-span-3 row-span-2" />
                <Tile item={items[2]} accent={current.accent} className="col-span-3 row-span-2" compact />
                <Tile item={items[3]} accent={current.accent} className="col-span-6 row-span-2" wide />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom proof bar */}
        <div className="mt-14 max-w-6xl mx-auto">
          <div className="relative rounded-3xl border border-border/40 bg-gradient-to-r from-card/80 via-card/40 to-card/80 backdrop-blur-md p-1.5 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40">
              {[
                { v: "5", l: "Formats", s: "Image · Carousel · Video · E-Comm · Festival" },
                { v: "40+", l: "Festivals mapped", s: "Diwali, Holi, Eid, X-mas & more" },
                { v: "5", l: "Languages", s: "English · Hinglish · Hindi · Tamil · Kannada" },
                { v: "<30s", l: "Per asset", s: "Idea → ready-to-post creative" },
              ].map((s, i) => (
                <motion.div
                  key={s.l}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="p-5 sm:p-6"
                >
                  <div className="text-3xl sm:text-4xl font-black gradient-text leading-none">{s.v}</div>
                  <div className="text-xs font-black text-foreground mt-2 uppercase tracking-wider">{s.l}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug font-medium">{s.s}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroTile = ({
  item,
  className,
  accent,
}: {
  item: Item;
  className?: string;
  accent: string;
}) => (
  <motion.div
    whileHover={{ y: -3 }}
    className={`relative rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${className ?? ""}`}
  >
    <img src={item.src} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
    <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-0 group-hover:opacity-25 transition-opacity duration-700 mix-blend-overlay`} />

    {/* corner brand */}
    <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
      <span className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-black text-neutral-900 uppercase tracking-widest shadow-md">
        ★ Featured Output
      </span>
      <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 uppercase tracking-wider">
        {item.tag}
      </span>
    </div>

    {item.isVideo && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl"
        >
          <Play size={24} className="text-neutral-900 fill-neutral-900 ml-1" />
        </motion.div>
      </div>
    )}

    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/70 mb-2">
        Generated by SyncSocio · just now
      </div>
      <p className="text-white font-black text-lg sm:text-xl leading-tight drop-shadow-lg max-w-md">
        {item.caption}
      </p>
    </div>
  </motion.div>
);

const Tile = ({
  item,
  className,
  accent,
  compact,
  wide,
}: {
  item: Item;
  className?: string;
  accent: string;
  compact?: boolean;
  wide?: boolean;
}) => (
  <motion.div
    whileHover={{ y: -3 }}
    className={`relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${className ?? ""}`}
  >
    <img src={item.src} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
    <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-0 group-hover:opacity-25 transition-opacity duration-500 mix-blend-overlay`} />

    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 uppercase tracking-wider">
      {item.tag}
    </span>

    {item.isVideo && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-xl">
          <Play size={14} className="text-neutral-900 fill-neutral-900 ml-0.5" />
        </div>
      </div>
    )}

    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
      <p className={`text-white font-bold leading-tight drop-shadow-md ${wide ? "text-sm sm:text-base" : "text-xs sm:text-sm"} ${compact ? "line-clamp-1" : "line-clamp-2"}`}>
        {item.caption}
      </p>
    </div>
  </motion.div>
);

export default CreativeShowcase;
