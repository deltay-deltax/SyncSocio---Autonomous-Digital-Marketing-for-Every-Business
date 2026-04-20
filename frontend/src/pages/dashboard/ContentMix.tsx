import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Layers,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WEEK_PLAN, type ContentType } from "@/lib/content-plan";

const TYPE_META: Record<
  ContentType,
  { label: string; icon: React.ElementType; tint: string; ring: string }
> = {
  reel: {
    label: "Reel",
    icon: Video,
    tint: "bg-primary/10 text-primary",
    ring: "ring-primary/20",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    tint: "bg-sky-100 text-sky-600",
    ring: "ring-sky-200",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    tint: "bg-indigo-100 text-indigo-600",
    ring: "ring-indigo-200",
  },
};

const ContentMix: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-soft mb-7 border border-border">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Weekly Strategy
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground px-2">
            Content <span className="text-primary">Mix</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-muted-foreground text-sm md:text-base leading-relaxed">
            Plan a perfectly balanced 7-day content week — 3 reels, 2 images, and
            2 carousels — with optimal posting times and ready-to-use prompts.
            Generate, select, upload your media, and publish in one elegant flow.
          </p>

          <Link to="/dashboard/content/plan">
            <Button
              className="mt-9 h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover-lift border-0 group"
            >
              <Wand2 size={16} className="mr-2" />
              Generate Content Mix
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>

          <div className="mt-12 flex items-center justify-center flex-wrap gap-4">
            {(["reel", "image", "carousel"] as ContentType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const count = WEEK_PLAN.filter((p) => p === t).length;
              return (
                <div
                  key={t}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-border shadow-sm ring-1",
                    meta.ring,
                  )}
                >
                  <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center", meta.tint)}>
                    <Icon size={14} />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {count} {meta.label}
                    {count > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContentMix;
