import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Layers,
  Film,
  ShoppingBag,
  Sparkles,
  Play,
  ArrowUpRight,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
    { src: "/assets/landing/static1.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static2.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static3.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static4.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static5.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static6.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static7.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static8.jpg", caption: "", tag: "" },
    { src: "/assets/landing/static9.jpg", caption: "", tag: "" },
  ],
  carousel: [
    { src: "/assets/landing/car1.jpg", caption: "5 secrets nobody tells you", tag: "Slide 1/5" },
    { src: "/assets/landing/car2.jpg", caption: "Focus on progress, not perfection", tag: "Slide 2/5" },
    { src: "/assets/landing/car3.jpg", caption: "Save this for later", tag: "Slide 5/5" },
    { src: "/assets/landing/car4.jpg", caption: "Bonus cover slide", tag: "Cover" },
    { src: "/assets/landing/car5.jpg", caption: "Behind the scenes", tag: "Slide 1/3" },
    { src: "/assets/landing/car6.jpg", caption: "Our creative process", tag: "Slide 2/3" },
    { src: "/assets/landing/car7.jpg", caption: "Step 1: Ideation", tag: "Step 1" },
    { src: "/assets/landing/car8.jpg", caption: "Step 2: Design", tag: "Step 2" },
    { src: "/assets/landing/car9.jpg", caption: "Step 3: Publish", tag: "Step 3" },
  ],
  video: [
    { src: "/assets/landing/v1.mp4", caption: "AI UGC creator speaking in Hinglish.", tag: "0:15 · UGC", isVideo: true },
    { src: "/assets/landing/v2.mp4", caption: "Trending audio synced with motion.", tag: "Reel", isVideo: true },
    { src: "/assets/landing/v3.mp4", caption: "Product close-up cutaway.", tag: "B-roll", isVideo: true },
    { src: "/assets/landing/v4.mp4", caption: "Image → cinematic slow-mo splash.", tag: "Img2Video", isVideo: true },
    { src: "/assets/landing/v5.mp4", caption: "Dynamic text overlays.", tag: "Promo", isVideo: true },
    { src: "/assets/landing/v6.mp4", caption: "Unboxing experience.", tag: "UGC", isVideo: true },
    { src: "/assets/landing/v7.mp4", caption: "Behind the scenes.", tag: "BTS", isVideo: true },
    { src: "/assets/landing/v8.mp4", caption: "Customer testimonial.", tag: "Review", isVideo: true },
  ],
  ecomm: [
    // ecomm9 10 11 12 (for hero carousel)
    { src: "/assets/landing/ecom9.jpg", caption: "Nothing Earbuds (Black)", tag: "Tech" },
    { src: "/assets/landing/ecom10.jpg", caption: "Nothing Earbuds (White)", tag: "Tech" },
    { src: "/assets/landing/ecom11.jpg", caption: "Active Noise Cancellation", tag: "Tech" },
    { src: "/assets/landing/ecom12.jpg", caption: "24-hour battery life", tag: "Tech" },
    // ecomm1234
    { src: "/assets/landing/ecom1.jpg", caption: "Indulge Wisely, Indulge Smoor.", tag: "Chocolate" },
    { src: "/assets/landing/ecom2.jpg", caption: "Premium Cocoa Beans.", tag: "Chocolate" },
    { src: "/assets/landing/ecom3.jpg", caption: "The perfect gift box.", tag: "Chocolate" },
    { src: "/assets/landing/ecom4.jpg", caption: "Available in 3 flavors.", tag: "Chocolate" },
    // ecomm56
    { src: "/assets/landing/ecom5.jpg", caption: "Beast Life Mass Gainer.", tag: "Product" },
    { src: "/assets/landing/ecom6.jpg", caption: "High protein, low carb.", tag: "Product" },
    // ecomm78
    { src: "/assets/landing/ecom7.jpg", caption: "Koskii Saree Collection.", tag: "Fashion" },
    { src: "/assets/landing/ecom8.jpg", caption: "Intricate embroidery.", tag: "Fashion" },
  ],
  festival: [
    { src: "/assets/landing/festival1.jpg", caption: "Father's Day Special ✨", tag: "Father's Day" },
    { src: "/assets/landing/festival2.jpg", caption: "Independence Day Freedom Sale.", tag: "Independence Day" },
    { src: "/assets/landing/festival3.jpg", caption: "Eid Mubarak from the team.", tag: "Eid" },
    { src: "/assets/landing/festival4.jpg", caption: "Onam Sadhya Essentials.", tag: "Onam" },
    { src: "/assets/landing/festival5.jpg", caption: "Navratri special collection.", tag: "Navratri" },
    { src: "/assets/landing/festival7.jpg", caption: "Raksha Bandhan hampers.", tag: "Rakhi" },
    { src: "/assets/landing/festival8.jpg", caption: "Diwali drop — 30% off everything.", tag: "Diwali" },
    { src: "/assets/landing/festival9.png", caption: "Ganesh Chaturthi modaks.", tag: "Ganesh" },
    { src: "/assets/landing/festival10.jpg", caption: "Dussehra victory sale.", tag: "Dussehra" },
  ],
};

