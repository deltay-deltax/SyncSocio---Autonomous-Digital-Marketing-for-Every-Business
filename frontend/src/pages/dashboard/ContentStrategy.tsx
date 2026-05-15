import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import {
  Calendar, Sparkles, Zap, Clock, Trash2, CheckCircle2,
  Video, Layers, Image as ImageIcon, ArrowRight,
  TrendingUp, Settings2, RotateCcw, Send, Edit3,
  ChevronLeft, ChevronRight, X, Copy, Check, Heart, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOutletContext } from 'react-router-dom';
import { cn, fileToBase64 } from '@/lib/utils';

interface ScheduledPost {
  id: string;
  type: 'Reel' | 'Static' | 'Carousel';
  title: string;
  scheduledAt: string; // ISO string
  isEditing?: boolean;
  visualPrompt?: string;
  carouselSlides?: number;
  contentHook?: string;
  generatedVisuals?: string[];
  isGeneratingVisual?: boolean;
  currentSlide?: number;
  gScore?: number;
  verdict?: string;
  slidesMetadata?: Array<{
    visual_prompt: string;
    headline: string;
    subtext: string;
    position: string;
  }>;
}

const getInitialDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(20, 0, 0, 0); // Default to 8PM
  return d.toISOString();
};

const MOCK_PLAN = {
  summary: "Based on your 'Professional' brand tone and top performance in Reels, we recommend a 5:2 high-engagement ratio for this week.",
  reels: 4,
  static: 1,
  carousel: 2,
  generatedPosts: [
    { id: '1', type: 'Reel', title: 'Why [Niche] is changing in 2024', scheduledAt: getInitialDate(1) },
    { id: '2', type: 'Carousel', title: '5 Tools to master [Service]', scheduledAt: getInitialDate(2) },
    { id: '3', type: 'Reel', title: 'Day in the life: [Brand Name] Edition', scheduledAt: getInitialDate(3) },
    { id: '4', type: 'Static', title: 'Big Announcement: Stay Tuned', scheduledAt: getInitialDate(4) },
    { id: '5', type: 'Reel', title: 'Common mistakes in [Niche]', scheduledAt: getInitialDate(5) },
    { id: '6', type: 'Carousel', title: 'Client Spotlight: Success Story', scheduledAt: getInitialDate(6) },
    { id: '7', type: 'Reel', title: 'Weekend Vibes & Strategy Refill', scheduledAt: getInitialDate(7) },
  ] as ScheduledPost[]
};

