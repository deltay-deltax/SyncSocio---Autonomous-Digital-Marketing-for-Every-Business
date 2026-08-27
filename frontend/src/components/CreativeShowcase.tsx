import { motion, AnimatePresence, useScroll, useTransform, MotionValue } from "framer-motion";
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
import { useNavigate } from "react-router-dom";

const optimizeCloudinaryUrl = (url: string) => {
  if (url && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/upload/q_auto')) {
      return url.replace('/upload/', '/upload/q_auto,f_auto/');
    }
  }
  return url;
};

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
  image: [],
  carousel: [],
  video: [
    { src: "/assets/landing/v1.mp4", caption: "AI UGC creator speaking in Hinglish.", tag: "0:15 · UGC", isVideo: true },
    { src: "/assets/landing/v2.mp4", caption: "Trending audio synced with motion.", tag: "Reel", isVideo: true },
    { src: "/assets/landing/v8.mp4", caption: "Customer testimonial.", tag: "Review", isVideo: true },
    { src: "/assets/landing/v4.mp4", caption: "Image → cinematic slow-mo splash.", tag: "Img2Video", isVideo: true },
    { src: "/assets/landing/v5.mp4", caption: "Dynamic text overlays.", tag: "Promo", isVideo: true },
    { src: "/assets/landing/v6.mp4", caption: "Unboxing experience.", tag: "UGC", isVideo: true },

  ],
  ecomm: [],
  festival: [],
};

