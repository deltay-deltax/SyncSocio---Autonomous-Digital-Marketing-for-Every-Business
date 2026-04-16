import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload,
  Sparkles,
  Zap,
  TrendingUp,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Layout,
  Image as ImageIcon,
  Video,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

type ContentType = 'reel' | 'static' | 'carousel';

interface CritiqueResult {
  verdict: string;
  weak_signals: string[];
  power_moves: string[];
  hashtags: string[];
  improved_hook: string;
  confidence_score: number;
}

interface AnalysisResult {
  analysisId: string;
  growthFactor: number;
  critique: CritiqueResult;
  bestPostingTime: string;
  schedulingReason: string;
  suggestions: string[];
  mediaPath: string;
}

const PostOptimizer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [contentType, setContentType] = useState<ContentType>('static');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
      setResult(null);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      const url = URL.createObjectURL(dropped);
      setPreview(url);
      setResult(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError('Please describe your post before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('contentType', contentType);
      form.append('description', description);
      if (file) form.append('file', file);

      const res = await axios.post(`${API_BASE}/posts/validate`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000
      });

      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSchedule = async () => {
    if (!result?.analysisId) return;
    setIsScheduling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/posts/schedule/${result.analysisId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Post scheduled for ${new Date(result.bestPostingTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    } catch (err: any) {
      setError('Failed to schedule post. Please check your connection.');
    } finally {
      setIsScheduling(false);
    }
  };

  const getGFactorColor = (g: number) => {
    if (g >= 2.0) return 'text-emerald-500';
    if (g >= 1.0) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Intelligence</span>
          </div>
          {/* <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
            Post <span className="text-primary">Optimizer</span>
          </h1> */}
          <p className="text-slate-500 max-w-lg font-medium">
            {/* AI-powered content validation. Predict performance and automate your publishing schedule.aaa */}
          </p>
        </div>


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Creator Sandbox & Preview */}
        <div className="space-y-8 flex flex-col">
          <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] bg-white overflow-hidden order-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Post Setup</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step 01: Configure</CardDescription>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                  <Layout size={20} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 font-display">
              {/* Content Type Picker */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Format</label>
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  {[
                    { id: 'static', icon: ImageIcon, label: 'Post' },
                    { id: 'reel', icon: Video, label: 'Reel' },
                    { id: 'carousel', icon: Layers, label: 'Slide' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setContentType(t.id as ContentType)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all duration-300",
                        contentType === t.id
                          ? "bg-white text-primary shadow-md shadow-primary/5 ring-1 ring-slate-200/50 scale-100"
                          : "text-slate-400 hover:text-slate-600 hover:bg-white/50 scale-95 opacity-70"
                      )}
                    >
                      <t.icon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Upload Zone */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Media Assets</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative group cursor-pointer transition-all duration-500 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center min-h-[260px] overflow-hidden",
                    preview
                      ? "border-primary/20 bg-slate-50"
                      : "border-slate-200 hover:border-primary/40 hover:bg-primary/[0.02] bg-slate-50/50"
                  )}
                >
                  {preview ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {contentType === 'reel' ? (
                        <video src={preview} className="max-h-[220px] rounded-3xl shadow-lg border border-white" />
                      ) : (
                        <img src={preview} alt="Preview" className="max-h-[220px] rounded-3xl shadow-lg border border-white object-cover aspect-video" />
                      )}
                      <div className="absolute inset-x-0 bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                        <div className="bg-slate-900/80 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                          <Upload size={14} /> Replace Media
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 p-8">
                      <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Upload className="text-primary" size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-slate-800 text-sm uppercase tracking-tighter">Drag Assets Here</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">or browse files (max 50MB)</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Context Textarea */}
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context & Narrative</label>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{description.length}/1000</span>
                </div>
                <Textarea
                  placeholder="Describe your post vision..."
                  className="rounded-[1.5rem] border-slate-200 focus:ring-primary/20 min-h-[120px] bg-slate-50/50 text-sm font-medium p-4 transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !description}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs hover-lift shadow-xl shadow-primary/20 transition-all duration-300 border-0"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>Ignite Analysis</span>
                    <Zap size={18} className="ml-2 fill-current text-white" />
                  </>
                )}
              </Button>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold uppercase leading-tight">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* iPhone Instagram Preview (Pixel Perfect) */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center order-2 py-8 bg-slate-50/50 rounded-[3rem] border border-slate-100"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2">
                  <Layout size={12} /> Mobile Vision Preview
                </div>

                {/* iPhone Frame */}
                <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl">
                  <div className="w-[148px] h-[18px] bg-gray-800 top-0 left-1/2 -translate-x-1/2 absolute rounded-b-[1rem] z-20"></div>
                  <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                  <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                  <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>

                  <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white flex flex-col">
                    {/* Instagram Header */}
                    <div className="p-3 pt-6 flex items-center justify-between border-b border-slate-100 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-primary" />
                        <span className="text-[10px] font-black text-slate-900">brand_handle</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />)}
                      </div>
                    </div>

                    {/* Media */}
                    <div className="aspect-[4/5] bg-slate-50 flex items-center justify-center overflow-hidden">
                      {preview ? (
                        <img src={preview} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={40} className="text-slate-100" />
                      )}
                    </div>

                    {/* Interactions */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex gap-3">
                        <TrendingUp size={18} className="text-slate-800" />
                        <MessageSquare size={18} className="text-slate-800" />
                        <Zap size={18} className="text-slate-800" />
                      </div>
                      <Badge variant="secondary" className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase py-0.5 px-1.5 rounded-md border-0">Save</Badge>
                    </div>

                    {/* Caption */}
                    <div className="px-3 pb-8 space-y-2 overflow-y-auto hide-scrollbar">
                      <p className="text-[9px] font-bold text-slate-900">0 Likes</p>
                      <p className="text-[10px] leading-relaxed">
                        <span className="font-black text-slate-900 mr-1.5">brand_handle</span>
                        <span className="text-slate-600 font-medium italic">"{result.critique.improved_hook}"</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.critique.hashtags.map((tag, i) => (
                          <span key={i} className="text-[9px] font-black text-primary italic">#{tag.replace('#', '')}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: AI Insights Panel */}
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {!result && !isAnalyzing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[4rem] border-2 border-dashed border-slate-200"
              >
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 relative border border-slate-100">
                  <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-ping opacity-20" />
                  <Sparkles className="text-slate-300" size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase italic tracking-tight">System <span className="text-slate-300">Offline</span></h3>
                <p className="text-slate-400 max-w-sm text-[13px] font-medium leading-relaxed">
                  Provide your content on the left to activate our <span className="text-primary font-bold">Velocity Cognitive Engine</span> and see your high-confidence growth predictions.
                </p>
                <div className="mt-8 flex gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
                </div>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center space-y-10 bg-white rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary w-1/3"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                <div className="relative">
                  <div className="w-32 h-32 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={40} className="text-primary animate-bounce fill-current" />
                  </div>
                </div>

                <div className="text-center space-y-6 px-6 max-w-sm">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Optimizing Signals</h3>
                  <div className="space-y-3">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Running Computer Vision...</p>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Analyzing Audience Resonance...</p>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Generating Growth Hacks...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && !isAnalyzing && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Score & Schedule Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-none shadow-xl rounded-[2.5rem] bg-white border-t-4 border-primary overflow-hidden">
                    <CardContent className="pt-10 flex flex-col items-center text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                        <TrendingUp size={12} /> Predicted G-Factor
                      </div>

                      <div className="relative w-32 h-32 mb-6">
                        <svg className="w-full h-full rotate-[-90deg]">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                          <circle
                            cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent"
                            strokeDasharray={364}
                            strokeDashoffset={364 - (364 * Math.min(result.growthFactor / 3, 1))}
                            strokeLinecap="round"
                            className={cn("transition-all duration-1000 ease-out",
                              result.growthFactor >= 2 ? "text-emerald-500" : result.growthFactor >= 1 ? "text-primary" : "text-rose-500"
                            )}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-slate-900 leading-none">{result.growthFactor.toFixed(1)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Score</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full px-4">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-50 relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-emerald-500/20 w-[66%]" title="Viral Zone" />
                        </div>
                      </div>
                      <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {result.growthFactor >= 2 ? 'High Viral Potential' : 'Consistent Engagement'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-white via-blue-50/30 to-blue-100/50 text-slate-900 overflow-hidden relative group border border-blue-100/50">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Clock size={120} className="text-primary" />
                    </div>
                    <CardContent className="pt-10 h-full flex flex-col justify-between relative z-10">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                          <Clock size={12} /> Optimal Window
                        </div>
                        <div>
                          <h3 className="text-4xl font-black tracking-tight italic text-primary">
                            {new Date(result.bestPostingTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                          </h3>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {new Date(result.bestPostingTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {result.schedulingReason && (
                          <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-bottom-1 duration-700">
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                              "{result.schedulingReason}"
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSchedule}
                        disabled={isScheduling}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl mt-8 shadow-lg shadow-primary/20 border-0"
                      >
                        {isScheduling ? 'Syncing...' : 'Confirm Schedule'}
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Feedback Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Positive Signals */}
                  <Card className="border-none shadow-lg rounded-[2.5rem] bg-white border-l-4 border-emerald-500 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                          <CheckCircle2 size={20} />
                        </div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Growth Magnets</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.critique.power_moves.map((move, i) => (
                          <li key={i} className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl group transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                            <span className="text-xs font-medium text-slate-600 leading-relaxed font-display">{move}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Improvements */}
                  <Card className="border-none shadow-lg rounded-[2.5rem] bg-white border-l-4 border-amber-500 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100/50">
                          <AlertCircle size={20} />
                        </div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Strategy Leaks</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.critique.weak_signals.map((weak, i) => (
                          <li key={i} className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl group transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                            <span className="text-xs font-medium text-slate-600 leading-relaxed font-display">{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-center pt-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                    <Info size={12} /> Data calibrated via Velocity Neural Grid
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PostOptimizer;
