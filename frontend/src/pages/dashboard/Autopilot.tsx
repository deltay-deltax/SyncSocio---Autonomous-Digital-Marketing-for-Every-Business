import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import JSZip from 'jszip';
import {
  Sparkles, Zap, CheckCircle2, Copy, Check, Download, Flame, Grid,
  Heart, X, ArrowLeft, ArrowRight, Loader2, AlertCircle, ShoppingBag, Package, RefreshCw, Plus, Edit3, Globe, Calendar, Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { getFriendlyErrorMessage } from '@/lib/errorHandler';

// IDB Helpers for Asset Library matching ContentStrategy
const IDB_NAME = 'SyncSocioAssetCache';
const IDB_STORE = 'assets';

function openAssetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<any> {
  try {
    const db = await openAssetDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  } catch (e) {
    return null;
  }
}

async function idbSet(key: string, val: any): Promise<void> {
  try {
    const db = await openAssetDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('[AssetCache] IDB set failed:', e);
  }
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const languages = [
  { id: 'english', label: 'English', flag: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', flag: '🅷' },
  { id: 'hindi', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { id: 'marathi', label: 'Marathi (मराठी)', flag: '🌾' },
  { id: 'bengali', label: 'Bengali (বাংলা)', flag: '🌸' },
  { id: 'gujarati', label: 'Gujarati (ગુજરાતી)', flag: '🪁' },
  { id: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🌾' },
  { id: 'tamil', label: 'Tamil (தமிழ்)', flag: '🪔' },
  { id: 'telugu', label: 'Telugu (தெలుగు)', flag: '🌟' },
  { id: 'kannada', label: 'Kannada (ಕನ್ನಡ)', flag: '🌺' },
  { id: 'malayalam', label: 'Malayalam (മലയാളം)', flag: '🌴' },
  { id: 'odia', label: 'Odia (ଓଡ଼ିଆ)', flag: '🐚' },
  { id: 'odia', label: 'Odia (ଓଡ଼િଆ)', flag: '🐚' },
  { id: 'nepali', label: 'Nepali (नेपाली)', flag: '🇳🇵' },
];

interface Product {
  _id: string;
  name: string;
  description: string;
  imageBase64: string;
  imageUrls?: string[];
  keyBenefit?: string;
  price?: string;
}

function imgSrc(b64: string) {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

// ── Local Draggable Tinder Card Component ─────────────────────────────
function TinderCard({
  post,
  index,
  isTop,
  stackIndex,
  onSwipeRight,
  onSwipeLeft,
  onImageClick,
  isHearted,
  showHeartPop,
  brandName
}: {
  post: any;
  index: number;
  isTop: boolean;
  stackIndex: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onImageClick: () => void;
  isHearted: boolean;
  showHeartPop: boolean;
  brandName: string;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacityValue = useTransform(x, [-200, -150, 0, 150, 200], [0.6, 1, 1, 1, 0.6]);

  // Unconditional hook declarations to prevent hook order mismatch on swipe
  const saveLabelOpacity = useTransform(x, [0, 80], [0, 1]);
  const passLabelOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 130) {
      onSwipeRight();
    } else if (info.offset.x < -130) {
      onSwipeLeft();
    }
  };

  // Stack styling (scales down and offsets background cards slightly)
  const scale = 1 - stackIndex * 0.04;
  const translateY = stackIndex * 12;

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={isTop ? { x, rotate, opacity: opacityValue, scale, y: translateY } : { scale, y: translateY }}
      transition={isTop ? { type: 'spring', stiffness: 300, damping: 20 } : { duration: 0.2 }}
      className={cn(
        'absolute inset-0 rounded-3xl border border-border bg-card overflow-hidden shadow-xl flex flex-col select-none origin-bottom',
        isTop ? 'cursor-grab active:cursor-grabbing z-20' : 'z-10 pointer-events-none'
      )}
    >
      {/* Brand Gradient Header */}
      <div className="p-3 bg-muted/5 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full p-[2px] bg-gradient-to-tr from-sky-400 via-indigo-500 to-fuchsia-500">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <span className="text-[9px] font-black text-foreground">{brandName.slice(0, 2).toUpperCase() || 'SS'}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground leading-tight">{brandName}</p>
            <p className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">Sprint Drop</p>
          </div>
        </div>
        {post.festival_name && (
          <span className="bg-pink-500/10 text-pink-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-pink-500/20">
            🎉 {post.festival_name}
          </span>
        )}
      </div>

      {/* Visual Image container */}
      <motion.div
        onTap={onImageClick}
        className="relative flex-1 bg-muted/30 overflow-hidden border-b border-border/40 cursor-pointer"
      >
        {post.image ? (
          <img
            src={imgSrc(post.image)}
            alt={post.topic}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle size={20} className="text-destructive/50" />
            <span className="text-[10px] font-bold">Image generation failed</span>
          </div>
        )}

        {/* Swipe visual overlays */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: saveLabelOpacity }}
              className="absolute top-6 left-6 border-4 border-emerald-500 text-emerald-500 text-xs font-black uppercase px-3 py-1.5 rounded-xl rotate-[-12deg] z-30"
            >
              SAVE ❤️
            </motion.div>
            <motion.div
              style={{ opacity: passLabelOpacity }}
              className="absolute top-6 right-6 border-4 border-rose-500 text-rose-500 text-xs font-black uppercase px-3 py-1.5 rounded-xl rotate-[12deg] z-30"
            >
              PASS ❌
            </motion.div>
          </>
        )}

        {/* Heart Pop Animation */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-30"
            >
              <Heart className="w-16 h-16 text-rose-500 fill-rose-500 filter drop-shadow-md" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Basic details footer inside card */}
      <div className="p-4 shrink-0 bg-card">
        <h4 className="text-xs font-bold text-foreground leading-snug truncate">{post.topic}</h4>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-normal font-medium">
          {post.caption}
        </p>
      </div>
    </motion.div>
  );
}

export default function AutopilotPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    profile,
    backgroundTasks,
    startBackgroundAutopilot,
    viewingTask,
    clearViewingTask
  } = useOutletContext<any>();

  // Form States
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedWeeks, setSelectedWeeks] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  type SetupStep = 'language' | 'week' | 'product';
  const [currentStep, setCurrentStep] = useState<SetupStep>('language');

  // Flow & Layout States
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'generating' | 'results'>('form');
  const [layoutMode, setLayoutMode] = useState<'swipe' | 'grid'>('swipe');
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalGeneratedCount, setTotalGeneratedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Lightbox & Animations
  const [previewPost, setPreviewPost] = useState<any | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [showHeartPop, setShowHeartPop] = useState<Record<number, boolean>>({});
  const clickTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  const brandName = profile?.brandName || 'Brand';

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        
        const res = await fetch(`${API_BASE}/products`, { credentials: 'include',
          headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
        });
        if (res.ok) {
          const _rawJson34 = await res.json();
            const data = _rawJson34 && _rawJson34.success !== undefined ? (_rawJson34.success ? _rawJson34.data : _rawJson34) : _rawJson34;
          const prodList = data.products || [];
          setProducts(prodList);
          setSelectedProductIds([]);
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Sync with background task status
  useEffect(() => {
    if (!currentTaskId || !backgroundTasks) return;
    const task = backgroundTasks.find((t: any) => t.id === currentTaskId);
    if (!task) return;

    if (task.status === 'success') {
      const posts = task.posts || [];
      setGeneratedPosts(posts);
      setSavedIndices(new Set());
      setCurrentIndex(0);
      setSkippedCount(0);
      setTotalGeneratedCount(posts.length);
      setStage('results');
      setCurrentTaskId(null);
    } else if (task.status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Sprint Generation Failed',
        description: task.error || 'Something went wrong during generation.'
      });
      setStage('form');
      setCurrentTaskId(null);
    }
  }, [backgroundTasks, currentTaskId]);

  // Sync with viewingTask (from top-right task manager)
  useEffect(() => {
    if (viewingTask && viewingTask.mode === 'autopilot' && viewingTask.status === 'success') {
      const posts = viewingTask.posts || [];
      setGeneratedPosts(posts);
      setSavedIndices(new Set());
      setCurrentIndex(0);
      setSkippedCount(0);
      setTotalGeneratedCount(posts.length);
      setStage('results');
      const timer = setTimeout(() => {
        if (clearViewingTask) clearViewingTask();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [viewingTask, clearViewingTask]);

  // Helper to fetch current credits from localStorage
  const currentCredits = parseInt(localStorage.getItem('syncsocio_credits') || '0', 10);
  const cost = selectedWeeks * 7 * 5; // 5 credits per post, 7 posts per week
  const isSufficientCredits = currentCredits >= cost;

  // Toggle product checklists
  const handleToggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const isSelected = prev.includes(id);
      if (!isSelected && prev.length >= Math.max(1, Math.floor((selectedWeeks * 7) / 2))) {
        return prev;
      }
      return isSelected ? prev.filter(pid => pid !== id) : [...prev, id];
    });
  };

  // Launch Autopilot
  const handleLaunchAutopilot = async () => {
    if (selectedProductIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Products Selected',
        description: 'Please check at least one product to promote.'
      });
      return;
    }
    if (!isSufficientCredits) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Credits',
        description: `You need ${cost} credits, but only have ${currentCredits} credits remaining.`
      });
      return;
    }

    setStage('generating');
    try {
      const tId = await startBackgroundAutopilot(
        selectedLanguage,
        selectedWeeks,
        selectedProductIds,
        []
      );
      setCurrentTaskId(tId);
    } catch (err: any) {
      setStage('form');
      toast({
        variant: 'destructive',
        title: 'Launch Failed',
        description: getFriendlyErrorMessage(err)
      });
    }
  };

  // Heart/Save asset helper
  const handleHeartPost = async (post: any, idx: number) => {
    if (savedIndices.has(idx)) return;

    setSavedIndices(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });

    try {
      
      const body = {
        type: 'image',
        thumbnailBase64: post.image,
        caption: post.caption,
        idea: post.topic,
        aspectRatio: '1:1',
      };

      const res = await fetch(`${API_BASE}/strategy-assets`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const _rawJson33 = await res.json();
          const data = _rawJson33 && _rawJson33.success !== undefined ? (_rawJson33.success ? _rawJson33.data : _rawJson33) : _rawJson33;
        const activeBrandId = profile?._id || '';
        const cacheKey = `syncsocio_strategy_assets_${activeBrandId}`;
        try {
          const cached = await idbGet(cacheKey) || [];
          cached.unshift(data.creative);
          await idbSet(cacheKey, cached);
        } catch (e) {
          console.warn('[Autopilot IDB] Cache sync error:', e);
        }
        toast({
          title: 'Saved to Library ❤️',
          description: `"${post.topic}" has been added to your Asset Library.`
        });
      } else {
        throw new Error('Save asset request failed');
      }
    } catch (err) {
      setSavedIndices(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      toast({
        variant: 'destructive',
        title: 'Failed to Save',
        description: 'An error occurred while saving the post.'
      });
    }
  };

  // Double-tap implementation
  const handleDoubleTap = (post: any, idx: number) => {
    if (!savedIndices.has(idx)) {
      handleHeartPost(post, idx);
    }
    setShowHeartPop(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setShowHeartPop(prev => ({ ...prev, [idx]: false }));
    }, 800);
  };

  // Image click handles single tap for preview & double tap for hearting
  const handleImageClick = (post: any, idx: number, displaySrc: string) => {
    if (clickTimeoutRef.current[idx]) {
      clearTimeout(clickTimeoutRef.current[idx]);
      delete clickTimeoutRef.current[idx];
      handleDoubleTap(post, idx);
    } else {
      clickTimeoutRef.current[idx] = setTimeout(() => {
        delete clickTimeoutRef.current[idx];
        setPreviewPost(post);
        setPreviewIndex(idx);
        setCopiedText(false);
      }, 250);
    }
  };

  // Tinder swipes
  const handleSwipeRight = (idx: number) => {
    const post = generatedPosts[idx];
    handleHeartPost(post, idx);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeLeft = (idx: number) => {
    setGeneratedPosts(prev => prev.filter((_, i) => i !== idx));
    setSkippedCount(prev => prev + 1);
  };

  const handleDownloadImage = async (post: any) => {
    if (!post || !post.image) return;
    try {
      const src = imgSrc(post.image);
      if (src.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = src;
        link.download = `autopilot-${post.topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(src);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `autopilot-${post.topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Failed to download image:', e);
      window.open(imgSrc(post.image), '_blank');
    }
  };

  const handleBackToForm = () => {
    setStage('form');
    setGeneratedPosts([]);
    setCurrentIndex(0);
    setSkippedCount(0);
    setTotalGeneratedCount(0);
  };

  const handleExportAll = async () => {
    if (generatedPosts.length === 0) return;

    toast({
      title: 'Preparing Export',
      description: 'Bundling creatives into a ZIP file...'
    });

    try {
      const zip = new JSZip();

      const promises = generatedPosts.map(async (post, i) => {
        const src = imgSrc(post.image);
        let blob: Blob;
        if (src.startsWith('data:')) {
          const parts = src.split(',');
          const contentType = parts[0].split(':')[1].split(';')[0];
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let idx = 0; idx < rawLength; ++idx) {
            uInt8Array[idx] = raw.charCodeAt(idx);
          }
          blob = new Blob([uInt8Array], { type: contentType });
        } else {
          const res = await fetch(src);
          blob = await res.blob();
        }

        const fileName = `post-${i + 1}-${post.topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        zip.file(fileName, blob);
      });

      await Promise.all(promises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `autopilot-campaign-${brandName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful 🎉',
        description: 'Sprint campaign creatives downloaded as a ZIP folder.'
      });
    } catch (e) {
      console.error('Failed to export campaign as ZIP:', e);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while compiling the ZIP folder.'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4 select-none pt-4">
      {/* Header Bar */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-start gap-3">
          <button
            onClick={() => stage === 'results' ? handleBackToForm() : navigate('/dashboard/strategy')}
            className="p-2 rounded-xl hover:bg-muted transition mt-1 flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Sparkles size={11} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {stage === 'results' ? 'Fresh drop' : 'Campaign Studio'}
              </span>
            </div>
            {stage === 'results' ? (
              <>
                <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
                  Your{' '}
                  <span className="bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                    autopilot
                  </span>{' '}
                  drop is ready
                </h1>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
                  Generate a week of posts
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Pick a language, a week, and a product. We'll create {selectedWeeks * 7} posts — swipe to keep or skip.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Controls for Results Stage */}
        {stage === 'results' && (
          <div className="flex items-center gap-3">
            {/* Layout Toggle */}
            <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/60">
              <button
                onClick={() => setLayoutMode('swipe')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition',
                  layoutMode === 'swipe'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Flame size={12} /> Swipe
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition',
                  layoutMode === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid size={12} /> Grid
              </button>
            </div>

            <Button
              onClick={handleExportAll}
              variant="default"
              size="sm"
              className="rounded-xl text-xs font-bold gap-1.5 h-10 bg-primary text-white"
            >
              <Download size={13} /> Export all
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {/* STAGE 1: FORM WIZARD */}
        {stage === 'form' && (
          <div className="max-w-4xl mx-auto w-full mt-2 flex flex-col gap-6">

            {/* Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentStep('language')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition",
                  currentStep === 'language'
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                )}
              >
                <Globe size={16} />
                <span>Language <span className="opacity-70 font-normal">· {languages.find(l => l.id === selectedLanguage)?.label.split(' ')[0]}</span></span>
                {currentStep === 'language' && <ArrowRight size={14} className="ml-1 opacity-70" />}
              </button>
              <button
                onClick={() => setCurrentStep('week')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition",
                  currentStep === 'week'
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                )}
              >
                <Calendar size={16} />
                <span>Week <span className="opacity-70 font-normal">· Week {selectedWeeks}</span></span>
                {currentStep === 'week' && <ArrowRight size={14} className="ml-1 opacity-70" />}
              </button>
              <button
                onClick={() => setCurrentStep('product')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition",
                  currentStep === 'product'
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                )}
              >
                <Box size={16} />
                <span>Product <span className="opacity-70 font-normal">· {selectedProductIds.length > 0 ? `${selectedProductIds.length} Selected` : 'None'}</span></span>
              </button>
            </div>

            {/* Content Area */}
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">

              {currentStep === 'language' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Choose a language</h3>
                      <p className="text-sm text-muted-foreground mt-1">Captions, hooks and CTAs will speak this language.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {(profile?.location?.country?.toLowerCase() === 'nepal'
                      ? languages
                      : languages.filter(l => l.id !== 'nepali')
                    ).map((l) => {
                      const isSelected = selectedLanguage === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setSelectedLanguage(l.id);
                            setTimeout(() => setCurrentStep('week'), 200);
                          }}
                          className={cn(
                            "relative p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all group",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                          )}
                        >
                          <span className="text-2xl leading-none">{l.flag}</span>
                          <div>
                            <p className="text-sm font-bold text-foreground">{l.label.split(' ')[0]}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{l.id === 'english' ? 'EN' : l.id.slice(0, 2).toUpperCase()}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 'week' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Which week?</h3>
                      <p className="text-sm text-muted-foreground mt-1">Each week gets 7 unique posts.</p>
                    </div>
                    <button onClick={() => setCurrentStep('language')} className="text-sm font-bold text-muted-foreground hover:text-foreground">
                      ← Back
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(w => {
                      const isSelected = selectedWeeks === w;
                      return (
                        <button
                          key={w}
                          onClick={() => {
                            setSelectedWeeks(w);
                            setTimeout(() => setCurrentStep('product'), 200);
                          }}
                          className={cn(
                            "relative p-6 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                          )}
                        >
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Week</span>
                          <span className="text-4xl font-black text-foreground mb-4">{w}</span>
                          <span className="text-xs text-muted-foreground">{w * 7} posts - daily cadence</span>

                          {isSelected && (
                            <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 'product' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Pick a product</h3>
                      <p className="text-sm text-muted-foreground mt-1">This anchors the visual style and copy.</p>
                    </div>
                    <button onClick={() => setCurrentStep('week')} className="text-sm font-bold text-muted-foreground hover:text-foreground">
                      ← Back
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    {products.length > 0 && products.filter(p => selectedProductIds.includes(p._id)).map((prod) => {
                      return (
                        <button
                          key={prod._id}
                          onClick={() => setSelectedProductIds(prev => prev.filter(id => id !== prod._id))}
                          className="relative p-5 rounded-2xl border text-left flex flex-col gap-3 transition-all border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted/30">
                            <img src={imgSrc(prod.imageBase64 || (prod.imageUrls && prod.imageUrls[0]) || '')} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-bold text-foreground line-clamp-1">{prod.name}</span>

                          <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setShowProductModal(true)}
                      className="relative p-5 rounded-2xl border-2 border-dashed border-border text-center flex flex-col items-center justify-center gap-2 hover:bg-muted/50 hover:border-primary/40 transition-colors text-muted-foreground min-h-[120px]"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Plus size={16} />
                      </div>
                      <span className="text-xs font-bold text-foreground">Add New Product</span>
                    </button>
                  </div>

                  {/* Launch Section */}
                  <div className="pt-6 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="w-full sm:w-auto">
                        <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Total Cost</p>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-foreground leading-none">{cost}</span>
                          <span className="text-xs font-bold text-muted-foreground mb-0.5">credits</span>
                        </div>
                        {!isSufficientCredits && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1">Insufficient balance ({currentCredits} available)</p>
                        )}
                      </div>
                      <Button
                        onClick={handleLaunchAutopilot}
                        disabled={selectedProductIds.length === 0 || !isSufficientCredits}
                        className="w-full sm:w-[220px] rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold h-12 shadow-lg hover:shadow active:scale-[0.98] transition border-0 text-sm"
                      >
                        <Zap size={16} className="mr-2 fill-current text-white" />
                        Launch Sprint
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* STAGE 2: PROGRESS LOADER */}
        {stage === 'generating' && (
          <div className="min-h-[50vh] flex flex-col items-center justify-center py-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/70 to-primary/40 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6"
            >
              <Sparkles className="text-primary-foreground animate-pulse" size={32} />
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">
              Compiling Sprint Campaign 🚀
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm text-center mb-6 leading-relaxed">
              SyncSocio AI is planning topics, mapping products, and generating {selectedWeeks * 7} visual posts in parallel.
            </p>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-12 bg-muted/40 px-3 py-1.5 rounded-full border border-border/40">

            </p>
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Don't want to wait?</p>
                <Button
                  variant="outline"
                  className="rounded-full shadow-sm hover:shadow px-6 text-xs font-black uppercase tracking-wider"
                  onClick={() => {
                    setStage('form');
                    setCurrentTaskId(null);
                    navigate('/dashboard', { replace: true });
                  }}
                >
                  Run in background
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: RESULTS STAGE */}
        {stage === 'results' && (
          <div>
            {/* TINDER SWIPE VIEW */}
            {layoutMode === 'swipe' && (
              <div className="flex flex-col items-center pt-2 pb-2">
                {/* Tinder Stats Bar */}
                {currentIndex < generatedPosts.length && (
                  <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold text-muted-foreground select-none shrink-0">
                    <span>{Math.min(currentIndex + skippedCount + 1, totalGeneratedCount)}/{totalGeneratedCount}</span>
                    <span>skipped {skippedCount}</span>
                    <span className="flex items-center gap-1 text-rose-500">
                      <Heart size={12} className="fill-rose-500 text-rose-500" />
                      {savedIndices.size}
                    </span>
                  </div>
                )}

                <div className="relative w-full max-w-[340px] h-[440px] mb-2 shrink-0">
                  <AnimatePresence>
                    {generatedPosts.slice(currentIndex, currentIndex + 3).reverse().map((post, index, array) => {
                      const absoluteIdx = generatedPosts.indexOf(post);
                      const isTop = absoluteIdx === currentIndex;
                      const stackIndex = array.length - 1 - index;

                      return (
                        <TinderCard
                          key={absoluteIdx}
                          post={post}
                          index={absoluteIdx}
                          isTop={isTop}
                          stackIndex={stackIndex}
                          onSwipeRight={() => handleSwipeRight(absoluteIdx)}
                          onSwipeLeft={() => handleSwipeLeft(absoluteIdx)}
                          onImageClick={() => handleImageClick(post, absoluteIdx, post.image)}
                          isHearted={savedIndices.has(absoluteIdx)}
                          showHeartPop={showHeartPop[absoluteIdx]}
                          brandName={brandName}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {/* Empty Deck finish State */}
                  {currentIndex >= generatedPosts.length && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-3xl bg-card shadow-sm">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                      <h3 className="text-base font-bold text-foreground mb-1">Deck Reviewed! 🎉</h3>
                      <p className="text-xs text-muted-foreground mb-6 max-w-[200px]">
                        You've finished swiping all generated creatives.
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[180px]">
                        <Button onClick={() => { setLayoutMode('grid'); setCurrentIndex(0); }} variant="default" size="sm" className="rounded-xl text-xs w-full bg-primary">
                          View Grid Gallery
                        </Button>
                        <Button onClick={handleBackToForm} variant="outline" size="sm" className="rounded-xl text-xs w-full">
                          Create New
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Swipe controls */}
                {currentIndex < generatedPosts.length && (
                  <div className="flex items-center gap-6 mt-4 shrink-0">
                    <button
                      onClick={() => handleSwipeLeft(currentIndex)}
                      className="w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition active:scale-95 shrink-0"
                      title="Reject Post (Swipe Left)"
                    >
                      <X size={20} />
                    </button>

                    <button
                      onClick={() => handleDownloadImage(generatedPosts[currentIndex])}
                      className="w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition active:scale-95 shrink-0"
                      title="Download Image"
                    >
                      <Download size={15} />
                    </button>

                    <button
                      onClick={() => handleSwipeRight(currentIndex)}
                      className="w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition active:scale-95 shrink-0"
                      title="Save Post (Swipe Right)"
                    >
                      <Heart
                        size={20}
                        className="text-rose-500 fill-rose-500 transition-colors"
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GRID VIEW */}
            {layoutMode === 'grid' && (
              <div className="space-y-8 pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {generatedPosts.map((post, absoluteIdx) => {
                    const isHearted = savedIndices.has(absoluteIdx);
                    return (
                      <motion.div
                        key={absoluteIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (absoluteIdx % 8) * 0.05 }}
                        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col group relative"
                      >
                        {/* Brand Gradient Header */}
                        <div className="p-3 bg-muted/5 border-b border-border/40 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full p-[2px] bg-gradient-to-tr from-sky-400 via-indigo-500 to-fuchsia-500">
                              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                                <span className="text-[9px] font-black text-foreground">{brandName.slice(0, 2).toUpperCase() || 'SS'}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-foreground leading-tight">{brandName}</p>
                              <p className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">Sprint Drop</p>
                            </div>
                          </div>
                          {post.festival_name && (
                            <span className="bg-pink-500/10 text-pink-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-pink-500/20">
                              🎉 {post.festival_name}
                            </span>
                          )}
                        </div>

                        {/* Image Container */}
                        <div
                          onClick={() => handleImageClick(post, absoluteIdx, post.image)}
                          className="relative aspect-square w-full bg-muted/30 overflow-hidden shrink-0 border-b border-border/40 cursor-pointer"
                        >
                          {post.image ? (
                            <img src={imgSrc(post.image)} alt={post.topic} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <AlertCircle size={20} className="text-destructive/50" />
                              <span className="text-[10px] font-bold">Image generation failed</span>
                            </div>
                          )}

                          {/* Hover Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <p className="text-[10px] text-white/90 line-clamp-3 leading-normal font-medium mb-1 drop-shadow-sm">
                              {post.caption}
                            </p>
                          </div>

                          {/* Double-tap heart animation overlay */}
                          <AnimatePresence>
                            {showHeartPop[absoluteIdx] && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10"
                              >
                                <Heart className="w-16 h-16 text-rose-500 fill-rose-500 filter drop-shadow-md" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Card Details */}
                        <div className="p-3 flex-1 flex flex-col justify-between gap-3 min-h-0">
                          <div className="min-h-0">
                            <h4 className="text-xs font-bold text-foreground leading-snug truncate">{post.topic}</h4>
                          </div>

                          {/* Controls */}
                          <div className="flex gap-2 border-t border-border/30 pt-2 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(post.caption);
                                toast({ title: 'Copied!', description: 'Post caption copied to clipboard.' });
                              }}
                              className="flex-1 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted/80 text-muted-foreground text-[9px] font-bold flex items-center justify-center gap-1 transition"
                            >
                              <Copy size={9} /> Copy Caption
                            </button>
                            <button
                              onClick={() => handleHeartPost(post, absoluteIdx)}
                              className={cn(
                                'flex-1 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition border',
                                isHearted
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                              )}
                            >
                              <Heart size={9} className={cn(isHearted && 'fill-rose-500 text-rose-500')} />
                              {isHearted ? 'Saved' : 'Heart'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX / PREVIEW MODAL */}
      <AnimatePresence>
        {previewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
            onClick={() => { setPreviewPost(null); setCopiedText(false); }}
          >
            <button
              onClick={() => { setPreviewPost(null); setCopiedText(false); }}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-[110]"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-4xl max-h-[85vh] md:h-[70vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-card flex flex-col md:flex-row cursor-default animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Panel: visual */}
              <div className="flex-1 bg-black/95 flex items-center justify-center p-4 relative min-h-[40vh] md:min-h-0">
                <img
                  src={imgSrc(previewPost.image)}
                  alt="Preview"
                  className="w-full h-auto max-h-[60vh] md:max-h-[65vh] object-contain max-w-full"
                />
              </div>

              {/* Right Panel: Caption and hashtags */}
              <div className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-border/60 flex flex-col bg-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Details</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewPost.caption || '');
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition",
                      copiedText
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                    )}
                  >
                    {copiedText ? (
                      <>
                        <Check size={11} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 select-text custom-scrollbar">
                  <h4 className="text-sm font-bold text-foreground mb-2">{previewPost.topic}</h4>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {previewPost.caption || "No caption generated."}
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="p-4 border-t border-border/50 bg-muted/10 flex gap-2">
                  <Button
                    onClick={() => handleDownloadImage(previewPost)}
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs"
                  >
                    <Download size={13} className="mr-1.5" /> Download
                  </Button>
                  <Button
                    onClick={() => {
                      if (previewIndex !== null && !savedIndices.has(previewIndex)) {
                        handleHeartPost(previewPost, previewIndex);
                      }
                    }}
                    variant={previewIndex !== null && savedIndices.has(previewIndex) ? "secondary" : "default"}
                    size="sm"
                    className={cn(
                      "flex-1 rounded-xl text-xs",
                      previewIndex !== null && !savedIndices.has(previewIndex) && "bg-rose-500 hover:bg-rose-600 text-white"
                    )}
                  >
                    <Heart size={13} className={cn("mr-1.5", previewIndex !== null && savedIndices.has(previewIndex) && "fill-rose-500 text-rose-500")} />
                    {previewIndex !== null && savedIndices.has(previewIndex) ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Product Selection Modal ─── */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowProductModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag size={18} className="text-primary" /> Select Products
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick up to {Math.max(1, Math.floor((selectedWeeks * 7) / 2))} products. SyncSocio will anchor generations to these.
                  </p>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                {productsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-muted/60 h-[100px] animate-pulse"></div>
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">Your product catalog is empty.</p>
                    <p className="text-xs mt-1">Please add products in the catalog to use Sprint.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((p) => {
                      const selected = selectedProductIds.includes(p._id);
                      const disabled = !selected && selectedProductIds.length >= Math.max(1, Math.floor((selectedWeeks * 7) / 2));
                      return (
                        <button
                          key={p._id}
                          onClick={() => handleToggleProduct(p._id)}
                          disabled={disabled}
                          className={cn(
                            'text-left relative p-3 rounded-2xl border transition overflow-hidden bg-card hover:bg-muted/30',
                            selected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                              : disabled ? 'border-border/40 opacity-50 cursor-not-allowed'
                                : 'border-border hover:border-primary/40'
                          )}
                        >
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative border border-border/50">
                            {p.imageBase64 || (p.imageUrls && p.imageUrls.length > 0) ? (
                              <img src={imgSrc(p.imageBase64 || p.imageUrls?.[0] || "")} alt={p.name} className="w-full h-full object-contain p-2" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package className="text-muted-foreground/30" /></div>
                            )}
                            {selected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm">
                                <CheckCircle2 size={12} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-bold text-foreground leading-tight truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">{p.description || 'No description'}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border/50 shrink-0 flex items-center justify-between bg-card rounded-b-3xl">
                <p className="text-xs font-semibold text-muted-foreground">
                  <span className={cn(selectedProductIds.length === Math.max(1, Math.floor((selectedWeeks * 7) / 2)) ? 'text-primary' : 'text-foreground')}>
                    {selectedProductIds.length}
                  </span> / {Math.max(1, Math.floor((selectedWeeks * 7) / 2))} selected
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds([])} className="text-xs">Clear</Button>
                  <Button onClick={() => setShowProductModal(false)} className="rounded-xl px-6 h-9 text-xs">Done</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

