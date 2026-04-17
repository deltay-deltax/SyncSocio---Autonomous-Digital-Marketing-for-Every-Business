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
  
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPosts(MOCK_PLAN.generatedPosts);
      setIsGenerated(true);
      setIsGenerating(false);
    }, 1500);
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

  // Convert ISO to datetime-local format (YYYY-MM-DDThh:mm)
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
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Command Center</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
            Content <span className="text-primary">Planner</span>
          </h1>
        </div>
        
        {!isGenerated && (
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="h-16 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 transition-all group border-0"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mr-3" />
            ) : (
              <Zap className="mr-3 fill-current group-hover:animate-pulse" size={20} />
            )}
            {isGenerating ? 'Analyzing Metrics...' : 'Generate 7-Day Plan'}
          </Button>
        )}

        {isGenerated && (
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => setIsGenerated(false)} className="h-14 rounded-2xl border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px] px-6">
               <RotateCcw size={16} className="mr-2" /> Reset
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
            className="grid lg:grid-cols-3 gap-8"
          >
            {/* Strategy Blueprint Card */}
            <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/50 rounded-[3.5rem] bg-white overflow-hidden p-10 flex flex-col justify-between min-h-[400px]">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase">Blueprint <span className="text-primary">Recommendation</span></h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velocity AI Engine v2.1</p>
                  </div>
                </div>
                <p className="text-lg font-medium text-slate-600 leading-relaxed italic text-left">
                  "{MOCK_PLAN.summary}"
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-100">
                {[
                  { label: 'Reels', count: MOCK_PLAN.reels, icon: Video, color: 'text-primary' },
                  { label: 'Carousel', count: MOCK_PLAN.carousel, icon: Layers, color: 'text-emerald-500' },
                  { label: 'Posts', count: MOCK_PLAN.static, icon: ImageIcon, color: 'text-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                       <item.icon size={14} className={item.color} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                    <p className="text-3xl font-black italic text-slate-900">{item.count}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Account Status */}
            <Card className="lg:col-span-1 border-none shadow-xl shadow-slate-200/50 rounded-[3.5rem] bg-slate-50 p-10 flex flex-col items-center justify-center text-center border-2 border-white">
               <div className="w-20 h-20 rounded-full bg-white shadow-inner flex items-center justify-center mb-6 border border-slate-100">
                  <Settings2 size={32} className="text-slate-300 animate-spin-slow" />
               </div>
               <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-2 italic">Waiting for Input</h4>
               <p className="text-xs font-medium text-slate-400 leading-relaxed px-4">
                 Our agent has analyzed your profile <b>@{profile?.instagramUsername || 'user'}</b>. Click generate to construct your visual calendar.
               </p>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            key="post-gen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* The Live Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="relative border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden group hover:ring-2 ring-primary/20 transition-all flex flex-col h-full">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                         <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl">
                            {formatDisplayDate(post.scheduledAt)}
                         </Badge>
                         <button 
                           onClick={() => handleDiscard(post.id)}
                           className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-500 hover:text-white"
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            {post.type === 'Reel' ? <Video size={14} /> : post.type === 'Carousel' ? <Layers size={14} /> : <ImageIcon size={14} />}
                         </div>
                         <span className="text-[10px] font-black uppercase text-primary tracking-widest">{post.type}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                      <h4 className="text-base font-bold text-slate-900 leading-snug mb-6 italic text-left">
                        {post.title}
                      </h4>
                      
                      {/* Time Management */}
                      <div className="mt-auto pt-6 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {post.isEditing ? (
                                <div className="flex flex-col gap-2">
                                  <label className="text-[8px] font-black text-primary uppercase tracking-widest">Select Date & Time</label>
                                  <Input 
                                    type="datetime-local"
                                    defaultValue={toDateTimeLocal(post.scheduledAt)} 
                                    onChange={(e) => updateDateTime(post.id, new Date(e.target.value).toISOString())}
                                    className="h-10 w-full text-[10px] font-black border-primary/20 bg-slate-50 rounded-xl px-3 outline-none focus:ring-2 ring-primary/20"
                                    onBlur={() => toggleEdit(post.id)}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col text-left">
                                   <div className="flex items-center gap-1.5">
                                      <Clock size={12} className="text-primary" />
                                      <span className="text-[11px] font-black text-slate-900 uppercase italic">{formatDisplayTime(post.scheduledAt)}</span>
                                   </div>
                                   <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Recommended Peak</span>
                                </div>
                              )}
                           </div>
                           {!post.isEditing && (
                             <button onClick={() => toggleEdit(post.id)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-primary transition-colors flex items-center justify-center">
                                <Edit3 size={14} />
                             </button>
                           )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0">
                       <div className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 font-display">Schedule Validated</span>
                       </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
              
              {/* Add More Slot (Placeholder) */}
              <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-10 min-h-[300px] text-center cursor-pointer hover:bg-slate-50 transition-colors group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4 group-hover:scale-110 transition-transform">
                    <Zap size={20} />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Influx Slot</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContentStrategy;
