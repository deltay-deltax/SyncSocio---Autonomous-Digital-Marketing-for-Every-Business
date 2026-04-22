import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Video,
  Image as ImageIcon,
  Layers,
  Clock,
  Calendar,
  ChevronDown,
  Copy,
  Check,
  Wand2,
  Zap,
  ArrowLeft,
  Upload,
  Send,
  CheckCircle2,
  X,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { cn } from "@/lib/utils";
import { type ContentType } from "@/lib/content-plan";
import { mediaCache } from "@/lib/media-cache";

const API_BASE = 'http://localhost:5050/api';

const TYPE_META: Record<
  ContentType,
  { label: string; icon: React.ElementType; tint: string; accept: string }
> = {
  reel: {
    label: "Reel",
    icon: Video,
    tint: "bg-primary/10 text-primary",
    accept: "video/*",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    tint: "bg-sky-100 text-sky-600",
    accept: "image/*",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    tint: "bg-indigo-100 text-indigo-600",
    accept: "image/*",
  },
};

interface PlanItem {
  id: string;
  day: string;
  date: string;
  iso_date?: string;
  type: ContentType;
  topic: string;
  optimalTime: string;
  prompt: string;
  why?: string;
  selected: boolean;
  files?: File[];
  previewUrls?: string[];
  publishing?: boolean;
  published?: boolean;
}