const CreativeShowcase = () => {
  const navigate = useNavigate();
  const [enlargedIndex, setEnlargedIndex] = useState<{ format: string; index: number } | null>(null);
  const [dynamicMocks, setDynamicMocks] = useState<Record<string, Item[]>>(mocks);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const res = await fetch(`${API_URL}/site/settings`, { cache: 'no-store' });
        const data = await res.json();
        console.log("CreativeShowcase fetched settings:", data);
        if (data.success && data.settings?.creativeShowcaseGallery) {
          const fetched = data.settings.creativeShowcaseGallery;
          console.log("CreativeShowcase fetched gallery:", fetched);

          const padArray = (fetchedArr: any[] | undefined, defaultArr: any[]) => {
            if (!fetchedArr || fetchedArr.length === 0) return defaultArr;
            return [...fetchedArr, ...defaultArr.slice(fetchedArr.length)];
          };

          const exactArray = (fetchedArr: any[] | undefined, defaultArr: any[]) => {
            if (!fetchedArr || fetchedArr.length === 0) return defaultArr;
            return fetchedArr;
          };

          const newMocks = {
            image: padArray(fetched.image, mocks.image),
            carousel: exactArray(fetched.carousel, mocks.carousel),
            video: padArray(fetched.video, mocks.video),
            ecomm: padArray(fetched.ecomm, mocks.ecomm),
            festival: padArray(fetched.festival, mocks.festival),
          };
          console.log("CreativeShowcase padded mocks:", newMocks);
          setDynamicMocks(newMocks);

          // Preload images into browser cache for buttery smooth rendering
          Object.values(newMocks).flat().forEach((item) => {
            if (item && item.src && !item.isVideo && !item.src.endsWith(".mp4")) {
              const img = new globalThis.Image();
              img.src = optimizeCloudinaryUrl(item.src);
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch dynamic showcase gallery", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

  return (
    <section id="creatives" className="relative pt-28 sm:pt-36 pb-32 overflow-x-clip bg-background">
      <style>{`
        .sleek-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sleek-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sleek-scroll::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border) / 0.8);
          border-radius: 10px;
        }
        .sleek-scroll::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--primary));
        }
      `}</style>
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

      <div className="container mx-auto px-6 relative z-10 mb-14">
        {/* Editorial header */}
        <div className="grid grid-cols-12 gap-6 items-end max-w-12xl mx-auto">
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
              className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]"
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
      </div>

      {/* Stacking Cards Container */}
      <div ref={containerRef} className="relative z-20">
        {formats.map((f, i) => (
          <StackingCard
            key={f.id}
            format={f}
            items={dynamicMocks[f.id]}
            index={i}
            totalCards={formats.length}
            progress={scrollYProgress}
            onEnlarge={(idx) => setEnlargedIndex({ format: f.id, index: idx })}
          />
        ))}
      </div>

      {/* Bottom proof bar */}
      <div className="mt-32 max-w-7xl mx-auto px-6 relative z-10">
        <div className="relative rounded-3xl border border-border/40 bg-gradient-to-r from-card/80 via-card/40 to-card/80 backdrop-blur-md p-1.5 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40">
            {[
              { v: "5", l: "Formats", s: "Image · Carousel · Video · E-Comm · Festival" },
              { v: "40+", l: "Festivals mapped", s: "Diwali, Holi, Eid, X-mas & more" },
              { v: "14", l: "Languages", s: "English · Hinglish · Hindi · Tamil · Kannada · Nepali & 8 more" },
              { v: "2 min", l: "Avg time", s: "Idea → ready-to-post creative" },
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

      {enlargedIndex !== null && dynamicMocks[enlargedIndex.format] && (
        <Lightbox items={dynamicMocks[enlargedIndex.format]} initialIndex={enlargedIndex.index} onClose={() => setEnlargedIndex(null)} />
      )}
    </section>
  );
};

const StackingCard = ({
  format,
  items,
  index,
  totalCards,
  progress,
  onEnlarge
}: {
  format: Format;
  items: Item[];
  index: number;
  totalCards: number;
  progress: MotionValue<number>;
  onEnlarge: (idx: number) => void;
}) => {
  const targetScale = 1 - ((totalCards - index) * 0.05);
  const range = [index / totalCards, 1];
  const scale = useTransform(progress, range, [1, targetScale]);

  if (!items || items.length === 0) return null;

  const gridClass = ["image", "festival"].includes(format.id)
    ? "columns-1 sm:columns-2 gap-4 sm:gap-6"
    : format.id === "carousel"
      ? "w-full"
      : format.id === "ecomm"
        ? "grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-1.5 content-start"
        : "grid grid-cols-1 sm:grid-cols-6 gap-6 sm:gap-5 auto-rows-[300px] sm:auto-rows-[150px]";

  return (
    <div className="sticky top-0 h-screen w-full flex flex-col justify-start" style={{ paddingTop: `calc(12vh + ${index * 24}px)` }}>
      <motion.div
        style={{ scale }}
        className="relative w-[95%] max-w-7xl mx-auto h-[78vh] rounded-[32px] sm:rounded-[40px] border border-border/20 overflow-hidden shadow-2xl p-6 sm:p-10 transform-gpu flex flex-col"
      >
        {/* Base opaque layer using native background, then card styling on top to preserve their exact theme without forcing black */}
        <div className="absolute inset-0 bg-background pointer-events-none" />
        <div className="absolute inset-0 bg-card pointer-events-none" />
        <div className={`absolute inset-0 bg-gradient-to-br ${format.accent} opacity-[0.03] mix-blend-overlay pointer-events-none`} />

        <div className="grid grid-cols-12 gap-8 h-full relative z-10 w-full">
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="mb-2">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${format.accent} flex items-center justify-center shadow-lg`}>
                  <format.icon size={22} className="text-white" />
                </div>
                <div className="lg:hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
                  Format · {String(index + 1).padStart(2, "0")}/{String(totalCards).padStart(2, "0")}
                </div>
              </div>
              
              <div className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">
                Format · {String(index + 1).padStart(2, "0")}/{String(totalCards).padStart(2, "0")}
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">{format.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-semibold">{format.tagline}</p>
            </div>
             
            <div className="space-y-2.5 pt-5 border-t border-border/40 hidden sm:block">
              {[
                { k: "Avg time", v: "2 min" },
                { k: "Languages", v: "14" },
                { k: "Output", v: format.count },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground font-mono uppercase tracking-wider">{row.k}</span>
                  <span className="text-foreground">{row.v}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto hidden xl:block">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
                Speaks fluently
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["English", "Hinglish", "हिंदी", "தமிழ்", "+10"].map((l) => (
                  <span
                    key={l}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-foreground/5 border border-border/40 text-foreground"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate("/signup")}
              className={`mt-auto xl:mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${format.accent} text-white text-xs font-black uppercase tracking-widest shadow-lg group hover:brightness-110 transition-all`}>
              Generate {format.label}
              <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
            </button>
          </div>

          <div className="col-span-12 lg:col-span-8 h-full overflow-y-auto sleek-scroll pb-10 pr-2">
            <div className={gridClass}>
              {["image", "festival"].includes(format.id) ? (
                <>
                  {items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="relative break-inside-avoid mb-4 sm:mb-6 w-full">
                      <Tile masonry item={item} accent={format.accent} className="w-full h-full" onClick={() => onEnlarge(idx)} />
                      {idx === 3 && items.length > 4 && (
                        <div
                          className="absolute inset-0 bg-black/60 rounded-2xl sm:rounded-3xl flex items-center justify-center cursor-pointer z-10"
                          onClick={() => onEnlarge(idx)}
                        >
                          <span className="text-white text-2xl sm:text-3xl font-black">+{items.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : format.id === "video" ? (
                <>
                  <CarouselTile items={items.slice(3)} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onItemClick={(idx) => onEnlarge(idx + 3)} />
                  <Tile item={items[0]} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => onEnlarge(0)} />
                  <Tile item={items[1]} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => onEnlarge(1)} />
                  <Tile item={items[2]} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-2 sm:row-span-3" onClick={() => onEnlarge(2)} />
                </>
              ) : format.id === "ecomm" ? (
                <>
                  {items.slice(0, 9).map((item, idx) => (
                    <div key={idx} className="relative w-full aspect-square">
                      <Tile item={item} accent={format.accent} className="w-full h-full" onClick={() => onEnlarge(idx)} />
                    </div>
                  ))}
                </>
              ) : format.id === "carousel" ? (
                <div className="grid grid-cols-2 gap-4 sm:gap-5 w-full">
                  {items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="relative w-full">
                      <Tile masonry item={item} accent={format.accent} className="w-full" onClick={() => onEnlarge(idx)} />
                      {idx === 3 && items.length > 4 && (
                        <div
                          className="absolute inset-0 bg-black/60 rounded-2xl sm:rounded-3xl flex items-center justify-center cursor-pointer z-10 hover:bg-black/70 transition"
                          onClick={() => onEnlarge(idx)}
                        >
                          <span className="text-white text-2xl sm:text-3xl font-black">+{items.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <HeroTile item={items[0]} accent={format.accent} className="col-span-1 sm:col-span-6 row-span-2 sm:row-span-3" onClick={() => onEnlarge(0)} />
                  <Tile item={items[1]} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" onClick={() => onEnlarge(1)} />
                  <Tile item={items[2]} accent={format.accent} className="col-span-1 sm:col-span-3 row-span-1 sm:row-span-2" compact onClick={() => onEnlarge(2)} />
                  <Tile item={items[3]} accent={format.accent} className="col-span-1 sm:col-span-6 row-span-1 sm:row-span-2" wide onClick={() => onEnlarge(3)} />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      onMouseEnter={() => videoRef.current?.play().catch(() => { })}
      onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
      className={`relative rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${className ?? ""}`}
    >
      {item.isVideo || item.src.endsWith(".mp4") ? (
        <video ref={videoRef} src={item.src} loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110 bg-muted/40" />
      ) : (
        <img src={optimizeCloudinaryUrl(item.src)} alt={item.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110 bg-muted/40" />
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
  masonry,
  onClick,
}: {
  item: Item;
  className?: string;
  accent: string;
  compact?: boolean;
  wide?: boolean;
  masonry?: boolean;
  onClick?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      onMouseEnter={() => videoRef.current?.play().catch(() => { })}
      onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
      className={`relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 group cursor-pointer ${masonry ? "break-inside-avoid" : ""} ${className ?? ""}`}
    >
      {item.isVideo || item.src.endsWith(".mp4") ? (
        <video ref={videoRef} src={item.src} loop muted playsInline className={`${masonry ? "w-full h-auto" : "absolute inset-0 w-full h-full object-cover"} transition-transform duration-700 group-hover:scale-105 bg-muted/40`} />
      ) : (
        <img src={optimizeCloudinaryUrl(item.src)} alt={item.caption} loading="lazy" className={`${masonry ? "w-full h-auto" : "absolute inset-0 w-full h-full object-cover"} transition-transform duration-700 group-hover:scale-105 bg-muted/40`} />
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
    <div className={`relative w-full rounded-3xl overflow-hidden border border-border/40 group ${className?.includes('aspect-') || className?.includes('h-') ? "" : "h-full"} ${className ?? ""}`}>
      <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="relative min-w-full h-full snap-center shrink-0 cursor-pointer"
            onClick={() => onItemClick(idx)}
            onMouseEnter={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) video.play().catch(() => { });
            }}
            onMouseLeave={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) { video.pause(); video.currentTime = 0; }
            }}
          >
            {item.isVideo || item.src.endsWith(".mp4") ? (
              <video src={item.src} loop muted playsInline className="w-full h-full object-cover bg-muted/40" />
            ) : (
              <img src={optimizeCloudinaryUrl(item.src)} alt={item.caption} loading="lazy" className="w-full h-full object-cover bg-muted/40" />
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') scrollByAmount(-1);
      if (e.key === 'ArrowRight') scrollByAmount(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const videos = scrollRef.current.querySelectorAll('video');
    videos.forEach((vid, i) => {
      if (i === currentIndex) {
        vid.play().catch(() => { });
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
                  className="max-w-full max-h-full shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={optimizeCloudinaryUrl(item.src)}
                  className="max-w-full max-h-full object-contain shadow-2xl cursor-default"
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
