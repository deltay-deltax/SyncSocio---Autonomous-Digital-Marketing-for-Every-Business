import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Info,
  Smartphone,
  Edit3,
  Copy,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, fileToBase64 } from '@/lib/utils';

interface IconProps {
  size?: number;
  className?: string;
}

// Brand Icons as custom SVG components to avoid lucide-react version issues
const FacebookIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

type ContentType = 'static' | 'carousel';

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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>('static');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'strategy'>('content');
  const [copied, setCopied] = useState(false);
  const [aiVisual, setAiVisual] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [platforms, setPlatforms] = useState<{ instagram: boolean, facebook: boolean }>({
    instagram: true,
    facebook: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleGenerateAIVisual = async () => {
    if (!result || files.length === 0) return;
    setIsGeneratingVisual(true);
    try {
      const base64 = await fileToBase64(files[0]);
      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'; // FastAPI
      const res = await fetch(`${AGENT_API_URL}/generate-visuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `High fashion editorial photograph of the product, ${result.critique.improved_hook}, professional studio lighting, 4k commercial quality, trending on instagram`,
          format: contentType === 'static' ? 'Static Image' : 'Carousel',
          image: base64
        })
      });

      if (!res.ok) throw new Error('Visual generation failed');
      const data = await res.json();
      
      let visualUrl = "";
      if (data.type === 'image') {
        const b64 = data.data?.data?.[0]?.b64_json || data.data?.image;
        visualUrl = `data:image/png;base64,${b64}`;
      } else if (data.type === 'video') {
        visualUrl = data.data.url;
      }
      
      setAiVisual(visualUrl);
    } catch (err) {
      console.error('AI Visual Error:', err);
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      if (contentType === 'carousel') {
        setFiles(prev => [...prev, ...selected]);
        const newUrls = selected.map(f => URL.createObjectURL(f));
        setPreviews(prev => [...prev, ...newUrls]);
      } else {
        setFiles([selected[0]]);
        setPreviews([URL.createObjectURL(selected[0])]);
      }
      setResult(null);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) {
      if (contentType === 'carousel') {
        setFiles(prev => [...prev, ...dropped]);
        const newUrls = dropped.map(f => URL.createObjectURL(f));
        setPreviews(prev => [...prev, ...newUrls]);
      } else {
        setFiles([dropped[0]]);
        setPreviews([URL.createObjectURL(dropped[0])]);
      }
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
      files.forEach(f => form.append('files', f));

      const res = await axios.post(`${API_BASE}/posts/validate`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000
      });

      setResult(res.data);
      setShowPreview(true); // Auto switch to preview on success
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublishNow = async () => {
    if (!result) return;
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/posts/schedule/${result.analysisId}`, { platforms }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const targetList = [];
      if (platforms.instagram) targetList.push('Instagram');
      if (platforms.facebook) targetList.push('Facebook');
      
      alert(`🚀 Published successfully to ${targetList.join(' & ')}!`);
      
      // Redirect to history to see the new post
      navigate('/dashboard/history');
    } catch (err) {
      console.error('Publish error', err);
      alert('Publishing failed. Please check your social connections.');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "Schedule Pending";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Check Setup";
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Date pending";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Date pending";
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
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
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            Post <span className="text-primary">Optimizer</span>
          </h1>
          <p className="text-slate-500 max-w-lg font-medium">
            {/* AI-powered content validation. Predict performance and automate your publishing schedule.aaa */}
          </p>
        </div>


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Creator Sandbox & Preview */}
        <div className="space-y-8 flex flex-col pt-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100/80 p-1 rounded-2xl w-fit self-center border border-slate-200/50 backdrop-blur-sm">
            <button
              onClick={() => setShowPreview(false)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !showPreview ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Edit3 size={12} /> Setup
            </button>
            <button
              onClick={() => previews.length > 0 && setShowPreview(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                showPreview ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600",
                previews.length === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <Smartphone size={12} /> Preview
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!showPreview ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] bg-white overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold tracking-tight">Post Setup</CardTitle>
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
                      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                        {[
                          { id: 'static', icon: ImageIcon, label: 'Post' },
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
                          previews.length > 0 
                            ? "border-solid border-primary/20 bg-white shadow-xl shadow-primary/5" 
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary/30"
                        )}
                      >
                        {previews.length > 0 ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                            {contentType === 'carousel' ? (
                              <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                                {previews.map((p, i) => (
                                  <div key={i} className="relative shrink-0">
                                    <img src={p} className="h-[180px] rounded-2xl shadow-md border border-white object-cover aspect-[4/5]" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFiles(prev => prev.filter((_, idx) => idx !== i));
                                        setPreviews(prev => prev.filter((_, idx) => idx !== i));
                                      }}
                                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                                <img src={previews[0]} alt="Preview" className="max-h-[220px] rounded-3xl shadow-lg border border-white object-cover aspect-video" />
                            )}
                            <div className="absolute inset-x-0 bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                              <div className="bg-slate-900/80 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                                <Upload size={14} /> Add {contentType === 'carousel' ? 'More' : 'Media'}
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
                          multiple={contentType === 'carousel'}
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

                    {/* Platform Toggles */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Channels</label>
                      <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm w-full">
                        {(["facebook", "instagram"] as const).map((p) => {
                          const active = platforms[p];
                          const Icon = p === "facebook" ? FacebookIcon : InstagramIcon;
                          const label = p === "facebook" ? "Facebook" : "Instagram";
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                setPlatforms((prev) => {
                                  const next = { ...prev, [p]: !prev[p] };
                                  if (!next.facebook && !next.instagram) return prev;
                                  return next;
                                })
                              }
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                active
                                  ? p === "facebook"
                                    ? "bg-[#1877F2] text-white shadow-lg shadow-blue-500/20"
                                    : "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg shadow-rose-500/20"
                                  : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50",
                              )}
                            >
                              <Icon size={14} />
                              {label}
                              {active && <Check size={12} strokeWidth={3} className="ml-1" />}
                            </button>
                          );
                        })}
                      </div>
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
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center bg-slate-50/80 p-8 rounded-[3.5rem] border border-slate-200/50 shadow-inner"
              >
                {/* iPhone 17 Pro Max Frame */}
                <div className="relative mx-auto border-[#1C1C1E] bg-[#1C1C1E] border-[8px] rounded-[3.2rem] h-[640px] w-[300px] shadow-2xl ring-1 ring-slate-900/10">
                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30 flex items-center justify-end px-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20" />
                  </div>
                  
                  <div className="rounded-[2.7rem] overflow-hidden w-full h-full bg-white flex flex-col relative">
                    {/* IG Top Bar */}
                    <div className="pt-8 pb-3 px-4 flex justify-between items-center border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
                          <div className="w-full h-full rounded-full bg-white p-[1px]">
                            <div className="w-full h-full rounded-full bg-slate-200" />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Your Brand</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                      {/* Media */}
                      <div className="aspect-[4/5] bg-slate-100 flex items-center justify-center relative">
                        {previews.length > 0 ? (
                          contentType === 'carousel' ? (
                            <div className="flex w-full h-full snap-x snap-mandatory overflow-x-auto no-scrollbar">
                              {previews.map((p, i) => (
                                <img key={i} src={p} className="w-full h-full object-cover snap-center" />
                              ))}
                            </div>
                          ) : (
                               <img src={previews[0]} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <ImageIcon size={40} className="text-slate-200" />
                        )}
                        {contentType === 'carousel' && previews.length > 1 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                             {previews.map((_, i) => (
                               <div key={i} className="w-1 h-1 rounded-full bg-white shadow-sm" />
                             ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex gap-4">
                          <TrendingUp size={20} className="text-slate-900" />
                          <MessageSquare size={20} className="text-slate-900" />
                          <Zap size={20} className="text-slate-900" />
                        </div>
                      </div>

                      {/* Caption/Tags */}
                      <div className="px-3 pb-10 space-y-2">
                        <p className="text-[10px] font-bold text-slate-900">0 Likes</p>
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold mr-2">brand_account</span>
                          <span className="text-slate-700">
                            {result?.critique?.improved_hook || "Optimized caption will appear here..."}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result?.critique?.hashtags?.map((tag, i) => (
                            <span key={i} className="text-[10px] text-blue-600 font-medium">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-black uppercase mt-6 text-slate-400 tracking-widest italic flex items-center gap-2">
                  <Smartphone size={12} /> iPhone 17 Pro Max Concept
                </p>
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
                <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">System <span className="text-slate-300 font-normal">Offline</span></h3>
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
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">Optimizing Signals</h3>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full min-h-[600px] bg-white rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col"
              >
                {/* Header: Time Window (TOP) */}
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Optimal Velocity Window</p>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        {formatTime(result.bestPostingTime)} <span className="text-slate-300 font-normal">|</span> <span className="text-primary">{formatDate(result.bestPostingTime)}</span>
                      </h3>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase tracking-widest text-[10px] py-1.5 px-3 rounded-xl">
                    High Reach Probability
                  </Badge>
                </div>

                {/* Navigation Tabs (Carousel Control) */}
                <div className="px-8 pt-6 pb-2 flex gap-6 border-b border-slate-50">
                  {[
                    { id: 'content', label: '01. Adjusted Content', icon: MessageSquare },
                    { id: 'strategy', label: '02. Growth Logic', icon: Zap }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeTab === tab.id ? "text-primary" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 relative overflow-hidden bg-slate-50/20">
                  <AnimatePresence mode="wait">
                    {activeTab === 'content' ? (
                      <motion.div
                        key="content-slide"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-10 space-y-8"
                      >
                        {/* Strategic Caption */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Optimized Caption</label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${result.critique.improved_hook}\n\n${result.critique.hashtags.join(' ')}`)}
                              className="rounded-xl hover:bg-slate-50 h-8 gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                              {copied ? <Check size={14} className="text-emerald-500" /> : <><Copy size={14} /> Copy</>}
                            </Button>
                          </div>
                          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group min-h-[160px] flex items-center">
                            <p className="text-lg font-medium text-slate-700 leading-relaxed italic">
                              "{result.critique.improved_hook || "Engine processing..."}"
                            </p>
                          </div>
                        </div>

                        {/* Hashtags */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Viral Hashtag Cloud</label>
                          <div className="flex flex-wrap gap-2">
                            {result.critique.hashtags?.map((tag, i) => (
                              <span key={i} className="bg-white border border-slate-100 text-primary font-black py-2.5 px-4 rounded-2xl shadow-sm text-[10px] uppercase tracking-tight">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="strategy-slide"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-10 space-y-8"
                      >
                        <div className="grid grid-cols-1 gap-6">
                           {/* AI Logic Resonance */}
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cognitive Reasoning</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {result.critique.power_moves?.map((move, i) => (
                                <div key={i} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm group">
                                  <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                    <Zap size={16} />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-600 uppercase italic tracking-tight leading-tight">{move}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                           <p className="text-[10px] font-medium text-primary uppercase tracking-widest text-center">These signals were derived from your Brand Profile & visual media analysis.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Action (Light Theme) */}
                <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                    <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ready to Scale
                    </span>
                  </div>
                  <Button
                    onClick={handlePublishNow}
                    disabled={isPublishing}
                    className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] px-8 h-14 rounded-2xl shadow-xl shadow-primary/20 border-0 group"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Now'} <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
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