const ContentPlan: React.FC = () => {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [generating, setGenerating] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<number, { caption: string; hashtags: string; hashtag_strategy: string }>>({});
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const navigate = useNavigate();
  const { profile } = useOutletContext<{ profile: any }>();

  // Fetch real plan from AI agent on mount — restores from sessionStorage if already generated
  useEffect(() => {
    const fetchPlan = async () => {
      setGenerating(true);
      const cached = sessionStorage.getItem('content_plan');

      // Check if user is locked (moved check outside to prevent bypass)
      const now = new Date();
      const last = profile?.lastPlanGeneratedAt ? new Date(profile.lastPlanGeneratedAt) : null;
      const diff = last ? now.getTime() - last.getTime() : Infinity;
      const isLocked = diff < 7 * 24 * 60 * 60 * 1000 && (profile?.generationCount || 0) >= 2;

      // If locked and no cache, redirect back
      if (isLocked && !cached) {
        console.log("Strategic lock active, blocking auto-generation.");
        setGenerating(false);
        navigate("/dashboard/content", { replace: true });
        return;
      }

      // Restore cached plan to avoid re-fetching on nav
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const rawItems = parsed.items || [];

          // restore files from global module cache (since sessionStorage strips them)
          const itemsWithFiles = rawItems.map((item: any) => {
            const cachedMedia = mediaCache.get(item.id);
            if (cachedMedia) {
              return { ...item, files: cachedMedia.files, previewUrls: cachedMedia.previewUrls };
            }
            return item;
          });

          setItems(itemsWithFiles);
          setCaptions(parsed.captions || {});
          setGenerating(false);
          return;
        } catch { }
      }
      try {
        const token = localStorage.getItem('token') || '';
        // Get the stored mix from sessionStorage (written by ContentMix page)
        const storedMix = JSON.parse(sessionStorage.getItem('content_mix') || 'null');
        const res = await fetch(`${API_BASE}/ai/plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ mix: storedMix })
        });
        if (!res.ok) throw new Error('Plan fetch failed');
        const data = await res.json();

        console.log("\n--- Generating content (7-day plan) ---");
        if (data.prompts && data.prompts.length > 0) {
          data.prompts.forEach((p: string, i: number) => {
            console.log(`agent prompt ${i + 1}:`, p);
          });
        }
        console.log("agent res:", data.plan || data);

        const week = (data.plan || []).map((d: any, i: number) => ({
          ...d,
          id: `${d.day}-${i}`,
          selected: false,
        }));
        setItems(week);
        // Persist initial skeleton immediately
        sessionStorage.setItem('content_plan', JSON.stringify({ items: week, captions: {} }));
        // Now fetch captions for all posts
        fetchCaptions(week, token);
      } catch (e) {
        console.error('Failed to load AI plan:', e);
        // Fallback: use current date-based static plan
        const { buildWeek } = await import("@/lib/content-plan");
        const week = buildWeek().map((d, i) => ({ ...d, id: `${d.day}-${i}`, selected: false }));
        setItems(week);
      } finally {
        setGenerating(false);
      }
    };
    fetchPlan();
  }, []);

  const fetchCaptions = async (planItems: PlanItem[], token?: string) => {
    try {
      setCaptionsLoading(true);
      const t = token || localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}/ai/captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({ posts: planItems.map(p => ({ type: p.type, topic: p.topic, prompt: p.prompt })) })
      });
      if (!res.ok) throw new Error('Caption fetch failed');
      const data = await res.json();

      console.log("\n--- Generating Captions ---");
      if (data.prompts && data.prompts.length > 0) {
        data.prompts.forEach((p: string, i: number) => {
          console.log(`agent prompt ${i + 1}:`, p);
        });
      }
      console.log("agent res:", data.captions || data);

      const captionMap: Record<number, any> = {};
      (data.captions || []).forEach((c: any) => { captionMap[c.day_index] = c; });
      setCaptions(captionMap);
      // Persist everything to sessionStorage
      sessionStorage.setItem('content_plan', JSON.stringify({ items: planItems, captions: captionMap }));
    } catch (e) {
      console.error('Failed to load captions:', e);
    } finally {
      setCaptionsLoading(false);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => (it.previewUrls || []).forEach(url => URL.revokeObjectURL(url)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = () => {
    // Clear session so user can generate a fresh mix on the Mix page
    sessionStorage.removeItem('content_plan');
    sessionStorage.removeItem('content_mix');
    mediaCache.clear();
    items.forEach((it) => (it.previewUrls || []).forEach(url => URL.revokeObjectURL(url)));
    navigate("/dashboard/content");
  };

  const handleBack = () => {
    // Clear session so user goes to the "Generate" page, not the redirect
    sessionStorage.removeItem('content_plan');
    sessionStorage.removeItem('content_mix');
    navigate("/dashboard/content");
  };

  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)),
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFile = (id: string, incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));

    setItems((prev) => {
      const newItems = prev.map((it) => {
        if (it.id !== id) return it;

        const isCarousel = it.type === 'carousel';
        const updatedFiles = isCarousel ? [...(it.files || []), ...newFiles] : [newFiles[0]];
        const updatedPreviews = isCarousel ? [...(it.previewUrls || []), ...newPreviews] : [newPreviews[0]];

        return { ...it, files: updatedFiles, previewUrls: updatedPreviews };
      });
      sessionStorage.setItem('content_plan', JSON.stringify({ items: newItems, captions }));

      // Update global cache
      const updatedItem = newItems.find(it => it.id === id);
      if (updatedItem?.files && updatedItem.previewUrls) {
        mediaCache.set(id, updatedItem.files, updatedItem.previewUrls);
      }

      return newItems;
    });
  };

  const removeFile = (id: string) => {
    setItems((prev) => {
      const newItems = prev.map((it) => {
        if (it.id !== id) return it;
        (it.previewUrls || []).forEach(url => URL.revokeObjectURL(url));
        return { ...it, files: undefined, previewUrls: undefined };
      });
      sessionStorage.setItem('content_plan', JSON.stringify({ items: newItems, captions }));
      return newItems;
    });
    mediaCache.remove(id);
  };

  const handlePublish = async (id: string, index: number) => {
    const item = items.find(it => it.id === id);
    if (!item?.files || item.files.length === 0) return;
    setItems(prev => prev.map(it => it.id === id ? { ...it, publishing: true } : it));
    try {
      const token = localStorage.getItem('token') || '';
      const captionData = captions[index];
      const fullCaption = captionData ? `${captionData.caption}\n\n${captionData.hashtags}` : item.prompt;

      const formData = new FormData();
      item.files.forEach(f => formData.append('files', f));
      formData.append('contentType', item.type);
      formData.append('description', fullCaption);

      const res = await fetch(`${API_BASE}/posts/validate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Auto-trigger the publish endpoint
      await axios.post(`${API_BASE}/posts/schedule/${data.analysisId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('🚀 Published successfully to Instagram!');
    } catch (e) {
      console.error('Publish error', e);
      alert('Publishing failed. Check Instagram connection.');
    }
    setTimeout(() => {
      setItems(prev => {
        const target = prev.find(it => it.id === id);
        (target?.previewUrls || []).forEach(url => URL.revokeObjectURL(url));
        return prev.filter(it => it.id !== id);
      });
      setOpenId(cur => cur === id ? null : cur);
    }, 900);
  };

  const convertTimeTo24h = (time: string): string => {
    try {
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes ?? 0).padStart(2, '0')}`;
    } catch { return '20:00'; }
  };

  const allDone = !generating && items.length === 0;

  return (
    <div className="min-h-[80vh] animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div /> {/* Spacer for flex-between */}
          <Button
            onClick={regenerate}
            disabled={generating || (profile?.lastPlanGeneratedAt && (new Date().getTime() - new Date(profile.lastPlanGeneratedAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && profile?.generationCount >= 2)}
            variant="outline"
            className={cn(
              "h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-border gap-2",
              (profile?.lastPlanGeneratedAt && (new Date().getTime() - new Date(profile.lastPlanGeneratedAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && profile?.generationCount >= 2)
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-white hover:bg-muted"
            )}
          >
            <Wand2 size={13} />
            {(profile?.lastPlanGeneratedAt && (new Date().getTime() - new Date(profile.lastPlanGeneratedAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && profile?.generationCount >= 2)
              ? "Locked (7 Days)"
              : "Regenerate"}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-left mb-4"
        >
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap size={14} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Production Pipeline</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight font-display">
            Your <span className="text-primary italic">7-Day</span> Plan
          </h1>
          <p className="mt-3 text-muted-foreground text-sm font-medium">
            Select a card, upload your media, and publish — one tap at a time.
          </p>
        </motion.div>

        {/* States */}
        <AnimatePresence mode="wait">
          {generating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24 rounded-[3rem] border-2 border-dashed border-border bg-white/40"
            >
              <div className="w-12 h-12 mx-auto border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Composing your week...
              </p>
            </motion.div>
          )}

          {allDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 rounded-[3rem] bg-white border border-border shadow-elegant"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <PartyPopper className="text-primary" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-foreground leading-tight">
                Week shipped.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto font-medium">
                Every post in your plan is live. Generate a fresh mix to keep the
                momentum rolling.
              </p>
              <Button
                onClick={regenerate}
                className="mt-8 h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 border-0 gap-2"
              >
                <Wand2 size={14} /> Generate Next Week
              </Button>
            </motion.div>
          )}

          {!generating && items.length > 0 && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  const isOpen = openId === item.id;
                  const isVideo = item.files?.[0]?.type.startsWith("video/");
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, x: 40 }}
                      transition={{ layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                      className={cn(
                        "rounded-[2rem] border overflow-hidden transition-all duration-300",
                        item.selected
                          ? "bg-primary/[0.03] border-primary/30 shadow-elegant ring-1 ring-primary/20"
                          : isOpen
                            ? "bg-white border-border shadow-elegant"
                            : "bg-white border-border/60 hover:border-border shadow-soft",
                      )}
                    >
                      {/* Row */}
                      <div className="flex items-center gap-3 md:gap-5 px-4 md:px-7 py-5">
                        {/* Tick checkbox */}
                        <button
                          onClick={() => toggleSelect(item.id)}
                          aria-label={item.selected ? "Deselect" : "Select"}
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all border-2",
                            item.selected
                              ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                              : "bg-card border-slate-100 text-transparent hover:border-primary/40 hover:text-primary/40",
                          )}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>

                        {/* Day */}
                        <div className="flex flex-col items-center justify-center w-12 shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {item.day}
                          </span>
                          <span className="text-xl font-bold text-foreground leading-none mt-1">
                            {item.date.split(" ")[1]}
                          </span>
                        </div>

                        <span className="hidden md:block w-px h-10 bg-border/40" />

                        {/* Type pill */}
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl shrink-0",
                            meta.tint,
                          )}
                        >
                          <Icon size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {meta.label}
                          </span>
                        </div>

                        {/* Topic */}
                        <button
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          className="flex-1 min-w-0 text-left group"
                        >
                          <p className="text-sm md:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                            {item.topic}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-muted-foreground font-bold">
                            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <Clock size={11} className="text-primary" /> {item.optimalTime}
                            </span>
                            <span className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <Calendar size={11} className="text-primary" /> {item.date}
                            </span>
                            {item.files && item.files.length > 0 && (
                              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                                <CheckCircle2 size={11} /> {item.files.length} {item.files.length > 1 ? 'files' : 'file'} ready
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Chevron */}
                        <button
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          aria-label="Toggle"
                          className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground shrink-0 transition-colors"
                        >
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex"
                          >
                            <ChevronDown size={18} />
                          </motion.span>
                        </button>
                      </div>

                      {/* Selected actions strip */}
                      <AnimatePresence initial={false}>
                        {item.selected && (
                          <motion.div
                            key="actions"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 md:px-7 pb-6 pt-1">
                              <div className="rounded-2xl bg-slate-50 border border-primary/15 p-5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                                <input
                                  ref={(el) => {
                                    fileInputs.current[item.id] = el;
                                  }}
                                  type="file"
                                  accept={meta.accept}
                                  className="hidden"
                                  multiple={item.type === 'carousel'}
                                  onChange={(e) => {
                                    handleFile(item.id, e.target.files);
                                  }}
                                />
                                {item.previewUrls && item.previewUrls.length > 0 ? (
                                  <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                                    <div className="flex gap-2">
                                      {item.previewUrls.map((url, idx) => (
                                        <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-border/80 shrink-0 relative shadow-sm">
                                          {item.files?.[idx]?.type.startsWith("video/") ? (
                                            <video src={url} className="w-full h-full object-cover" muted />
                                          ) : (
                                            <img src={url} alt="preview" className="w-full h-full object-cover" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-black text-foreground truncate uppercase tracking-tight">
                                        {item.files?.length} assets uploaded
                                      </p>
                                      <button
                                        onClick={() => removeFile(item.id)}
                                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5 mt-1"
                                      >
                                        <X size={10} strokeWidth={3} /> Remove Media
                                      </button>
                                    </div>
                                    <Button
                                      variant="outline"
                                      onClick={() => fileInputs.current[item.id]?.click()}
                                      className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-border bg-white hover:bg-muted gap-2"
                                    >
                                      <Upload size={12} /> Replace
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={() => fileInputs.current[item.id]?.click()}
                                    className="h-14 flex-1 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 border-dashed border-primary/20 bg-primary/[0.02] text-primary hover:bg-primary/5 gap-2.5 transition-all"
                                  >
                                    <Upload size={14} />
                                    Upload {meta.label} Content
                                  </Button>
                                )}

                                {/* Publish */}
                                { /* ... */}
                                <Button
                                  onClick={() => handlePublish(item.id, items.indexOf(item))}
                                  disabled={!item.files || item.files.length === 0 || item.publishing}
                                  className="h-14 sm:w-auto rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] px-6 shadow-xl shadow-primary/20 border-0 gap-2.5 disabled:opacity-40"
                                >
                                  {item.publishing ? (
                                    <>
                                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                      Publishing
                                    </>
                                  ) : (
                                    <>
                                      <Send size={14} /> Publish Now
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Prompt accordion */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="prompt"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 md:px-7 pb-8 pt-1">
                              <div className="rounded-3xl bg-slate-50 border-2 border-slate-100 p-6 relative">
                                <div className="flex items-start justify-between gap-4 mb-5">
                                  <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-primary fill-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                                      Strategist Generation Prompt
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(item.prompt, item.id)}
                                    className="h-9 px-4 rounded-xl bg-white hover:bg-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm border border-border"
                                  >
                                    {copiedId === item.id ? (
                                      <>
                                        <Check size={14} className="text-emerald-500" strokeWidth={3} /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={14} /> Copy Script
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm md:text-base leading-relaxed text-foreground font-medium italic">
                                  "{item.prompt}"
                                </p>

                                <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3">
                                  <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px] py-2 px-3 rounded-xl">
                                    {meta.label} Type
                                  </Badge>
                                  <Badge className="bg-white text-muted-foreground border border-border/60 font-black uppercase tracking-widest text-[9px] py-1.5 px-3 rounded-xl">
                                    <Clock size={11} className="mr-1.5 text-primary" /> {item.optimalTime}
                                  </Badge>
                                  <Badge className="bg-white text-muted-foreground border border-border/60 font-black uppercase tracking-widest text-[9px] py-1.5 px-3 rounded-xl">
                                    <Calendar size={11} className="mr-1.5 text-primary" /> {item.day}, {item.date}
                                  </Badge>
                                </div>
                              </div>

                              {/* AI Caption + Hashtag Section */}
                              {captionsLoading && !captions[items.indexOf(item)] && (
                                <div className="mt-3 rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-3">
                                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI writing caption &amp; hashtags…</span>
                                </div>
                              )}
                              {captions[items.indexOf(item)] && (() => {
                                const cap = captions[items.indexOf(item)];
                                const capKey = `cap-${item.id}`;
                                const hashKey = `hash-${item.id}`;
                                return (
                                  <div className="space-y-3 mt-4">
                                    <div className="rounded-3xl bg-white border-2 border-slate-100 p-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <Wand2 size={13} className="text-primary" />
                                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">AI Caption</span>
                                        </div>
                                        <Button variant="ghost" size="sm"
                                          onClick={() => { navigator.clipboard.writeText(cap.caption); setCopiedCaptionId(capKey); setTimeout(() => setCopiedCaptionId(null), 2000); }}
                                          className="h-8 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest gap-2 border border-border"
                                        >
                                          {copiedCaptionId === capKey ? <><Check size={12} className="text-emerald-500" strokeWidth={3} /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </Button>
                                      </div>
                                      <p className="text-sm leading-relaxed text-foreground font-medium">{cap.caption}</p>
                                    </div>
                                    <div className="rounded-3xl bg-indigo-50/60 border-2 border-indigo-100 p-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <Zap size={13} className="text-indigo-500 fill-indigo-500" />
                                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Strategic Hashtags</span>
                                        </div>
                                        <Button variant="ghost" size="sm"
                                          onClick={() => { navigator.clipboard.writeText(cap.hashtags); setCopiedCaptionId(hashKey); setTimeout(() => setCopiedCaptionId(null), 2000); }}
                                          className="h-8 px-3 rounded-xl bg-white hover:bg-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm border border-border"
                                        >
                                          {copiedCaptionId === hashKey ? <><Check size={12} className="text-emerald-500" strokeWidth={3} /> Copied</> : <><Copy size={12} /> Copy All</>}
                                        </Button>
                                      </div>
                                      <p className="text-sm text-indigo-700 font-medium leading-relaxed break-all">{cap.hashtags}</p>
                                      {cap.hashtag_strategy && (
                                        <p className="mt-3 text-[11px] text-muted-foreground font-medium italic border-t border-indigo-100 pt-3">📈 {cap.hashtag_strategy}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContentPlan;