const CreativeShowcase = () => {
  const [active, setActive] = useState<string>("image");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const items = mocks[active];
  const current = formats.find((f) => f.id === active)!;

  return (
    <section id="creatives" className="relative py-28 sm:py-36 overflow-hidden">
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
          {/* Mobile Dropdown */}
          <div className="sm:hidden relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md font-black uppercase tracking-wider text-foreground"
            >
              <div className="flex items-center gap-3">
                <current.icon size={18} className="text-primary" />
                {current.label}
              </div>
              <ChevronDown size={18} className={`text-muted-foreground transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 p-1.5 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl z-50 shadow-xl flex flex-col gap-1"
                >
                  {formats.map((f) => {
                    const isActive = f.id === active;
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setActive(f.id); setIsMenuOpen(false); }}
                        className={`flex items-center justify-between p-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                          isActive ? `bg-gradient-to-br ${f.accent} text-white` : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <f.icon size={14} />
                          {f.label}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/25 text-white' : 'bg-foreground/10 text-muted-foreground'}`}>
                          {f.count}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden sm:flex relative p-1.5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md flex-nowrap gap-1">
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
              <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-6 gap-6 sm:gap-5 auto-rows-[300px] sm:auto-rows-[150px]">
                {active === "image" ? (
                  <>
                    <Tile item={items[2]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => setEnlargedIndex(2)} />
                    <Tile item={items[0]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onClick={() => setEnlargedIndex(0)} />
                    <Tile item={items[1]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => setEnlargedIndex(1)} />
                    <CarouselTile items={items.slice(3)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onItemClick={(idx) => setEnlargedIndex(idx + 3)} />
                  </>
                ) : ["video", "festival"].includes(active) ? (
                  <>
                    <CarouselTile items={items.slice(3)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => setEnlargedIndex(idx + 3)} />
                    <Tile item={items[0]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onClick={() => setEnlargedIndex(0)} />
                    <Tile item={items[1]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => setEnlargedIndex(1)} />
                    <Tile item={items[2]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onClick={() => setEnlargedIndex(2)} />
                  </>
                ) : active === "ecomm" ? (
                  <>
                    <CarouselTile items={items.slice(0, 4)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => setEnlargedIndex(idx)} />
                    <CarouselTile items={items.slice(4, 8)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onItemClick={(idx) => setEnlargedIndex(idx + 4)} />
                    <CarouselTile items={items.slice(8, 10)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => setEnlargedIndex(idx + 8)} />
                    <CarouselTile items={items.slice(10, 12)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onItemClick={(idx) => setEnlargedIndex(idx + 10)} />
                  </>
                ) : active === "carousel" ? (
                  <>
                    <CarouselTile items={items.slice(0, 2)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => setEnlargedIndex(idx)} />
                    <CarouselTile items={items.slice(2, 4)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onItemClick={(idx) => setEnlargedIndex(idx + 2)} />
                    <CarouselTile items={items.slice(4, 6)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => setEnlargedIndex(idx + 4)} />
                    <CarouselTile items={items.slice(6, 9)} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onItemClick={(idx) => setEnlargedIndex(idx + 6)} />
                  </>
                ) : (
                  <>
                    <HeroTile item={items[0]} accent={current.accent} className="col-span-1 sm:col-span-6 row-span-2 sm:row-span-3" onClick={() => setEnlargedIndex(0)} />
                    <Tile item={items[1]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onClick={() => setEnlargedIndex(1)} />
                    <Tile item={items[2]} accent={current.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" compact onClick={() => setEnlargedIndex(2)} />
                    <Tile item={items[3]} accent={current.accent} className="col-span-1 sm:col-span-6 row-span-1 sm:row-span-2" wide onClick={() => setEnlargedIndex(3)} />
                  </>
                )}
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
      
      {enlargedIndex !== null && (
        <Lightbox items={items} initialIndex={enlargedIndex} onClose={() => setEnlargedIndex(null)} />
      )}
    </section>
  );
};

const HeroTile = ({
  item,
  className,
  accent,
  onClick,
}: {
  item: Item;
  className?: string;
  accent: string;
  onClick?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      onMouseEnter={() => videoRef.current?.play().catch(()=>{})}
      onMouseLeave={() => { if(videoRef.current){ videoRef.current.pause(); videoRef.current.currentTime=0; } }}
      className={`relative rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${className ?? ""}`}
    >
      {item.isVideo || item.src.endsWith(".mp4") ? (
        <video ref={videoRef} src={item.src} loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
      ) : (
        <img src={item.src} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
      )}
    <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-0 group-hover:opacity-25 transition-opacity duration-700 mix-blend-overlay`} />

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
  </motion.div>
  );
};

const Tile = ({
  item,
  className,
  accent,
  compact,
  wide,
  onClick,
}: {
  item: Item;
  className?: string;
  accent: string;
  compact?: boolean;
  wide?: boolean;
  onClick?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      onMouseEnter={() => videoRef.current?.play().catch(()=>{})}
      onMouseLeave={() => { if(videoRef.current){ videoRef.current.pause(); videoRef.current.currentTime=0; } }}
      className={`relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${className ?? ""}`}
    >
      {item.isVideo || item.src.endsWith(".mp4") ? (
        <video ref={videoRef} src={item.src} loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <img src={item.src} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      )}
    <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-0 group-hover:opacity-25 transition-opacity duration-500 mix-blend-overlay`} />

    {item.isVideo && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-xl">
          <Play size={14} className="text-neutral-900 fill-neutral-900 ml-0.5" />
        </div>
      </div>
    )}
  </motion.div>
  );
};

const CarouselTile = ({
  items,
  className,
  accent,
  onItemClick,
}: {
  items: Item[];
  className?: string;
  accent: string;
  onItemClick: (idx: number) => void;
}) => {
  return (
    <div className={`relative w-full h-full rounded-3xl overflow-hidden border border-border/40 group ${className ?? ""}`}>
      <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className="relative min-w-full h-full snap-center shrink-0 cursor-pointer" 
            onClick={() => onItemClick(idx)}
            onMouseEnter={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) video.play().catch(()=>{});
            }}
            onMouseLeave={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) { video.pause(); video.currentTime = 0; }
            }}
          >
            {item.isVideo || item.src.endsWith(".mp4") ? (
              <video src={item.src} loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={item.src} alt={item.caption} loading="lazy" className="w-full h-full object-cover" />
            )}
            <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-0 group-hover:opacity-25 transition-opacity duration-500 mix-blend-overlay pointer-events-none`} />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex items-center gap-1.5 sm:gap-2.5 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10">
        <div className="flex gap-1 sm:gap-1.5">
          {items.map((_, i) => (
            <div key={i} className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white shadow-sm" />
          ))}
        </div>
        <ChevronRight size={12} className="text-white drop-shadow-md animate-pulse sm:hidden" />
        <ChevronRight size={14} className="text-white drop-shadow-md animate-pulse hidden sm:block" />
      </div>
    </div>
  );
};

const Lightbox = ({ items, initialIndex, onClose }: { items: Item[], initialIndex: number, onClose: () => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = initialIndex * scrollRef.current.clientWidth;
    }
  }, [initialIndex]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const videos = scrollRef.current.querySelectorAll('video');
    videos.forEach((vid, i) => {
      if (i === currentIndex) {
        vid.play().catch(()=>{});
      } else {
        vid.pause();
      }
    });
  }, [currentIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount * scrollRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-background"
      >
        {/* Ambient gradients matched from page */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute -top-32 left-1/3 w-[700px] h-[700px] rounded-full opacity-[0.10] blur-[160px] bg-primary" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[140px] bg-fuchsia-500" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <button 
          className="absolute top-6 right-6 z-50 p-2.5 text-white hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 shadow-2xl rounded-full transition-all backdrop-blur-md"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <button 
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-3 text-white hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 shadow-2xl rounded-full transition-all backdrop-blur-md hidden sm:block"
          onClick={(e) => { e.stopPropagation(); scrollByAmount(-1); }}
        >
          <ChevronLeft size={32} />
        </button>

        <button 
          className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-3 text-white hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 shadow-2xl rounded-full transition-all backdrop-blur-md hidden sm:block"
          onClick={(e) => { e.stopPropagation(); scrollByAmount(1); }}
        >
          <ChevronRight size={32} />
        </button>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 w-full h-full flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((item, idx) => (
            <div 
              key={idx} 
              className="w-full h-full shrink-0 snap-center flex items-center justify-center p-4 sm:p-12 cursor-pointer"
              onClick={onClose}
            >
              {item.isVideo || item.src.endsWith(".mp4") ? (
                <video 
                  src={item.src}
                  controls
                  playsInline
                  className="max-w-full max-h-full rounded-2xl shadow-2xl" 
                  onClick={(e) => e.stopPropagation()} 
                />
              ) : (
                <img 
                  src={item.src} 
                  className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl cursor-default" 
                  onClick={(e) => e.stopPropagation()} 
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreativeShowcase;
