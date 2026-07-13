import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Image as ImageIcon, Layers, Video, Sparkles, RefreshCw, Download, Eye, X, Copy, Check, Calendar, Clock, Send, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Masonry from 'react-masonry-css';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { getFriendlyErrorMessage } from '@/lib/errorHandler';


const breakpointColumnsObj = {
  default: 4,
  1280: 3,
  1024: 2,
  640: 1
};

interface IconProps {
  size?: number;
  className?: string;
}

const FacebookIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const CACHE_KEY = 'syncsocio_strategy_assets';

const aspectClass: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '2:3': 'aspect-[2/3]',
};

function imgSrc(b64: string | null | undefined) {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http') || b64.startsWith('blob:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

// Simple IndexedDB helper for caching large datasets
const dbName = 'SyncSocioAssetCache';
const storeName = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setCache(key: string, val: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(val, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[Cache] IndexedDB set failed:', e);
  }
}

async function getCache(key: string): Promise<any> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[Cache] IndexedDB get failed:', e);
    return null;
  }
}

async function removeCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[Cache] IndexedDB delete failed:', e);
  }
}

const typeIcon: Record<string, any> = {
  image: ImageIcon,
  carousel: Layers,
  video: Video,
  scheduled: Clock,
  draft: FileText,
};

const AssetLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startBackgroundSchedule } = useOutletContext<{
    startBackgroundSchedule?: (postIds: string[], platforms: any, schedules?: any[], startDate?: string, endDate?: string) => Promise<string>;
  }>() || {};
  const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
  const brandId = profile._id || 'default';
  const cacheKey = `syncsocio_strategy_assets_${brandId}`;

  // Enforce scheduled posts limits based on plan
  const planName = (profile.userPlan || profile.selectedPlan || '').toLowerCase();
  const isElite = planName.includes('elite');
  const scheduleLimit = isElite ? Infinity : 30;

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);


  // Count active scheduled assets (posts waiting in queue to be published)
  const activeScheduledCount = React.useMemo(() => {
    const now = new Date();
    return assets.filter(a => a.status === 'scheduled' && (!a.scheduledAt || new Date(a.scheduledAt) > now)).length;
  }, [assets]);

  const validateScheduleLimit = (schedules: { scheduledAt: string }[]): boolean => {
    if (isElite) return true;

    // Count how many are currently active in the queue
    const currentActiveCount = activeScheduledCount;
    const newSchedulesCount = schedules.length;

    if (currentActiveCount + newSchedulesCount > 30) {
      toast({
        title: "Queue Limit Reached",
        description: `Your Starter plan allows up to 30 scheduled posts in your active queue. You currently have ${currentActiveCount} scheduled, and you are trying to schedule ${newSchedulesCount} more. Please upgrade to the Elite plan for unlimited queue size.`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fetchingRecommendations, setFetchingRecommendations] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 8);
    return nextWeek.toISOString().split('T')[0];
  });
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false });
  const [schedulingInProgress, setSchedulingInProgress] = useState<boolean>(false);



  useEffect(() => {
    const loadCached = async () => {
      const cached = await getCache(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setAssets(cached);
        setLoading(false);
      }
    };
    loadCached();
  }, [cacheKey]);
  const [filter, setFilter] = useState<'all' | 'image' | 'carousel' | 'video' | 'scheduled' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);
  const [previewSlide, setPreviewSlide] = useState<number>(0);
  const [copiedAsset, setCopiedAsset] = useState<boolean>(false);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/strategy-assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const serverCreatives = data.creatives || [];

        // Use server creatives as the source of truth
        // (Caching is only used for initial instant-load, not merging)
        const uniqueCreatives = serverCreatives;

        setAssets(uniqueCreatives);
        await setCache(cacheKey, uniqueCreatives);
      }
    } catch (err) {
      console.error('[Assets] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);



  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleFetchRecommendations = async () => {
    if (selectedAssetIds.length === 0) return;
    setFetchingRecommendations(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/posts/recommend-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          postIds: selectedAssetIds,
          startDate,
          endDate,
          platforms
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch schedule recommendations');
      }

      const data = await res.json();
      const formatted = (data.recommendations || []).map((r: any) => {
        let localDateTime = '';
        if (r.scheduledAt) {
          try {
            const d = new Date(r.scheduledAt);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            localDateTime = `${year}-${month}-${date}T${hours}:${minutes}`;
          } catch {
            localDateTime = r.scheduledAt.substring(0, 16);
          }
        }
        return { ...r, scheduledAtLocal: localDateTime };
      });
      setRecommendations(formatted);
      setModalStep(1);
    } catch (err: any) {
      console.error('[Schedule] Fetch recommendations error:', err);
      alert(getFriendlyErrorMessage(err));
    } finally {
      setFetchingRecommendations(false);
    }
  };

  const handleSmartScheduleSubmit = async (finalRecommendations: any[]) => {
    if (selectedAssetIds.length === 0) return;
    try {
      const schedules = finalRecommendations.map(r => {
        let isoStr = r.scheduledAt;
        if (r.scheduledAtLocal) {
          try {
            isoStr = new Date(r.scheduledAtLocal).toISOString();
          } catch { }
        }
        return {
          id: r.id,
          scheduledAt: isoStr
        };
      });

      if (!validateScheduleLimit(schedules)) return;

      if (startBackgroundSchedule) {
        startBackgroundSchedule(selectedAssetIds, platforms, schedules, startDate, endDate);
      }

      setSelectionMode(false);
      setSelectedAssetIds([]);
      setShowScheduleModal(false);
      setModalStep(0);
      setRecommendations([]);

    } catch (err: any) {
      console.error('[Schedule] smart schedule error:', err);
      alert(getFriendlyErrorMessage(err));
    }
  };

  const handlePostNow = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      const schedules = selectedAssetIds.map(id => ({
        id,
        scheduledAt: new Date().toISOString()
      }));

      if (!validateScheduleLimit(schedules)) return;

      if (startBackgroundSchedule) {
        startBackgroundSchedule(selectedAssetIds, platforms, schedules, undefined, undefined);
      }

      setSelectionMode(false);
      setSelectedAssetIds([]);
      setShowScheduleModal(false);
      setModalStep(0);
      setRecommendations([]);
    } catch (err: any) {
      console.error('[PostNow] error:', err);
      alert(getFriendlyErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    const originalAssets = [...assets];
    const updated = assets.filter((a) => a._id !== id);
    setAssets(updated);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/strategy-assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await setCache(cacheKey, updated);
    } catch (err) {
      console.error('[Assets] Delete error:', err);
      setAssets(originalAssets);
    }
  };

  const downloadSingleFile = async (srcUrl: string, filename: string) => {
    try {
      if (srcUrl.startsWith('http') || srcUrl.startsWith('/') || srcUrl.startsWith('blob:') || srcUrl.startsWith('data:')) {
        const response = await fetch(srcUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        const link = document.createElement('a');
        link.href = srcUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to download single file:', err);
      const link = document.createElement('a');
      link.href = srcUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownload = async (asset: any) => {
    if (asset.type === 'carousel' && asset.slides && asset.slides.length > 0) {
      try {
        const zip = new JSZip();
        toast({
          title: "Preparing Download",
          description: `Packaging ${asset.slides.length} slides into a ZIP...`,
        });

        for (let i = 0; i < asset.slides.length; i++) {
          const slide = asset.slides[i];
          const slideSrc = imgSrc(slide.image);
          const response = await fetch(slideSrc);
          const blobData = await response.blob();

          let extension = 'jpg';
          if (blobData.type === 'image/png') extension = 'png';
          else if (blobData.type === 'image/webp') extension = 'webp';
          else if (blobData.type === 'image/gif') extension = 'gif';

          zip.file(`slide_${i + 1}.${extension}`, blobData);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `syncsocio-creative-${asset._id?.slice(-6) || 'export'}.zip`;
        const blobUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast({
          title: "Download Started",
          description: "Your carousel ZIP has been downloaded successfully.",
        });
      } catch (err) {
        console.error('Failed to generate ZIP for carousel:', err);
        toast({
          title: "Download Failed",
          description: "Could not create ZIP. Downloading the first slide instead.",
          variant: "destructive"
        });
        const firstSrc = imgSrc(asset.slides[0].image);
        await downloadSingleFile(firstSrc, `syncsocio-creative-${asset._id?.slice(-6) || 'export'}_slide_1.jpg`);
      }
      return;
    }

    const isVideo = asset.type === 'video';
    const src = isVideo ? (asset.videoUrl || asset.thumbnailBase64)
      : asset.type === 'image' ? asset.thumbnailBase64
        : asset.type === 'carousel' ? asset.slides?.[0]?.image
          : asset.thumbnailBase64;
    if (!src) return;

    const srcUrl = isVideo && asset.videoUrl ? asset.videoUrl : imgSrc(src);
    const filename = `syncsocio-creative-${asset._id?.slice(-6) || 'export'}.${isVideo && asset.videoUrl ? 'mp4' : 'jpg'}`;

    await downloadSingleFile(srcUrl, filename);
  };

  const filtered = (
    filter === 'all'
      ? assets.filter((a) => a.status !== 'draft')
      : filter === 'scheduled'
        ? assets.filter((a) => a.status === 'scheduled' || a.status === 'posted' || a.status === 'published')
        : filter === 'draft'
          ? assets.filter((a) => a.status === 'draft')
          : assets.filter((a) => a.type === filter && a.status !== 'draft')
  )
    .slice()
    .sort((a, b) => {
      const aDone = a.status === 'scheduled' || a.status === 'posted' || a.status === 'published';
      const bDone = b.status === 'scheduled' || b.status === 'posted' || b.status === 'published';
      if (a.status === 'draft' && b.status !== 'draft') return -1;
      if (a.status !== 'draft' && b.status === 'draft') return 1;
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;

      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  // Handle arrow key navigation for asset preview
  useEffect(() => {
    if (!previewAsset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Find current index
      const currentIndex = filtered.findIndex(a => a._id === previewAsset._id);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowLeft') {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filtered.length - 1;
        setPreviewAsset(filtered[prevIndex]);
        setPreviewSlide(0); // Reset slide if it's a carousel
      } else if (e.key === 'ArrowRight') {
        const nextIndex = currentIndex < filtered.length - 1 ? currentIndex + 1 : 0;
        setPreviewAsset(filtered[nextIndex]);
        setPreviewSlide(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAsset, filtered]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 mb-3">
          <Heart size={12} className="text-rose-500 fill-rose-500" />
          <span className="text-[11px] font-semibold text-rose-500">Creative Library</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">Your hearted AI-generated creatives — saved and ready to deploy.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide w-full pb-2 scroll-smooth select-none shrink-0">
        {(['all', 'image', 'carousel', 'video', 'draft', 'scheduled'] as const).map((f) => {
          const Icon = f === 'all' ? Sparkles : typeIcon[f];
          const label = f === 'scheduled'
            ? `Scheduled & Posted ${scheduleLimit !== Infinity ? `(${activeScheduledCount}/30)` : ''}`
            : f === 'draft'
              ? 'Draft Emails'
              : f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition capitalize shrink-0',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <Icon size={12} />
              {label}
              {f !== 'all' && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                  filter === f ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {f === 'scheduled'
                    ? assets.filter((a) => a.status === 'scheduled' || a.status === 'posted' || a.status === 'published').length
                    : f === 'draft'
                      ? assets.filter((a) => a.status === 'draft').length
                      : assets.filter((a) => a.type === f && a.status !== 'draft').length}
                </span>
              )}
            </button>
          );
        })}
        {assets.length > 0 && (
          <Button
            onClick={() => {
              if (!profile?.instagramIsConnected && !selectionMode) {
                navigate('/setup?step=1');
                return;
              }
              setSelectionMode(!selectionMode);
              setSelectedAssetIds([]);
            }}
            variant={selectionMode ? "destructive" : "default"}
            className={cn(
              "ml-auto flex items-center gap-1.5 h-9 rounded-xl text-xs font-semibold px-3.5 shrink-0",
              !selectionMode && "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20"
            )}
          >
            <Calendar size={13} />
            {selectionMode ? 'Cancel Selection' : 'Schedule Posts'}
          </Button>
        )}
        <button
          onClick={fetchAssets}
          disabled={loading}
          className={cn("p-2 rounded-xl text-muted-foreground hover:bg-muted transition shrink-0", assets.length === 0 && "ml-auto", loading && "opacity-50 cursor-not-allowed")}
          title="Refresh"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin text-primary")} />
        </button>
      </div>

      {/* Content */}
      {loading && assets.length === 0 ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading creatives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-5">
            <Heart size={32} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {filter === 'all' ? 'No saved creatives yet' : `No ${filter}s saved yet`}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Go to Strategy, generate some posts, and heart the ones you love — they'll appear here.
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {filtered.map((asset, i) => {
              const aspect = asset.aspectRatio || '1:1';
              const thumbSrc = asset.type === 'carousel'
                ? imgSrc(asset.slides?.[0]?.image)
                : imgSrc(asset.thumbnailBase64);
              const Icon = asset.status === 'draft' ? typeIcon.draft : (typeIcon[asset.type] || ImageIcon);

              const isSelected = selectedAssetIds.includes(asset._id);
              const isScheduled = asset.status === 'scheduled' && (!asset.scheduledAt || new Date(asset.scheduledAt) > new Date());
              const isPosted = asset.status === 'posted' || asset.status === 'published' || (asset.status === 'scheduled' && asset.scheduledAt && new Date(asset.scheduledAt) <= new Date());

              return (
                <motion.div
                  key={asset._id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer",
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/60",
                    (isScheduled || isPosted) && selectionMode && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (selectionMode) {
                      if (isScheduled || isPosted) return;
                      if (isSelected) {
                        setSelectedAssetIds(selectedAssetIds.filter(id => id !== asset._id));
                      } else {
                        setSelectedAssetIds([...selectedAssetIds, asset._id]);
                      }
                    } else {
                      if (asset.status === 'draft') {
                        navigate(`/dashboard/strategy?draftId=${asset._id}`);
                      } else {
                        setPreviewAsset(asset);
                        setPreviewSlide(0);
                      }
                    }
                  }}
                >
                  {/* Selection Mode Checkbox Overlay */}
                  {selectionMode && !(isScheduled || isPosted) && (
                    <div className={cn(
                      "absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow shadow-primary/25 scale-105"
                        : "bg-black/30 border-white/60 text-transparent"
                    )}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}

                  {/* Thumbnail wrapper */}
                  <div className="relative bg-muted overflow-hidden flex items-center justify-center min-h-[200px]">
                    {asset.type === 'video' && asset.videoUrl ? (
                      <video
                        src={`${asset.videoUrl}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-auto block"
                      />
                    ) : thumbSrc ? (
                      <img src={thumbSrc} alt="" className="w-full h-auto block" loading="lazy" />
                    ) : (
                      <Icon size={24} className="text-muted-foreground/30" />
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-foreground/60 backdrop-blur-md text-background text-[9px] font-bold px-2 py-1 rounded-full capitalize z-10">
                      <Icon size={9} />
                      {asset.status === 'draft' ? 'Email Draft' : asset.type}
                    </div>

                    {/* Scheduled / Posted Badge */}
                    {isScheduled && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow z-10">
                        <Clock size={9} />
                        Scheduled
                      </div>
                    )}
                    {isPosted && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow z-10">
                        <Check size={9} strokeWidth={3} />
                        Posted
                      </div>
                    )}

                    {/* Hover overlay with actions - only visible if not in selection mode */}
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                        {asset.status === 'draft' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/strategy?draftId=${asset._id}`);
                            }}
                            className="w-11 h-11 rounded-full bg-blue-500/80 backdrop-blur-md text-white hover:bg-blue-500 hover:scale-105 transition flex items-center justify-center shadow-lg"
                            title="Load into Campaigns to send"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(asset);
                          }}
                          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 hover:scale-105 transition flex items-center justify-center shadow-lg"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              disabled={deleting === asset._id}
                              className="w-11 h-11 rounded-full bg-rose-500/80 backdrop-blur-md text-white hover:bg-rose-500 hover:scale-105 transition flex items-center justify-center shadow-lg"
                              title="Remove from library"
                            >
                              {deleting === asset._id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this creative from your library? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(asset._id);
                                }}
                                className="bg-rose-500 hover:bg-rose-600"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="p-3">
                    <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">
                      {(() => {
                        if (asset.status === 'draft') {
                          try {
                            const parsed = JSON.parse(asset.caption);
                            return parsed.subject ? `Subject: ${parsed.subject} — ${parsed.body}` : parsed.body || asset.caption;
                          } catch (e) { }
                        }
                        return asset.caption;
                      })()}
                    </p>
                    {asset.idea && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">"{asset.idea}"</p>
                    )}
                    <p className="text-[9px] text-muted-foreground/50 mt-1.5">
                      {new Date(asset.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </Masonry>
        </AnimatePresence>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-8">
          {filtered.length} creative{filtered.length > 1 ? 's' : ''} in your library
        </p>
      )}

      {/* Lightbox / Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
            onClick={() => { setPreviewAsset(null); setCopiedAsset(false); }}
          >
            <button
              onClick={() => { setPreviewAsset(null); setCopiedAsset(false); }}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition shadow-lg z-50"
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
              {/* Left panel: Media */}
              <div className="flex-1 bg-black/95 flex items-center justify-center p-4 relative min-h-[40vh] md:min-h-0">
                {previewAsset.type === 'video' && previewAsset.videoUrl ? (
                  <video
                    src={previewAsset.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-auto max-h-[60vh] md:max-h-[65vh] object-contain max-w-full"
                  />
                ) : previewAsset.type === 'carousel' && previewAsset.slides?.length > 0 ? (
                  <div className="relative flex flex-col items-center justify-center w-full">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={previewSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                        src={imgSrc(previewAsset.slides[previewSlide]?.image)}
                        alt={`Slide ${previewSlide + 1}`}
                        className="w-full h-auto max-h-[55vh] md:max-h-[60vh] object-contain max-w-full cursor-grab active:cursor-grabbing"
                        loading="lazy"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset }) => {
                          if (offset.x < -40) {
                            setPreviewSlide(prev => (prev < previewAsset.slides.length - 1 ? prev + 1 : 0));
                          } else if (offset.x > 40) {
                            setPreviewSlide(prev => (prev > 0 ? prev - 1 : previewAsset.slides.length - 1));
                          }
                        }}
                      />
                    </AnimatePresence>
                    {/* Navigation dots */}
                    {previewAsset.slides.length > 1 && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                        {previewAsset.slides.map((_: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setPreviewSlide(idx)}
                            className={cn(
                              'w-2 h-2 rounded-full transition-all',
                              idx === previewSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {/* Left/Right arrows for carousel */}
                    {previewAsset.slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setPreviewSlide(prev => (prev > 0 ? prev - 1 : previewAsset.slides.length - 1))}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setPreviewSlide(prev => (prev < previewAsset.slides.length - 1 ? prev + 1 : 0))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl"
                        >
                          ›
                        </button>
                      </>
                    )}
                    {/* Counter badge */}
                    <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      {previewSlide + 1} / {previewAsset.slides.length}
                    </div>
                  </div>
                ) : (
                  <img
                    src={imgSrc(previewAsset.thumbnailBase64)}
                    alt="Preview"
                    className="w-full h-auto max-h-[60vh] md:max-h-[65vh] object-contain max-w-full"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Right panel: Caption & Hashtags */}
              <div className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-border/60 flex flex-col bg-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {previewAsset.status === 'draft' ? 'Email Draft Content' : 'Instagram Post Caption'}
                  </span>
                  <button
                    onClick={() => {
                      let text = previewAsset.caption || '';
                      if (previewAsset.status === 'draft') {
                        try {
                          const parsed = JSON.parse(previewAsset.caption);
                          text = `Subject: ${parsed.subject || ''}\n\n${parsed.body || ''}`;
                        } catch (e) { }
                      }
                      navigator.clipboard.writeText(text);
                      setCopiedAsset(true);
                      setTimeout(() => setCopiedAsset(false), 2000);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition",
                      copiedAsset
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                    )}
                  >
                    {copiedAsset ? (
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
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      if (previewAsset.status === 'draft') {
                        try {
                          const parsed = JSON.parse(previewAsset.caption);
                          return `Subject: ${parsed.subject || ''}\n\n${parsed.body || ''}`;
                        } catch (e) { }
                      }
                      return previewAsset.caption || "No caption generated.";
                    })()}
                  </p>
                </div>
                {previewAsset.status === 'draft' && (
                  <div className="p-4 border-t border-border/50 bg-muted/10">
                    <Button
                      onClick={() => {
                        setPreviewAsset(null);
                        navigate(`/dashboard/strategy?draftId=${previewAsset._id}`);
                      }}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-md border-0"
                    >
                      <Send size={12} />
                      Load into Campaigns to send
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar for Selection Mode */}
      <AnimatePresence>
        {selectionMode && selectedAssetIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-background/80 backdrop-blur-lg border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6"
          >
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-800">
              <span className="text-rose-500 font-bold text-sm mr-1">{selectedAssetIds.length}</span>
              creative{selectedAssetIds.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">

              <Button
                size="sm"
                onClick={() => setShowScheduleModal(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl px-4 h-9 shadow-md shadow-rose-500/15 border-0"
              >
                Schedule Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedAssetIds([]);
                }}
                className="text-xs rounded-xl px-3 h-9 border-border bg-card"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={cn(
                "w-full bg-card border border-border rounded-3xl p-6 shadow-2xl relative transition-all duration-300",
                modalStep === 0 ? "max-w-md" : "max-w-xl"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setModalStep(0);
                  setRecommendations([]);
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition"
              >
                <X size={18} />
              </button>

              {modalStep === 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground font-display">Smart Schedule Posts</h3>
                  </div>

                  <p className="text-xs text-muted-foreground mb-5">
                    Our scheduler agent will analyze follower activity peaks and distribute your {selectedAssetIds.length} posts optimally.
                  </p>

                  {/* Platforms */}
                  <div className="mb-5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Publish To</label>
                    <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-muted/20 border border-border w-full">
                      {(["instagram", "facebook"] as const).map((p) => {
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
                            aria-pressed={active}
                            className={cn(
                              "flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex-1",
                              active
                                ? p === "facebook"
                                  ? "bg-[#1877F2] text-white shadow-lg shadow-blue-500/20 border-0"
                                  : "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg shadow-rose-500/20 border-0"
                                : "bg-transparent text-muted-foreground hover:text-foreground border-0 hover:bg-muted/40",
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

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePostNow}
                      disabled={fetchingRecommendations || (!platforms.instagram && !platforms.facebook)}
                      className="bg-emerald-500 hover:bg-emerald-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-emerald-500/20 px-6"
                    >
                      Post Now
                    </Button>
                    <Button
                      onClick={handleFetchRecommendations}
                      disabled={fetchingRecommendations || (!platforms.instagram && !platforms.facebook)}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-rose-500/20"
                    >
                      {fetchingRecommendations ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Planning...</span>
                        </div>
                      ) : (
                        <span>Get AI Recommendations</span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowScheduleModal(false)}
                      disabled={fetchingRecommendations}
                      className="px-4 h-11 text-xs font-semibold rounded-xl border-border bg-card"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground font-display">Review & Adjust Schedule</h3>
                  </div>

                  <p className="text-xs text-muted-foreground mb-5">
                    Review or edit the dates/times calculated by the scheduler agent before finalizing.
                  </p>

                  {/* Recommendations Scrollable List */}
                  <div className="max-h-[50vh] overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                    {recommendations.map((rec, index) => {
                      const Icon = typeIcon[rec.type] || ImageIcon;
                      return (
                        <div
                          key={rec.id}
                          className="p-5 rounded-2xl border border-slate-200/80 space-y-4 transition-all duration-200 shadow-sm"
                          style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                        >
                          <div className="flex gap-4 items-start">
                            {/* Media thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center shadow-sm">
                              {rec.thumbnailBase64 ? (
                                <img src={imgSrc(rec.thumbnailBase64)} alt="post preview" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <Icon size={20} className="text-slate-400" />
                              )}
                            </div>

                            {/* Caption / description preview */}
                            <div className="flex-1 min-w-0">
                              <span
                                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1.5"
                                style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}
                              >
                                {rec.type}
                              </span>
                              <p className="text-xs text-slate-800 font-semibold line-clamp-2 leading-relaxed">
                                {rec.caption || rec.idea || 'Skincare Creative'}
                              </p>
                            </div>
                          </div>

                          {/* Editable scheduled date/time input */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-3.5 border-t border-slate-200/80">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-1">
                              Post Time
                            </label>
                            <input
                              type="datetime-local"
                              value={rec.scheduledAtLocal || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRecommendations(prev =>
                                  prev.map((item, idx) =>
                                    idx === index ? { ...item, scheduledAtLocal: val } : item
                                  )
                                );
                              }}
                              className="w-full sm:col-span-2 text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold"
                              style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                            />
                          </div>

                          {/* Rationale reason */}
                          {rec.reason && (
                            <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200/80 pt-3 font-medium flex gap-2 items-start">
                              <span className="shrink-0 text-amber-500 text-xs">💡</span>
                              <span>{rec.reason}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 1 Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSmartScheduleSubmit(recommendations)}
                      disabled={schedulingInProgress || recommendations.some(r => !r.scheduledAtLocal)}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-rose-500/20"
                    >
                      {schedulingInProgress ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Scheduling...</span>
                        </div>
                      ) : (
                        <span>Confirm & Schedule</span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setModalStep(0)}
                      disabled={schedulingInProgress}
                      className="px-4 h-11 text-xs font-semibold rounded-xl border-border bg-card"
                    >
                      Back
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetLibrary;
