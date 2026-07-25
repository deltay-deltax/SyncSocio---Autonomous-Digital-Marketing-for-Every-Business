import { Link, Eye, CheckSquare, CalendarClock, ArrowRight, Image } from "lucide-react";
import { BentoCard, BentoGrid } from "@/registry/magicui/bento-grid";
import { Marquee } from "@/registry/magicui/marquee";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TypingUrl = () => {
  const [text, setText] = useState("");
  
  useEffect(() => {
    const fullText = "https://your-brand.com";
    let i = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;
    
    const type = () => {
      if (!isDeleting && i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
        timeout = setTimeout(type, 80);
      } else if (isDeleting && i >= 0) {
        setText(fullText.slice(0, i));
        i--;
        timeout = setTimeout(type, 40);
      } else if (i > fullText.length) {
        isDeleting = true;
        timeout = setTimeout(type, 3000); // pause at end
      } else if (i < 0) {
        isDeleting = false;
        i = 0;
        timeout = setTimeout(type, 500); // pause at start
      }
    };
    
    timeout = setTimeout(type, 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
      {text}
      <span className="animate-pulse font-bold ml-[1px]">|</span>
    </span>
  );
};

const UrlBackground = () => (
  <div className="absolute top-10 right-10 w-[260px] p-4 rounded-xl border border-border/50 bg-background/50 shadow-sm transform-gpu transition-all duration-300 group-hover:scale-105 opacity-60 group-hover:opacity-100 pointer-events-none overflow-hidden">
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
      className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-primary/20 to-transparent z-0"
    />
    <div className="relative z-10 flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30 backdrop-blur-sm">
      <Link size={14} className="text-muted-foreground" />
      <TypingUrl />
      <div className="ml-auto w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
        <ArrowRight size={12} className="text-primary" />
      </div>
    </div>
    <div className="relative z-10 mt-4 flex flex-col gap-2">
      <div className="w-full h-2 rounded-full bg-muted/50" />
      <div className="w-4/5 h-2 rounded-full bg-muted/50" />
      <div className="w-3/5 h-2 rounded-full bg-muted/50" />
    </div>
  </div>
);

const ReviewBackground = () => (
  <div className="absolute top-8 right-8 flex flex-col gap-3 transform-gpu pointer-events-none">
    {[
      { label: "Voice", value: "Authoritative", color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Colors", value: "#000, #FFF", color: "text-neutral-500", bg: "bg-neutral-500/10" },
      { label: "Keywords", value: "Tech, AI", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ].map((item, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0.4, x: i * -15 }}
        animate={{ opacity: [0.4, 1, 0.4], x: i * -15, scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3, delay: i * 1 }}
        className="flex items-center justify-between w-[220px] p-3 rounded-lg border border-border/50 bg-background/50 shadow-sm ml-auto"
      >
        <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
        <span className={cn("text-[10px] px-2 py-1 rounded-md font-medium", item.bg, item.color)}>{item.value}</span>
      </motion.div>
    ))}
  </div>
);

import { DEFAULT_IMAGES } from "@/components/ui/DomeGallery";

const formatNames = ["Instagram Reel", "Carousel Post", "Story Poll", "Static Image", "Video Ad"];

const CampaignBackground = () => {
  const formats = useMemo(() => {
    // Clone and shuffle DEFAULT_IMAGES
    const shuffled = [...DEFAULT_IMAGES].sort(() => 0.5 - Math.random());
    return formatNames.map((name, idx) => {
      // get optimized cloudinary url
      const rawUrl = shuffled[idx]?.src || "";
      const optimizedUrl = rawUrl.includes('/upload/') && !rawUrl.includes('/upload/q_auto')
        ? rawUrl.replace('/upload/', '/upload/q_auto,f_auto,w_400/')
        : rawUrl;
        
      return {
        name,
        img: optimizedUrl
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] opacity-40 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none">
      <Marquee pauseOnHover className="absolute top-10 [--duration:25s]" repeat={4}>
        {formats.map((format, idx) => (
          <div
            key={idx}
            className="relative w-32 h-40 overflow-hidden rounded-xl border border-border/50 bg-background/40 shadow-sm flex flex-col items-center justify-end p-3 gap-2"
          >
            <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay" style={{ backgroundImage: `url(${format.img})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <span className="text-[10px] font-semibold text-foreground relative z-10 text-center">{format.name}</span>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

const ScheduleBackground = () => (
  <div className="absolute top-10 right-4 w-[200px] rounded-xl border border-border/50 bg-background/50 shadow-sm p-4 transform-gpu transition-all duration-300 group-hover:scale-105 opacity-60 group-hover:opacity-100 pointer-events-none">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-bold text-foreground/80">October 2026</span>
      <div className="flex gap-1">
         <div className="w-4 h-4 rounded-sm bg-muted/50" />
         <div className="w-4 h-4 rounded-sm bg-muted/50" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "aspect-square rounded-[3px] text-[8px] flex items-center justify-center font-medium",
            i === 12 ? "bg-primary text-primary-foreground shadow-sm" : i === 15 || i === 18 ? "bg-primary/20 text-primary" : "text-muted-foreground/50 bg-muted/20"
          )}
        >
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);

const features = [
  {
    Icon: Link,
    name: "Step 01: Drop your URL",
    description: "Connect your store, product, or portfolio link in one click.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: <UrlBackground />,
  },
  {
    Icon: Eye,
    name: "Step 02: Review it",
    description: "AI extracts your brand DNA. Review the synthesized assets and voice.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: <ReviewBackground />,
  },
  {
    Icon: CheckSquare,
    name: "Step 03: Choose your campaign",
    description: "Select from dozens of formats: Reels, Carousels, Stories, and more.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: <CampaignBackground />,
  },
  {
    Icon: CalendarClock,
    name: "Step 04: Schedule your post",
    description: "Pick a date and let our engine handle auto-publishing on time.",
    className: "col-span-3 lg:col-span-1",
    href: "#",
    cta: "Learn more",
    background: <ScheduleBackground />,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-widest mb-4 block">
            The 1-2-3-4
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Four steps. <span className="gradient-text">Zero friction.</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          <BentoGrid>
            {features.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
