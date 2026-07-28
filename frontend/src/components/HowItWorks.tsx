import { Link, Eye, CheckSquare, CalendarClock, ArrowRight } from "lucide-react";
import { AnimatedList } from "@/registry/magicui/animated-list";
import { BentoCard, BentoGrid } from "@/registry/magicui/bento-grid";
import { Marquee } from "@/registry/magicui/marquee";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DEFAULT_IMAGES } from "@/components/ui/DomeGallery";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const TypingUrl = ({ startTyping, onComplete }: { startTyping: boolean, onComplete?: () => void }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!startTyping) {
      setText("");
      return;
    }
    const fullText = "https://your-brand.com";
    let i = 0;
    let timeout: NodeJS.Timeout;

    const type = () => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
        timeout = setTimeout(type, Math.random() * 40 + 30);
      } else {
        if (onComplete) onComplete();
      }
    };

    timeout = setTimeout(type, 100);
    return () => clearTimeout(timeout);
  }, [startTyping]);

  return (
    <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
      {text}
      <span className="animate-pulse font-bold ml-[1px]">|</span>
    </span>
  );
};

const UrlBackground = ({ phase }: { phase: number }) => (
  <div className="absolute top-10 right-10 w-[260px] p-4 rounded-xl border border-border/60 bg-background/90 shadow-lg transform-gpu transition-all duration-300 opacity-85 pointer-events-none overflow-hidden">
    <div className={cn("relative z-10 flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30 backdrop-blur-sm transition-colors", phase === 2 && "border-primary/50 bg-primary/5")}>
      <Link size={14} className="text-muted-foreground" />
      <TypingUrl startTyping={phase >= 3} />
      <div className={cn("ml-auto w-5 h-5 rounded-md flex items-center justify-center transition-colors", phase >= 5 && phase < 7 ? "bg-primary text-primary-foreground scale-95" : "bg-primary/20 text-primary")}>
        <ArrowRight size={12} className="currentColor" />
      </div>
    </div>
    <div className="relative z-10 mt-4 flex flex-col gap-2">
      <div className="w-full h-2 rounded-full bg-muted/50" />
      <div className="w-4/5 h-2 rounded-full bg-muted/50" />
      <div className="w-3/5 h-2 rounded-full bg-muted/50" />
    </div>
  </div>
);

const notifications = [
  { name: "Brand Core defined", description: "SyncSocio Setup", time: "Just now", icon: "🚀", color: "#1E86FF" },
  { name: "Vision mapped", description: "SyncSocio Setup", time: "Just now", icon: "🎯", color: "#00C9A7" },
  { name: "Local Presence set", description: "SyncSocio Setup", time: "Just now", icon: "🌍", color: "#FFB800" },
  { name: "The Edge identified", description: "SyncSocio Setup", time: "1m ago", icon: "🏆", color: "#FF3D71" },
  { name: "Audience DNA built", description: "SyncSocio Setup", time: "1m ago", icon: "👥", color: "#8B5CF6" },
  { name: "Psychology mapped", description: "SyncSocio Setup", time: "1m ago", icon: "🧭", color: "#00C9A7" },
  { name: "Personality crafted", description: "SyncSocio Setup", time: "2m ago", icon: "⭐", color: "#1E86FF" },
  { name: "Visual Vibe set", description: "SyncSocio Setup", time: "2m ago", icon: "🎨", color: "#FFB800" },
  { name: "Format Strategy picked", description: "SyncSocio Setup", time: "3m ago", icon: "🔁", color: "#00C9A7" },
  { name: "Content Logistics synced", description: "SyncSocio Setup", time: "3m ago", icon: "📊", color: "#FF3D71" },
  { name: "Products cataloged", description: "SyncSocio Setup", time: "3m ago", icon: "📦", color: "#8B5CF6" },
];

const NotificationItem = ({ name, description, icon, color, time }: any) => {
  return (
    <figure className={cn(
      "notification-card relative mx-auto min-h-fit w-full max-w-[400px] overflow-hidden rounded-xl p-3 shadow-sm",
      "transition-all duration-200 ease-in-out",
      "bg-background/90 border border-border/60"
    )}>
      <div className="flex flex-row items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: color }}>
          <span className="text-sm">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-sm font-medium whitespace-pre">
            <span className="text-xs sm:text-sm">{name}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </figcaption>
          <p className="text-[10px] font-normal text-muted-foreground">{description}</p>
        </div>
      </div>
    </figure>
  );
};

