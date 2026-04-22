import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Layers,
  Wand2,
  Clock,
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
  const [mixData, setMixData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();
  const { profile } = useOutletContext<{ profile: any }>();

  const lastGen = profile?.lastPlanGeneratedAt ? new Date(profile.lastPlanGeneratedAt) : null;
  const now = new Date();
  const diff = lastGen ? now.getTime() - lastGen.getTime() : Infinity;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  // Hard lock only if both tries used within 7 days
  const isHardLocked = diff < sevenDays && (profile?.generationCount || 0) >= 2;
  const daysLeft = isHardLocked ? Math.ceil((sevenDays - diff) / (24 * 60 * 60 * 1000)) : 0;
  const triesLeft = (profile?.generationCount || 0) >= 2 ? 0 : 2 - (profile?.generationCount || 0);

  // fulfill user requirement: if plan exists, skip this generate page and go to plan
  React.useEffect(() => {
    const cachedPlan = sessionStorage.getItem('content_plan');
    if (cachedPlan) {
      console.log("Existing plan found, redirecting to plan page...");
      navigate("/dashboard/content/plan", { replace: true });
    }
  }, [navigate]);

  const handleGenerate = async () => {
    if (isHardLocked) return;
    setLoading(true);
    setIsLocked(false);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5050/api/ai/mix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || "Failed to fetch mix";
        if (msg.includes("PLAN_LOCKED")) {
          setIsLocked(true);
          throw new Error(msg);
        }
        throw new Error(msg);
      }
      const data = await res.json();
      
      console.log("\n--- Generating Mix ---");
      // ... logging
      // Persist mix for the plan agent to consume
      const mixToStore = data.mix || data;
      sessionStorage.setItem('content_mix', JSON.stringify(mixToStore));
      sessionStorage.removeItem('content_plan'); // CRITICAL: Clear old plan so fresh one is generated
      setMixData(mixToStore);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center pt-4 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto px-6 py-4 md:py-8">
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
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground px-2 font-display">
            Content <span className="text-primary italic">Mix</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
            Plan a perfectly balanced 7-day content week with optimal posting times and ready-to-use prompts.
            Generate, select, upload your media, and publish in one elegant flow.
          </p>

          {!mixData ? (
            <div className="flex flex-col items-center">
              <Button
                onClick={handleGenerate}
                disabled={loading || isHardLocked}
                className={cn(
                  "mt-9 h-14 px-8 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] border-0 group transition-all font-body shadow-xl shadow-primary/20",
                  isHardLocked 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                    : "bg-primary hover:bg-primary/90 hover-lift"
                )}
              >
                <Wand2 size={16} className={cn("mr-2", loading && "animate-pulse")} />
                {loading ? "Analyzing Engagement..." : isHardLocked ? `Locked (${hardLockDays} Days)` : "Generate Content Mix"}
              </Button>
              {!isHardLocked && !loading && diff < sevenDays && (
                <p className="mt-4 text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                  ⚠️ Final Regeneration: 1 Use Left
                </p>
              )}
            </div>
          ) : (
            <Link to="/dashboard/content/plan">
              <Button
                className="mt-9 h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover-lift border-0 group"
              >
                Continue
              </Button>
            </Link>
          )}

          {mixData && (
            <div className="mt-12 flex items-center justify-center flex-wrap gap-4 animate-in fade-in zoom-in duration-500">
              {(["reel", "image", "carousel"] as ContentType[]).map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                const count = mixData[t] || mixData[t + 's'] || 0; // handle 'reel' vs 'reels'
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
                      {count !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ContentMix;