const ContentStrategy = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  
  // Lockout logic
  const isLocked = profile?.generationLockoutUntil && new Date(profile.generationLockoutUntil) > new Date();
  
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAnalyzingMix, setIsAnalyzingMix] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [strategicMix, setStrategicMix] = useState<{
    reels: number;
    static: number;
    carousel: number;
    reasoning: string;
  } | null>(null);

  const [generationSource, setGenerationSource] = useState<'ai' | 'mock' | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [lightboxPost, setLightboxPost] = useState<ScheduledPost | null>(null);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Product Brief State
  const [brief, setBrief] = useState({
    productName: '',
    description: '',
    image: null as File | null,
    imagePreview: null as string | null,
    customInstruction: '' // New: User's custom post instruction
  });

  const [durationWeeks, setDurationWeeks] = useState(1);
  const [heartedPostIds, setHeartedPostIds] = useState<string[]>([]);
  const [rejectedPosts, setRejectedPosts] = useState<{ id: string; prompt: string }[]>([]);
  const [hasRegenerated, setHasRegenerated] = useState(false);
  
  const postsPerWeek = profile?.selectedPlan?.includes('Starter') ? 3 : 7;
  const totalPosts = postsPerWeek * durationWeeks;
  const maxRejects = profile?.selectedPlan?.includes('Starter') ? 1 : 3;

  useEffect(() => {
    const fetchCachedStrategy = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const res = await fetch(`${BASE_URL}/ai/calendar`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Check if active (not deployed) and within 7 days
          if (data && data.status === 'active' && data.posts && data.posts.length > 0) {
            const createdDate = new Date(data.createdAt);
            const now = new Date();
            const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
            
            if (daysDiff <= 7) {
              const cachedPosts = data.posts.map((post: any, idx: number) => ({
                id: post.id || (idx + 1).toString(),
                type: post.type || (post.format === 'video' || post.format === 'reel' ? 'Reel' : post.format === 'carousel' ? 'Carousel' : 'Static'),
                title: post.title || post.topic,
                scheduledAt: post.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
                visualPrompt: post.visualPrompt || post.visual_prompt,
                detailedDescription: post.detailedDescription || post.detailed_visual_description,
                contentHook: post.contentHook || post.content_hook,
                carouselSlides: post.carouselSlides || post.carousel_slides,
                slidesMetadata: post.slidesMetadata || post.slides_metadata,
                generatedVisuals: post.generatedVisuals || null,
                isGeneratingVisual: false,
                currentSlide: 0,
                gScore: post.gScore || post.g_score,
                verdict: post.verdict
              }));
              
              setPosts(cachedPosts);
              setIsGenerated(true);
              setGenerationSource('ai');
              setHeartedPostIds(data.heartedPostIds || []);
              // Use durationWeeks from API if available, otherwise infer
              const calculatedWeeks = data.durationWeeks || Math.max(1, Math.round(cachedPosts.length / postsPerWeek));
              setDurationWeeks(calculatedWeeks);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching cached strategy:", err);
      } finally {
        setIsLoadingCache(false);
      }
    };
    
    if (!isLocked) {
      fetchCachedStrategy();
    }
  }, [isLocked, postsPerWeek]);

  const handleHeart = async (id: string) => {
    if (rejectedPosts.find(p => p.id === id)) return;
    
    // Optimistic UI update
    setHeartedPostIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      await fetch(`${BASE_URL}/ai/heart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ postId: id })
      });
    } catch (e) {
      console.error('Error saving heart:', e);
    }
  };

  const handleReject = (id: string) => {
    if (heartedPostIds.includes(id)) return;
    if (rejectedPosts.find(p => p.id === id)) {
      setRejectedPosts(prev => prev.filter(p => p.id !== id));
    } else {
      if (rejectedPosts.length >= maxRejects) {
        alert(`You can only replace up to ${maxRejects} posts on your current plan.`);
        return;
      }
      setRejectedPosts(prev => [...prev, { id, prompt: '' }]);
    }
  };

  const handleUpdateRejectPrompt = (id: string, prompt: string) => {
    setRejectedPosts(prev => prev.map(p => p.id === id ? { ...p, prompt } : p));
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setGeneratingCount(rejectedPosts.length);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${BASE_URL}/ai/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: profile?._id || profile?.id,
          rejectedItems: rejectedPosts.map(rp => {
            const originalPost = posts.find(p => p.id === rp.id);
            return {
              id: rp.id,
              prompt: rp.prompt,
              originalTitle: originalPost?.title,
              originalType: originalPost?.type
            };
          }),
          productBrief: {
            name: brief.productName,
            description: brief.description
          }
        })
      });
      const data = await res.json();
      if (data.content_calendar) {
        // Re-map the newly generated posts
        const newFormatted = data.content_calendar.map((post: any) => ({
          id: Math.random().toString(36).substring(7),
          type: post.format === 'video' || post.format === 'reel' ? 'Reel' : post.format === 'carousel' ? 'Carousel' : 'Static',
          title: post.topic,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          visualPrompt: post.visual_prompt,
          detailedDescription: post.detailed_visual_description,
          contentHook: post.content_hook,
          carouselSlides: post.carousel_slides,
          slidesMetadata: post.slides_metadata,
          generatedVisuals: null,
          isGeneratingVisual: false,
          currentSlide: 0,
          gScore: post.g_score,
          verdict: post.verdict
        }));

        setPosts(prev => {
          let newIdx = 0;
          return prev.map(p => {
            if (rejectedPosts.find(r => r.id === p.id) && newIdx < newFormatted.length) {
              const replacement = newFormatted[newIdx];
              newIdx++;
              return replacement;
            }
            return p;
          });
        });
        
        // Trigger visual generation for the new posts
        setGenerationSource('ai');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
      setHasRegenerated(true);
      setRejectedPosts([]);
    }
  };

  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${BASE_URL}/ai/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          durationWeeks,
          posts
        })
      });
      if (res.ok) {
        // We'll force a reload to get the new profile state from the context
        window.location.reload();
      }
    } catch (e) {
      console.error('Deployment error:', e);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAnalyzeMix = async () => {
    setIsAnalyzingMix(true);
    try {
      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';

      const res = await fetch(`${AGENT_API_URL}/analyze-mix?userId=${profile?._id || profile?.id}&durationWeeks=${durationWeeks}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error("Mix analysis failed");
      const data = await res.json();
      setStrategicMix(data);
    } catch (err) {
      console.error("Analysis Error:", err);
      // Fallback mix
      setStrategicMix({
        reels: 3,
        static: 2,
        carousel: 2,
        reasoning: "Using our high-performance default strategy mix for your niche."
      });
    } finally {
      setIsAnalyzingMix(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrief({
        ...brief,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleCopy = (postId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Use the actual API endpoint
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${BASE_URL}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: profile?._id || profile?.id, 
          productBrief: {
            name: brief.productName,
            description: brief.description
          },
          suggestedMix: strategicMix,
          customInstruction: brief.customInstruction,
          durationWeeks: durationWeeks
        })
      });

      if (!res.ok) throw new Error('Strategy creation failed');
      const data = await res.json();
      
      const plan: ScheduledPost[] = data.calendar.map((item: any, idx: number) => {
        const isoDate = getInitialDate(idx + 1);
        let finalDate = new Date(isoDate);

        if (item.optimal_time) {
          try {
            const [timeStr, modifier] = item.optimal_time.split(' ');
            let [hours, minutes] = timeStr.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            finalDate = setHours(setMinutes(finalDate, minutes || 0), hours);
          } catch (e) {
            console.warn("Could not parse AI optimal_time:", item.optimal_time);
          }
        }

        return {
          id: (idx + 1).toString(),
          type: item.format === 'Reel' ? 'Reel' : item.format === 'Carousel' ? 'Carousel' : 'Static',
          title: item.topic,
          scheduledAt: finalDate.toISOString(),
          visualPrompt: item.visual_prompt,
          contentHook: item.content_hook || item.visual_prompt,
          carouselSlides: item.carousel_slides || 3,
          isEditing: false,
          slidesMetadata: item.slides_metadata,
          gScore: item.g_score,
          verdict: item.verdict
        };
      });

      setPosts(plan);
      setGenerationSource('ai');
      setIsGenerated(true);

      // Note: Auto-trigger of visuals has been disabled per user request.
      // The user can manually click 'Generate Visual' to trigger the AI models.
    } catch (err) {
      console.error('AI Strategy Generation Error (Falling back to Mock):', err);
      // Fallback to demo plan if API fails in this environment
      setGenerationSource('mock');
      setPosts([
        { id: '1', type: 'Reel', title: `${brief.productName} Hero Reveal`, scheduledAt: getInitialDate(1) },
        { id: '2', type: 'Static', title: `${brief.productName} Premium Detail`, scheduledAt: getInitialDate(2) },
        { id: '3', type: 'Reel', title: `${brief.productName} Slow-mo Magic`, scheduledAt: getInitialDate(3) },
        { id: '4', type: 'Carousel', title: `5 Reasons to Love ${brief.productName}`, scheduledAt: getInitialDate(4) },
        { id: '5', type: 'Reel', title: `${brief.productName} ASMR/Reaction`, scheduledAt: getInitialDate(5) },
        { id: '6', type: 'Static', title: `${brief.productName} Lifestyle Aesthetic`, scheduledAt: getInitialDate(6) },
        { id: '7', type: 'Carousel', title: `The Story Behind ${brief.productName}`, scheduledAt: getInitialDate(7) },
      ]);
      setIsGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVisuals = async (postId: string, currentPosts?: ScheduledPost[]) => {
    const post = (currentPosts || posts).find(p => p.id === postId);
    if (!post) return;

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isGeneratingVisual: true } : p));

    try {
      let imageBase64 = null;
      if (brief.image) {
        imageBase64 = await fileToBase64(brief.image);
      }

      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'; // FastAPI URL
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

      // Map industry category to Refiner Agent specific categories
      const mapCategoryForRefiner = (cat: string) => {
        const luxury = ['Beauty & Cosmetics', 'Fine Jewellery', 'Food & CPG', 'Fashion & Lifestyle'];
        const tech = ['Tech & SaaS'];
        if (luxury.includes(cat)) return "Lifestyle/Luxury";
        if (tech.includes(cat)) return "Startups/Tech";
        return "Advertising Poster/Sale";
      };

      const res = await fetch(`${AGENT_API_URL}/generate-visuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: post.visualPrompt,
          format: post.type === 'Static' ? 'Static Image' : post.type,
          slides: post.carouselSlides,
          image: imageBase64,
          slide_prompts: post.slidesMetadata?.map(m => m.visual_prompt),
          category: mapCategoryForRefiner(profile?.businessCategory || 'General'),
          headline: post.title,
          userId: profile?._id || profile?.id
        })
      });

      if (!res.ok) throw new Error('Visual generation failed');
      const result = await res.json();

      let visualUrls: string[] = [];
      if (result.type === 'image') {
        const b64 = result.data?.data?.[0]?.b64_json || result.data?.image;
        visualUrls = [`data:image/png;base64,${b64}`];
      } else if (result.type === 'carousel') {
        visualUrls = result.data.map((item: any) => {
          const b64 = item?.data?.[0]?.b64_json || item?.image;
          return `data:image/png;base64,${b64}`;
        });
      } else if (result.type === 'video') {
        visualUrls = [result.data.url];
      }

      // Note: Sharp.js processing removed. AI now generates text natively via Refiner/Imagen 4.0.

      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        generatedVisuals: visualUrls,
        isGeneratingVisual: false,
        gScore: result.g_score,
        verdict: result.verdict
      } : p));

    } catch (err) {
      console.error('Visual Gen Error:', err);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isGeneratingVisual: false } : p));
    } finally {
      setGeneratingCount(prev => Math.max(0, prev - 1));
    }
  };

  const updateVisualPrompt = (id: string, newPrompt: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, visualPrompt: newPrompt } : p));
  };
  const handleDiscard = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const updateDateTime = (id: string, newDateTime: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, scheduledAt: newDateTime } : p));
  };

  const nextSlide = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && p.generatedVisuals) {
        const nextIdx = ((p.currentSlide || 0) + 1) % p.generatedVisuals.length;
        return { ...p, currentSlide: nextIdx };
      }
      return p;
    }));
  };

  const prevSlide = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && p.generatedVisuals) {
        const total = p.generatedVisuals.length;
        const prevIdx = ((p.currentSlide || 0) - 1 + total) % total;
        return { ...p, currentSlide: prevIdx };
      }
      return p;
    }));
  };

  const toggleEdit = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, isEditing: !p.isEditing } : p));
  };

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDisplayTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const toDateTimeLocal = (iso: string) => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  };

  if (isLoadingCache) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Restoring Session...</p>
      </div>
    );
  }

  if (isLocked) {
    const lockoutDate = new Date(profile.generationLockoutUntil);
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 text-center animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Strategy Deployed</h2>
          <p className="text-slate-500 leading-relaxed">
            Your content engine is currently locked and generating posts. Your next strategy phase unlocks on:
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-6 inline-block">
            <span className="text-lg font-bold text-slate-800">
              {lockoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* 1. Planning Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{totalPosts}-Post Content Engine</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            Visual <span className="text-primary">Strategy</span>
            {generationSource === 'mock' && (
              <span className="ml-4 px-3 py-1 bg-amber-100 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full align-middle border border-amber-200">Demo Mode</span>
            )}
            {generationSource === 'ai' && (
              <span className="ml-4 px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full align-middle border border-primary/20">AI Generated</span>
            )}
          </h1>
        </div>

        {isGenerated && (
          <div className="flex gap-3 animate-in slide-in-from-right-4 duration-500 flex-wrap">
            {rejectedPosts.length > 0 && !hasRegenerated && (
              <Button disabled={isRegenerating} onClick={handleRegenerate} className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] px-6 shadow-xl shadow-amber-500/20 border-0">
                {isRegenerating ? <span className="animate-pulse">Regenerating...</span> : <><RefreshCw size={16} className="mr-2" /> Regenerate {rejectedPosts.length} Post{rejectedPosts.length > 1 ? 's' : ''}</>}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={undefined} 
              disabled={true}
              className="h-14 rounded-2xl border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px] px-6 opacity-50 cursor-not-allowed hover:bg-white bg-slate-50/50"
            >
              <RotateCcw size={16} className="mr-2" /> New Strategy (Locked)
            </Button>
            <Button disabled={isDeploying} onClick={handleDeploy} className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-emerald-500/20 border-0">
              {isDeploying ? <span className="animate-pulse">Deploying...</span> : <><Send size={16} className="mr-2" /> Deploy All Posts</>}
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox Modal - Find live post from state */}
      <AnimatePresence>
        {lightboxPost && (() => {
          const livePost = posts.find(p => p.id === lightboxPost.id) || lightboxPost;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
              onClick={() => setLightboxPost(null)}
            >
              <button 
                onClick={() => setLightboxPost(null)}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all z-[110]"
              >
                <X size={24} />
              </button>

              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-5xl w-full aspect-square md:aspect-video rounded-[3rem] overflow-hidden bg-zinc-900 shadow-2xl flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Media Section */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                   {livePost.type === 'Reel' ? (
                      <div className="w-full h-full flex flex-col bg-zinc-900">
                         {/* Fixed Header */}
                         <div className="px-12 py-6 border-b border-white/5 bg-zinc-900 flex items-center justify-between flex-shrink-0">
                            <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full">
                               AI Video Blueprint
                            </Badge>
                            <button 
                               onClick={() => handleCopy(livePost.id, livePost.visualPrompt || "")}
                               className={cn(
                                 "p-2 px-6 rounded-xl transition-all flex items-center gap-2 border border-white/10 shadow-lg",
                                 copiedId === livePost.id ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                               )}
                            >
                               {copiedId === livePost.id ? <Check size={14} /> : <Copy size={14} />}
                               <span className="text-[10px] font-black uppercase tracking-tight">
                                 {copiedId === livePost.id ? "Copied Script" : "Copy Script"}
                               </span>
                            </button>
                         </div>
                         
                         {/* Scrollable Script Body */}
                         <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            <div className="max-w-2xl mx-auto">
                               <p className="text-xl font-medium text-slate-300 leading-relaxed italic">
                                  "{livePost.visualPrompt}"
                               </p>
                               <div className="pt-8 mt-8 border-t border-white/5 flex items-center gap-3 opacity-50">
                                  <Sparkles className="text-primary" size={18} />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autonomous Motion Concept</span>
                               </div>
                            </div>
                         </div>
                      </div>
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <img
                        src={livePost.generatedVisuals?.[livePost.currentSlide || 0]}
                        className="w-full h-full object-contain select-none"
                      />
                      
                      {livePost.type === 'Carousel' && (livePost.generatedVisuals?.length || 0) > 1 && (
                        <>
                          <button 
                            onClick={() => prevSlide(livePost.id)}
                            className="absolute left-6 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
                          >
                            <ChevronLeft size={32} />
                          </button>
                          <button 
                            onClick={() => nextSlide(livePost.id)}
                            className="absolute right-6 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
                          >
                            <ChevronRight size={32} />
                          </button>
                          
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black text-white uppercase tracking-widest border border-white/10">
                            Slide {(livePost.currentSlide || 0) + 1} / {livePost.generatedVisuals?.length}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Info Sidebar (Desktop) */}
                <div className="w-full md:w-80 bg-zinc-900 p-8 flex flex-col border-l border-white/5">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                        {livePost.type}
                      </Badge>
                      <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
                        {livePost.title}
                      </h2>
                    </div>

                    <div className="space-y-4">
                       <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Strategic Content Hook</span>
                          <p className="text-sm font-medium text-slate-300 italic">"{livePost.contentHook || "No hook generated."}"</p>
                       </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                     <Button className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
                        Approve & Schedule
                     </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isGenerated ? (
          <motion.div
            key="pre-gen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-12 gap-8"
          >
            {!strategicMix ? (
              <Card className="lg:col-span-8 border-none shadow-2xl shadow-slate-200/50 rounded-[3.5rem] bg-white overflow-hidden p-12 flex flex-col items-center justify-center min-h-[550px] text-center">
                <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary mb-8 relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] animate-ping opacity-20" />
                  <Sparkles size={40} />
                </div>
                <div className="max-w-md space-y-6">
                  <h2 className="text-3xl font-bold tracking-tight">Activate <span className="text-primary">Cognitive Engine</span></h2>
                  <p className="text-sm font-medium text-slate-400 leading-relaxed uppercase tracking-widest px-4">
                    Our Strategy Agent needs to analyze your **@{profile?.instagramUsername || 'profile'}** and current IG metrics to determine your optimal {totalPosts}-post content mix.
                  </p>
                  
                  {/* Duration Selector - Filtered by remaining weeks in subscription month */}
                  <div className="w-full flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    {[1, 2, 3, 4]
                      .filter(w => w <= (4 - (profile?.generationCount || 0)))
                      .map((w) => (
                      <button
                        key={w}
                        onClick={() => setDurationWeeks(w)}
                        className={cn(
                          "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                          durationWeeks === w ? "bg-white shadow-sm text-primary border border-slate-200" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {w} Week{w > 1 ? 's' : ''}
                      </button>
                    ))}
                    {(4 - (profile?.generationCount || 0)) <= 0 && (
                      <div className="flex-1 py-3 text-[10px] font-bold text-rose-500 uppercase">Monthly Limit Reached</div>
                    )}
                  </div>
                  <Button
                    onClick={handleAnalyzeMix}
                    disabled={isAnalyzingMix}
                    className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all group"
                  >
                    {isAnalyzingMix ? (
                      <div className="flex items-center gap-3">
                        <div className="relative w-5 h-5">
                          <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
                          <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                        <span className="animate-pulse">Reading Meta Insights...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Zap size={20} className="fill-current" />
                        <span>Begin Brand Analysis</span>
                      </div>
                    )}
                  </Button>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest pt-4 italic">No Credits used for phase 1 analysis</p>
                </div>
              </Card>
            ) : (
              /* Strategy Blueprint Card / Form */
              <Card className="lg:col-span-8 border-none shadow-2xl shadow-slate-200/50 rounded-[3.5rem] bg-white overflow-hidden p-10 flex flex-col min-h-[500px]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <Edit3 size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold tracking-tight">Product <span className="text-primary">Brief</span></h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provide context for the AI Agents</p>
                  </div>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Product Name</label>
                      <Input
                        placeholder="e.g. Ultra Hydrating Serum"
                        value={brief.productName}
                        onChange={(e) => setBrief({ ...brief, productName: e.target.value })}
                        className="h-16 rounded-2xl bg-slate-50 border-slate-100 px-6 font-bold text-slate-900 focus:ring-2 ring-primary/20 transition-all border-2"
                      />
                    </div>
                    <div className="space-y-3 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hero Image (Optional)</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "h-16 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden",
                          brief.image ? "bg-primary/5 border-primary/30" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {brief.imagePreview ? (
                          <div className="flex items-center gap-3 px-4 w-full">
                            <img src={brief.imagePreview} className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                            <span className="text-[10px] font-black text-primary uppercase truncate">{brief.image?.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <ImageIcon size={18} />
                            <span className="text-xs font-bold uppercase tracking-tighter">Upload Product Photo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Product Description / Hook</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the product's main superpower or the problem it solves..."
                      value={brief.description}
                      onChange={(e) => setBrief({ ...brief, description: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-100 px-6 py-4 font-bold text-slate-900 focus:ring-2 ring-primary/20 transition-all outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Custom Post Instruction (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g., A poster saying it is priced at ₹399 - Agent will create 1 post based on this"
                      value={brief.customInstruction}
                      onChange={(e) => setBrief({ ...brief, customInstruction: e.target.value })}
                      className="w-full rounded-2xl bg-amber-50 border-2 border-amber-100 px-6 py-4 font-bold text-slate-900 focus:ring-2 ring-amber-300/20 transition-all outline-none resize-none placeholder:text-slate-400"
                    />
                    <p className="text-[9px] font-bold text-slate-400 px-2 italic">
                      {brief.customInstruction.trim() 
                        ? `Agent will generate ${totalPosts - 1} posts autonomously + 1 post based on your instruction.`
                        : `Agent will generate all ${totalPosts} posts autonomously.`}
                    </p>
                  </div>
                </div>

                <div className="pt-10 mt-10 border-t border-slate-50">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !brief.productName}
                    className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-3">
                        <div className="relative w-5 h-5">
                          <motion.div 
                            className="absolute inset-0 border-2 border-primary-foreground/30 rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                          <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                        <span className="tracking-tighter">Initializing Autonomous Agents...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Zap className="fill-current animate-pulse" size={20} />
                        <span>Analyze & Generate {totalPosts}-Post Strategy</span>
                      </div>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Sidebar Stats / Vision */}
            <div className="lg:col-span-4 space-y-8 h-full">
              <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3.5rem] bg-slate-900 p-10 flex flex-col relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                  <TrendingUp size={120} className="text-white" />
                </div>

                <div className="space-y-6 relative z-10 flex flex-col h-full">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-primary-foreground/60">
                      <Sparkles size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Strategist Suggestion</span>
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight">AI Content Mix</h4>
                  </div>

                  <p className="text-sm font-medium text-slate-400 leading-relaxed italic text-left">
                    "{strategicMix?.reasoning || "Analyzing your profile to determine the best distribution..."}"
                  </p>

                  <div className="space-y-6 pt-10 mt-auto">
                    {[
                      { label: 'Reels', count: strategicMix?.reels || 0, icon: Video, color: 'text-primary' },
                      { label: 'Carousel', count: strategicMix?.carousel || 0, icon: Layers, color: 'text-emerald-500' },
                      { label: 'Images', count: strategicMix?.static || 0, icon: ImageIcon, color: 'text-amber-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center", item.color)}>
                            <item.icon size={18} />
                          </div>
                          <span className="text-[12px] font-black text-white uppercase tracking-widest">{item.label}</span>
                        </div>
                        <span className="text-2xl font-black italic text-white">{item.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-10 border-t border-white/5 mt-10">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multi-Agent Workflow Active</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        ) : (isGenerating || (isRegenerating && !isGenerated)) ? (
          <motion.div
            key="finalizing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-12"
          >
             <div className="relative group">
                {/* Neural Glow Effect */}
                <div className="absolute inset-[-40px] bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                   className="absolute inset-[-10px] border-2 border-dashed border-primary/20 rounded-full" 
                />
                <motion.div 
                   animate={{ rotate: -360 }}
                   transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                   className="absolute inset-[-20px] border border-primary/10 rounded-full" 
                />
                <div className="relative w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center overflow-hidden border-4 border-slate-50">
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5" />
                   <div className="relative group">
                      <Sparkles className="text-primary animate-bounce" size={40} />
                      <div className="absolute inset-0 text-primary blur-md animate-pulse opacity-50">
                        <Sparkles size={40} />
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                   <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-4">
                      Multi-Agent Autonomous Neural Link
                   </Badge>
                   <h3 className="text-4xl font-bold tracking-tighter leading-tight">
                      Synthesizing <span className="text-primary">Collective Intelligence</span>
                   </h3>
                </div>

                <div className="grid grid-cols-4 md:grid-cols-7 gap-3 py-6">
                   {posts.map((p, idx) => (
                      <div key={p.id} className="flex flex-col items-center gap-2">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                           p.generatedVisuals 
                             ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                             : "bg-slate-50 border-slate-100 text-slate-300 animate-pulse"
                         )}>
                            {p.generatedVisuals ? <CheckCircle2 size={20} /> : (
                               <div className="relative w-6 h-6">
                                 <div className="absolute inset-0 border-2 border-primary/10 rounded-full" />
                                 <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                               </div>
                             )}
                         </div>
                         <span className={cn("text-[8px] font-black uppercase tracking-widest", p.generatedVisuals ? "text-emerald-500" : "text-slate-400")}>
                           Day {idx + 1}
                         </span>
                      </div>
                   ))}
                </div>
                
                <div className="w-72 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden relative border border-slate-50 shadow-inner">
                   <motion.div 
                     className="h-full bg-primary relative"
                     initial={{ width: "0%" }}
                     animate={{ width: `${((posts.length - generatingCount) / posts.length) * 100}%` }}
                   >
                     <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[loading-stripes_1s_linear_infinite]" />
                   </motion.div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
                   {generatingCount === 1 ? "Polishing finalized artifact..." : `Syncing ${generatingCount} remaining strategic node(s)...`}
                </p>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="post-gen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* The Live Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="relative border-none shadow-xl shadow-slate-200/50 rounded-[3rem] bg-white overflow-hidden group hover:ring-4 ring-primary/10 transition-all flex flex-col h-full active:scale-[0.98]">
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start mb-6">
                        <Badge className="bg-slate-50 text-slate-500 border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-2xl">
                          {formatDisplayDate(post.scheduledAt)}
                        </Badge>
                        <div className="flex gap-2 transition-all">
                          <button
                            onClick={() => handleHeart(post.id)}
                            disabled={!!rejectedPosts.find(p => p.id === post.id)}
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                              heartedPostIds.includes(post.id) ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" : "bg-rose-50 text-rose-500 hover:bg-rose-100",
                              rejectedPosts.find(p => p.id === post.id) ? "opacity-30 cursor-not-allowed" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Heart size={16} className={cn(heartedPostIds.includes(post.id) && "fill-current")} />
                          </button>
                          <button
                            onClick={() => handleReject(post.id)}
                            disabled={heartedPostIds.includes(post.id)}
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                              rejectedPosts.find(p => p.id === post.id) ? "bg-slate-900 text-white shadow-lg shadow-slate-900/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                              heartedPostIds.includes(post.id) ? "opacity-30 cursor-not-allowed" : (rejectedPosts.find(p => p.id === post.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                            )}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                          {post.type === 'Reel' ? <Video size={18} /> : post.type === 'Carousel' ? <Layers size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest">{post.type}</span>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Step {i + 1} of 7</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-8 pt-0 flex-1 flex flex-col">
                      <h4 className="text-xl font-bold text-slate-900 leading-tight mb-4 italic text-left tracking-tight">
                        {post.title}
                      </h4>

                      {/* Rejection Overlay */}
                      {rejectedPosts.find(p => p.id === post.id) && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 p-6 flex flex-col justify-center items-center text-center space-y-4 rounded-[3rem] border-4 border-slate-900 shadow-2xl">
                          {isRegenerating ? (
                            <div className="flex flex-col items-center gap-4">
                              <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Regenerating...</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center mb-2">
                                <X size={28} />
                              </div>
                              <div>
                                <h4 className="font-black text-xl text-slate-900 mb-1">Post Rejected</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provide correction instruction</p>
                              </div>
                            </>
                          )}
                          {!isRegenerating && (
                            <>
                              <textarea
                                placeholder="e.g. Change the product context to summer sale..."
                                value={rejectedPosts.find(p => p.id === post.id)?.prompt || ''}
                                onChange={(e) => handleUpdateRejectPrompt(post.id, e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-xs font-bold focus:ring-2 ring-primary/20 outline-none resize-none placeholder:text-slate-300"
                                rows={3}
                              />
                              <button 
                                onClick={() => handleReject(post.id)}
                                className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest mt-2"
                              >
                                Undo Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Generated Visual Preview */}
                      <div className="mb-6 relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 flex items-center justify-center">
                        {post.isGeneratingVisual ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Neural Render...</span>
                          </div>
                        ) : post.generatedVisuals ? (
                          <div className="w-full h-full relative group/media overflow-hidden">
                            {post.type === 'Reel' ? (
                              <div className="w-full h-full p-6 bg-slate-900 flex flex-col items-center justify-center text-center cursor-zoom-in" onClick={() => setLightboxPost(post)}>
                                 <Video className="text-primary mb-4 animate-pulse" size={32} />
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed line-clamp-4 px-2">
                                    {post.visualPrompt}
                                 </p>
                              </div>
                            ) : (
                              <div className="w-full h-full relative" onClick={() => setLightboxPost(post)}>
                                <img
                                  src={post.generatedVisuals[post.currentSlide || 0]}
                                  className="w-full h-full object-cover transition-all duration-500 ease-out scale-100 group-hover:scale-110 cursor-zoom-in"
                                />

                                {post.type === 'Carousel' && post.generatedVisuals.length > 1 && (
                                  <>
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); prevSlide(post.id); }}
                                        className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                      >
                                        <ChevronLeft size={16} />
                                      </button>
                                    </div>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); nextSlide(post.id); }}
                                        className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                      >
                                        <ChevronRight size={16} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {post.type === 'Carousel' && (
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[8px] font-bold text-white uppercase tracking-tighter shadow-lg">
                                {(post.currentSlide || 0) + 1} / {post.generatedVisuals.length} Slides
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 p-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                              {post.type === 'Reel' ? <Video size={20} /> : post.type === 'Carousel' ? <Layers size={20} /> : <ImageIcon size={20} />}
                            </div>
                            <textarea
                              value={post.visualPrompt}
                              onChange={(e) => updateVisualPrompt(post.id, e.target.value)}
                              className="w-full text-[9px] font-bold text-slate-500 bg-transparent border-none outline-none resize-none text-center"
                              rows={3}
                              placeholder="Edit AI Prompt..."
                            />
                            <Button
                              onClick={() => handleGenerateVisuals(post.id)}
                              size="sm"
                              className="h-8 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4"
                            >
                              Generate Visual
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto space-y-6">
                        <div className="pt-6 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {post.isEditing ? (
                                <div className="flex flex-col gap-2">
                                  <Input
                                    type="datetime-local"
                                    defaultValue={toDateTimeLocal(post.scheduledAt)}
                                    onChange={(e) => updateDateTime(post.id, new Date(e.target.value).toISOString())}
                                    className="h-12 w-full text-[10px] font-black border-primary/40 bg-slate-50 rounded-2xl px-4 outline-none focus:ring-4 ring-primary/10"
                                    onBlur={() => toggleEdit(post.id)}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col text-left group-hover:translate-x-1 transition-transform">
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-primary" />
                                    <span className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{formatDisplayTime(post.scheduledAt)}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Optimal Slot</span>
                                </div>
                              )}
                            </div>
                            {!post.isEditing && (
                              <button onClick={() => toggleEdit(post.id)} className="w-12 h-12 rounded-[1.25rem] bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center">
                                <Edit3 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pb-8">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-display">
                                G-Factor {post.gScore || 'Analyzing...'}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[8px] border-slate-200 text-slate-400 font-black uppercase py-0.5">
                               {post.verdict || 'Neural Pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Add More Slot */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border-3 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 min-h-[400px] text-center cursor-pointer hover:bg-slate-50 hover:border-primary/30 transition-all group"
              >
                <div className="w-16 h-16 rounded-[2rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-300 mb-6 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:border-primary/20">
                  <Zap size={28} />
                </div>
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Expansion Slot</h5>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Inject custom content into Day 8+</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContentStrategy;