const ReviewBackground = ({ phase }: { phase: number }) => (
  <div className="absolute top-6 right-6 h-[220px] w-[260px] flex flex-col overflow-hidden pointer-events-none">
    <div className={cn(
      "relative flex h-full w-full flex-col overflow-hidden p-1",
      phase === 7 && "[&>div>div:nth-child(1)_.notification-card]:scale-[1.03] [&>div>div:nth-child(1)_.notification-card]:border-primary/50 [&>div>div:nth-child(1)_.notification-card]:shadow-md",
      (phase === 9 || phase === 11) && "[&>div>div:nth-child(2)_.notification-card]:scale-[1.03] [&>div>div:nth-child(2)_.notification-card]:border-primary/50 [&>div>div:nth-child(2)_.notification-card]:shadow-md"
    )}>
      <AnimatedList delay={1500}>
        {notifications.map((item, idx) => (
          <NotificationItem {...item} key={idx} />
        ))}
      </AnimatedList>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background"></div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-background"></div>
    </div>
  </div>
);

const formatNames = ["Instagram Reel", "Carousel Post", "Story Poll", "Static Image", "Video Ad"];

const CampaignBackground = ({ phase }: { phase: number }) => {
  const formats = useMemo(() => {
    const shuffled = [...DEFAULT_IMAGES].sort(() => 0.5 - Math.random());
    return formatNames.map((name, idx) => ({
      name,
      img: shuffled[idx]?.src || ""
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] opacity-85 transition-opacity duration-300 pointer-events-none">
      <Marquee pauseOnHover={false} className="absolute top-10 [--duration:25s]" repeat={4}>
        {formats.map((format, idx) => (
          <div
            key={idx}
            className={cn(
              "relative w-32 h-40 overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-md flex flex-col items-center justify-end p-3 gap-2 transition-transform duration-300",
              phase >= 13 && idx === 1 ? "scale-110 border-primary shadow-xl z-10" : "scale-100"
            )}
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${format.img})` }} />
            <div className={cn("absolute inset-0 transition-opacity", phase >= 13 && idx === 1 ? "bg-primary/20 mix-blend-overlay" : "bg-gradient-to-t from-background/90 via-background/20 to-transparent")} />
            <span className="text-[10px] font-semibold text-foreground relative z-10 text-center">{format.name}</span>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

const ScheduleBackground = ({ phase }: { phase: number }) => (
  <div className="absolute top-10 right-4 w-[200px] rounded-xl border border-border/60 bg-background/90 shadow-lg p-4 transform-gpu transition-all duration-300 opacity-85 pointer-events-none">
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
            "aspect-square rounded-[3px] text-[8px] flex items-center justify-center font-medium transition-all duration-300",
            i === 12 && phase >= 15 ? "bg-primary text-primary-foreground shadow-sm scale-110" :
              i === 12 ? "bg-primary/20 text-primary" :
                i === 15 || i === 18 ? "bg-primary/20 text-primary" : "text-muted-foreground/50 bg-muted/20"
          )}
        >
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);

const AnimatedCursor = ({ phase }: { phase: number }) => {
  const cursorVariants = {
    p0: { left: "15%", top: "70%", opacity: 0, scale: 1 },
    p1: { left: "15%", top: "8%", opacity: 1, scale: 1 }, // URL Bar
    p2: { left: "15%", top: "8%", opacity: 1, scale: 0.85 }, // Click URL
    p3: { left: "15%", top: "8%", opacity: 1, scale: 1 }, // Type
    p4: { left: "27%", top: "8%", opacity: 1, scale: 1 }, // Move Next
    p5: { left: "27%", top: "8%", opacity: 1, scale: 0.85 }, // Click Next
    p6: { left: "84%", top: "9%", opacity: 1, scale: 1 }, // Move to Item 1
    p7: { left: "84%", top: "9%", opacity: 1, scale: 0.85 }, // Click Item 1
    p8: { left: "84%", top: "17%", opacity: 1, scale: 1 }, // Move to Item 2
    p9: { left: "84%", top: "17%", opacity: 1, scale: 0.85 }, // Click Item 2
    p10: { left: "84%", top: "17%", opacity: 1, scale: 1 }, // Rest on Item 2
    p11: { left: "84%", top: "17%", opacity: 1, scale: 0.85 }, // Click Item 2 again
    p12: { left: "33%", top: "75%", opacity: 1, scale: 1 }, // Campaign
    p13: { left: "33%", top: "75%", opacity: 1, scale: 0.85 }, // Click Campaign
    p14: { left: "88%", top: "67%", opacity: 1, scale: 1 }, // Calendar 13
    p15: { left: "88%", top: "67%", opacity: 1, scale: 0.85 }, // Click Calendar
    p16: { left: "88%", top: "67%", opacity: 1, scale: 1 }, // Release
    p17: { left: "50%", top: "100%", opacity: 0, scale: 1 }, // End
  };

  return (
    <motion.div
      className="hidden lg:block absolute z-50 pointer-events-none"
      variants={cursorVariants}
      animate={`p${phase}`}
      initial="p0"
      transition={{ type: "spring", stiffness: 150, damping: 25, mass: 0.5 }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
        style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.4))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L5.5 3.21Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    </motion.div>
  );
};

const HowItWorks = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const runSequence = async () => {
      while (isMounted) {
        setPhase(0); await sleep(1000); // Start hidden
        setPhase(1); await sleep(1000); // Move to URL
        setPhase(2); await sleep(200);  // Click URL
        setPhase(3); await sleep(1500); // Type URL
        setPhase(4); await sleep(600);  // Move to Next
        setPhase(5); await sleep(200);  // Click Next

        setPhase(6); await sleep(800);  // Move Voice
        setPhase(7); await sleep(200);  // Click Voice

        setPhase(8); await sleep(600);  // Move Colors
        setPhase(9); await sleep(200);  // Click Colors

        setPhase(10); await sleep(600); // Move Keywords
        setPhase(11); await sleep(200); // Click Keywords

        setPhase(12); await sleep(1000); // Move Campaign
        setPhase(13); await sleep(200); // Click Campaign

        setPhase(14); await sleep(1000); // Move Calendar
        setPhase(15); await sleep(200); // Click Calendar

        setPhase(16); await sleep(500); // Release Calendar
        setPhase(17); await sleep(1500); // End/Hide
      }
    };
    runSequence();
    return () => { isMounted = false; };
  }, []);

  const features = [
    {
      Icon: Link,
      name: "Step 01: Drop your URL",
      description: "Connect your store, product, or portfolio link in one click.",
      className: "col-span-3 lg:col-span-1",
      background: <UrlBackground phase={phase} />,
    },
    {
      Icon: Eye,
      name: "Step 02: Review it",
      description: "AI extracts your brand DNA. Review the synthesized assets and voice.",
      className: "col-span-3 lg:col-span-2",
      background: <ReviewBackground phase={phase} />,
    },
    {
      Icon: CheckSquare,
      name: "Step 03: Choose your campaign",
      description: "Select from dozens of formats: Reels, Carousels, Stories, and more.",
      className: "col-span-3 lg:col-span-2",
      background: <CampaignBackground phase={phase} />,
    },
    {
      Icon: CalendarClock,
      name: "Step 04: Schedule your post",
      description: "Pick a date and let our engine handle auto-publishing on time.",
      className: "col-span-3 lg:col-span-1",
      background: <ScheduleBackground phase={phase} />,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 lg:py-32 relative bg-primary/[0.02] border-y border-border/40">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-widest mb-4 block">
            The 1-2-3-4
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Four steps. <span className="gradient-text">Zero friction.</span>
          </h2>
        </div>

        <div className="max-w-5xl mx-auto relative">
          <AnimatedCursor phase={phase} />
          <BentoGrid>
            {features.map((feature, idx) => (
              <BentoCard href={""} cta={""} key={idx} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
