import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Sparkles, Zap, Clock, Trash2, CheckCircle2, 
  Video, Layers, Image as ImageIcon, ArrowRight,
  TrendingUp, Settings2, RotateCcw, Send, Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOutletContext } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ScheduledPost {
  id: string;
  type: 'Reel' | 'Static' | 'Carousel';
  title: string;
  scheduledAt: string; // ISO string
  isEditing?: boolean;
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
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  
  // Product Brief State
  const [brief, setBrief] = useState({
    productName: '',
    description: '',
    category: 'Fashion & Lifestyle',
    image: null as File | null
  });

  const categories = [
    { id: 'Beauty & Cosmetics', label: 'Cosmetic' },
    { id: 'Fine Jewellery', label: 'Jewellery' },
    { id: 'Food & CPG', label: 'Food CPG' },
    { id: 'Fashion & Lifestyle', label: 'Fashion' },
    { id: 'Tech & SaaS', label: 'Startup' },
    { id: 'Other', label: 'Other' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Use the actual API endpoint
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${BASE_URL}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productBrief: {
            name: brief.productName,
            description: brief.description,
            category: brief.category
          }
        })
      });

      if (!res.ok) throw new Error('Strategy creation failed');
      const data = await res.json();
      
      // The API returns { calendar: [...] }
      const plan = data.calendar.map((item: any, idx: number) => ({
        id: (idx + 1).toString(),
        type: item.format === 'Reel' ? 'Reel' : item.format === 'Carousel' ? 'Carousel' : 'Static',
        title: item.topic,
        scheduledAt: getInitialDate(idx + 1),
        visualPrompt: item.visual_prompt, // Store for later use
        contentHook: item.content_hook
      }));

      setPosts(plan);
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      // Fallback to demo plan if API fails in this environment
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

  const handleDiscard = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const updateDateTime = (id: string, newDateTime: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, scheduledAt: newDateTime } : p));
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

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* 1. Planning Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">7-Day Content Engine</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
            Visual <span className="text-primary">Strategy</span>
          </h1>
        </div>
        
        {isGenerated && (
          <div className="flex gap-3 animate-in slide-in-from-right-4 duration-500">
             <Button variant="outline" onClick={() => setIsGenerated(false)} className="h-14 rounded-2xl border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px] px-6">
               <RotateCcw size={16} className="mr-2" /> New Strategy
             </Button>
             <Button className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-emerald-500/20 border-0">
               <Send size={16} className="mr-2" /> Deploy All Posts
             </Button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isGenerated ? (
          <motion.div 
            key="pre-gen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-12 gap-8"
          >
            {/* Strategy Blueprint Card / Form */}
            <Card className="lg:col-span-8 border-none shadow-2xl shadow-slate-200/50 rounded-[3.5rem] bg-white overflow-hidden p-10 flex flex-col min-h-[500px]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                  <Edit3 size={32} />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black italic tracking-tight uppercase">Product <span className="text-primary">Brief</span></h3>
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
                      onChange={(e) => setBrief({...brief, productName: e.target.value})}
                      className="h-16 rounded-2xl bg-slate-50 border-slate-100 px-6 font-bold text-slate-900 focus:ring-2 ring-primary/20 transition-all border-2"
                    />
                  </div>
                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hero Image (Optional)</label>
                    <div className="h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 text-slate-400">
                        <ImageIcon size={18} />
                        <span className="text-xs font-bold uppercase tracking-tighter">Upload Product Photo</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Product Description / Hook</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe the product's main superpower or the problem it solves..."
                    value={brief.description}
                    onChange={(e) => setBrief({...brief, description: e.target.value})}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-100 px-6 py-4 font-bold text-slate-900 focus:ring-2 ring-primary/20 transition-all outline-none resize-none"
                  />
                </div>

                <div className="space-y-4 text-left">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Industry Category</label>
                   <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setBrief({...brief, category: cat.id})}
                          className={cn(
                            "px-5 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                            brief.category === cat.id 
                              ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-primary/30"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                   </div>
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
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Initializing Agents...</span>
                     </div>
                  ) : (
                    <div className="flex items-center gap-3">
                       <Zap className="fill-current animate-pulse" size={20} />
                       <span>Analyze & Generate 7-Day Strategy</span>
                    </div>
                  )}
                </Button>
              </div>
            </Card>

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
                       <h4 className="text-xl font-black text-white uppercase italic tracking-tight">AI Content Mix</h4>
                    </div>

                    <p className="text-sm font-medium text-slate-400 leading-relaxed italic text-left">
                      "Based on your profile <b>@{profile?.instagramUsername || 'user'}</b>'s 4.2x engagement on Reels, our agent suggests this high-impact 7-day distribution."
                    </p>

                    <div className="space-y-6 pt-10 mt-auto">
                       {[
                         { label: 'Reels', count: 3, icon: Video, color: 'text-primary' },
                         { label: 'Carousel', count: 2, icon: Layers, color: 'text-emerald-500' },
                         { label: 'Images', count: 2, icon: ImageIcon, color: 'text-amber-500' },
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
                         <button 
                           onClick={() => handleDiscard(post.id)}
                           className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-500 hover:text-white"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            {post.type === 'Reel' ? <Video size={18} /> : post.type === 'Carousel' ? <Layers size={18} /> : <ImageIcon size={18} />}
                         </div>
                         <div className="text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">{post.type}</span>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Step {i+1} of 7</p>
                         </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-8 pt-0 flex-1 flex flex-col">
                      <h4 className="text-xl font-bold text-slate-900 leading-tight mb-8 italic text-left tracking-tight">
                        {post.title}
                      </h4>
                      
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
                           <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-display">G-Factor 9.2</span>
                           </div>
                           <Badge variant="outline" className="text-[8px] border-slate-200 text-slate-400 font-black uppercase py-1">Critically Appoved</Badge>
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
