import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Trash2, Image as ImageIcon, Layers, Video, Sparkles, RefreshCw,
  Download, Eye, X, Copy, Check, Calendar, Clock, Send, FileText, Camera,
  ChevronDown,
} from 'lucide-react';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const breakpointColumnsObj = { default: 3, 1024: 2, 640: 1 };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const PAGE_SIZE = 24;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  _id: string;
  type: 'image' | 'carousel' | 'video' | 'photoshoot' | 'draft' | string;
  status: 'active' | 'scheduled' | 'posted' | 'published' | 'draft' | string;
  thumbnailBase64?: string;
  slides?: { image: string }[];
  videoUrl?: string;
  aspectRatio?: string;
  caption?: string;
  idea?: string;
  createdAt?: string;
  scheduledAt?: string;
}

interface FilterCounts {
  image: number;
  carousel: number;
  video: number;
  photoshoot: number;
  scheduled: number;
  draft: number;
}

type FilterKey = 'all' | 'image' | 'carousel' | 'video' | 'photoshoot' | 'scheduled' | 'draft';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

interface IconProps { size?: number; className?: string }

const FacebookIcon: React.FC<IconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon: React.FC<IconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// ─── Type icon map ─────────────────────────────────────────────────────────────

const typeIcon: Record<string, React.FC<IconProps>> = {
  image: ImageIcon,
  carousel: Layers,
  video: Video,
  photoshoot: Camera,
  scheduled: Clock,
  draft: FileText,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const aspectClass: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '2:3': 'aspect-[2/3]',
};

function imgSrc(b64: string | null | undefined): string {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http') || b64.startsWith('blob:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

// ─── IndexedDB cache ──────────────────────────────────────────────────────────

const dbName = 'SyncSocioAssetCache';
const storeName = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setCache(key: string, val: unknown): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(val, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.error('[Cache] IndexedDB set failed:', e); }
}

async function getCache(key: string): Promise<unknown> {
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

// ─── LazyImage ─────────────────────────────────────────────────────────────────
// Uses IntersectionObserver to defer network requests until image is ~300px from
// the viewport. Shows an animated shimmer placeholder until the image decodes.

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  minHeight?: number;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt = '', className, minHeight = 180 }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !src) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ minHeight: loaded ? undefined : minHeight }}>
      {/* Shimmer placeholder */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.6) 50%, hsl(var(--muted)) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn('w-full h-auto block transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

// ─── SkeletonGrid ─────────────────────────────────────────────────────────────
// Masonry-shaped skeleton shown during initial load, before any cached data.

const SKELETON_HEIGHTS = [240, 320, 200, 280, 220, 300];

const SkeletonGrid: React.FC = () => (
  <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
    {SKELETON_HEIGHTS.map((h, i) => (
      <div
        key={i}
        className="rounded-2xl overflow-hidden border border-border/40 bg-card mb-4"
        style={{ height: h }}
      >
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.4s ${i * 0.15}s infinite`,
          }}
        />
      </div>
    ))}
  </Masonry>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AssetLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startBackgroundSchedule } = useOutletContext<{
    startBackgroundSchedule?: (postIds: string[], platforms: Record<string, boolean>, schedules?: Record<string, string>[], startDate?: string, endDate?: string) => Promise<string>;
  }>() || {};

  const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
  const brandId = profile._id || 'default';
  const cacheKey = `syncsocio_strategy_assets_${brandId}`;

  // Plan gating
  const planName = (profile.userPlan || profile.selectedPlan || '').toLowerCase();
  const isUnlimitedSchedule = planName.includes('growth') || planName.includes('pro') || planName.includes('elite') || planName.includes('agency');

  // ─── Core state ──────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [previewSlide, setPreviewSlide] = useState<number>(0);
  const [copiedAsset, setCopiedAsset] = useState<boolean>(false);

  // ─── Selection & schedule state ───────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<Record<string, string>[]>([]);
  const [fetchingRecommendations, setFetchingRecommendations] = useState<boolean>(false);
  const [schedulingInProgress, setSchedulingInProgress] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 8); return d.toISOString().split('T')[0];
  });
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false });

  // ─── AbortController ref for fetch cleanup ────────────────────────────────
  const abortRef = useRef<AbortController | null>(null);

  // Abort on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ─── Load from IndexedDB cache instantly on mount ─────────────────────────
  useEffect(() => {
    (async () => {
      const cached = await getCache(cacheKey);
      if (cached && Array.isArray(cached) && (cached as Asset[]).length > 0) {
        setAssets(cached as Asset[]);
        setLoading(false);
      }
    })();
  }, [cacheKey]);

  // ─── Fetch assets (server is source of truth) ────────────────────────────
  const fetchAssets = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/strategy-assets`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const serverCreatives: Asset[] = data.creatives || [];
      setAssets(serverCreatives);
      await setCache(cacheKey, serverCreatives);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[Assets] Fetch error:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // ─── Derived: activeScheduledCount ────────────────────────────────────────
  const activeScheduledCount = useMemo(() => {
    const now = new Date();
    return assets.filter(a => a.status === 'scheduled' && (!a.scheduledAt || new Date(a.scheduledAt) > now)).length;
  }, [assets]);

  // ─── Derived: filtered + sorted (memoized) ────────────────────────────────
  const filtered = useMemo<Asset[]>(() => {
    let result: Asset[];
    switch (filter) {
      case 'all':
        result = assets.filter(a => a.status !== 'draft');
        break;
      case 'scheduled':
        result = assets.filter(a => a.status === 'scheduled' || a.status === 'posted' || a.status === 'published');
        break;
      case 'draft':
        result = assets.filter(a => a.status === 'draft');
        break;
      default:
        result = assets.filter(a => a.type === filter && a.status !== 'draft');
    }

    return result.slice().sort((a, b) => {
      const aDone = a.status === 'scheduled' || a.status === 'posted' || a.status === 'published';
      const bDone = b.status === 'scheduled' || b.status === 'posted' || b.status === 'published';
      if (a.status === 'draft' && b.status !== 'draft') return -1;
      if (a.status !== 'draft' && b.status === 'draft') return 1;
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [assets, filter]);

  // ─── Derived: filter counts — single O(n) pass ────────────────────────────
  const filterCounts = useMemo<FilterCounts>(() => {
    const c: FilterCounts = { image: 0, carousel: 0, video: 0, photoshoot: 0, scheduled: 0, draft: 0 };
    for (const a of assets) {
      if (a.status === 'draft') { c.draft++; continue; }
      if (a.status === 'scheduled' || a.status === 'posted' || a.status === 'published') c.scheduled++;
      if (a.type === 'image') c.image++;
      else if (a.type === 'carousel') c.carousel++;
      else if (a.type === 'video') c.video++;
      else if (a.type === 'photoshoot') c.photoshoot++;
    }
    return c;
  }, [assets]);

  // ─── Pagination: visible slice ────────────────────────────────────────────
  const visibleAssets = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // Reset pagination when filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter]);

  // ─── Schedule limit validation ────────────────────────────────────────────
  const validateScheduleLimit = (schedules: { scheduledAt: string }[]): boolean => {
    if (isUnlimitedSchedule) return true;
    if (activeScheduledCount + schedules.length > 30) {
      toast({
        title: 'Queue Limit Reached',
        description: `Your Starter plan allows up to 30 scheduled posts. You have ${activeScheduledCount} scheduled and are trying to add ${schedules.length} more. Upgrade for unlimited queue size.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // ─── Keyboard navigation for lightbox ────────────────────────────────────
  useEffect(() => {
    if (!previewAsset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = filtered.findIndex(a => a._id === previewAsset._id);
      if (idx === -1) return;
      if (e.key === 'ArrowLeft') {
        setPreviewAsset(filtered[idx > 0 ? idx - 1 : filtered.length - 1]);
        setPreviewSlide(0);
      } else if (e.key === 'ArrowRight') {
        setPreviewAsset(filtered[idx < filtered.length - 1 ? idx + 1 : 0]);
        setPreviewSlide(0);
      } else if (e.key === 'Escape') {
        setPreviewAsset(null);
        setCopiedAsset(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAsset, filtered]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFetchRecommendations = async () => {
    if (selectedAssetIds.length === 0) return;
    setFetchingRecommendations(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/posts/recommend-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postIds: selectedAssetIds, startDate, endDate, platforms }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || 'Failed to fetch schedule recommendations');
      }
      const data = await res.json();
      const formatted = ((data.recommendations || []) as Record<string, string>[]).map(r => {
        let localDateTime = '';
        if (r.scheduledAt) {
          try {
            const d = new Date(r.scheduledAt);
            localDateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          } catch { localDateTime = r.scheduledAt.substring(0, 16); }
        }
        return { ...r, scheduledAtLocal: localDateTime };
      });
      setRecommendations(formatted);
      setModalStep(1);
    } catch (err: unknown) {
      console.error('[Schedule] Fetch recommendations error:', err);
      alert(getFriendlyErrorMessage(err as Error));
    } finally {
      setFetchingRecommendations(false);
    }
  };

  const handleSmartScheduleSubmit = async (finalRecommendations: Record<string, string>[]) => {
    if (selectedAssetIds.length === 0) return;
    try {
      const schedules = finalRecommendations.map(r => ({
        id: r.id,
        scheduledAt: r.scheduledAtLocal ? new Date(r.scheduledAtLocal).toISOString() : r.scheduledAt,
      }));
      if (!validateScheduleLimit(schedules)) return;
      if (startBackgroundSchedule) startBackgroundSchedule(selectedAssetIds, platforms, schedules as Record<string, string>[], startDate, endDate);
      setSelectionMode(false); setSelectedAssetIds([]); setShowScheduleModal(false); setModalStep(0); setRecommendations([]);
    } catch (err: unknown) {
      console.error('[Schedule] submit error:', err);
      alert(getFriendlyErrorMessage(err as Error));
    }
  };

  const handlePostNow = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      const schedules = selectedAssetIds.map(id => ({ id, scheduledAt: new Date().toISOString() }));
      if (!validateScheduleLimit(schedules)) return;
      if (startBackgroundSchedule) startBackgroundSchedule(selectedAssetIds, platforms, schedules, undefined, undefined);
      setSelectionMode(false); setSelectedAssetIds([]); setShowScheduleModal(false); setModalStep(0); setRecommendations([]);
    } catch (err: unknown) {
      console.error('[PostNow] error:', err);
      alert(getFriendlyErrorMessage(err as Error));
    }
  };

  const handleDelete = async (id: string) => {
    const originalAssets = [...assets];
    const updated = assets.filter(a => a._id !== id);
    setAssets(updated); // Optimistic update
    if (previewAsset?._id === id) { setPreviewAsset(null); setCopiedAsset(false); }

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
      setAssets(originalAssets); // Rollback
    }
  };

  const downloadSingleFile = async (srcUrl: string, filename: string) => {
    try {
      const response = await fetch(srcUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement('a');
      link.href = srcUrl; link.target = '_blank'; link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const handleDownload = async (asset: Asset) => {
    if (asset.type === 'carousel' && asset.slides && asset.slides.length > 0) {
      try {
        const zip = new JSZip();
        toast({ title: 'Preparing Download', description: `Packaging ${asset.slides.length} slides into a ZIP...` });
        for (let i = 0; i < asset.slides.length; i++) {
          const slideSrc = imgSrc(asset.slides[i].image);
          const response = await fetch(slideSrc);
          const blobData = await response.blob();
          const ext = blobData.type === 'image/png' ? 'png' : blobData.type === 'image/webp' ? 'webp' : 'jpg';
          zip.file(`slide_${i + 1}.${ext}`, blobData);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const blobUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = `syncsocio-creative-${asset._id?.slice(-6) || 'export'}.zip`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
        toast({ title: 'Download Started', description: 'Your carousel ZIP has been downloaded.' });
      } catch {
        toast({ title: 'Download Failed', description: 'Could not create ZIP. Downloading the first slide instead.', variant: 'destructive' });
        await downloadSingleFile(imgSrc(asset.slides[0].image), `syncsocio-creative-${asset._id?.slice(-6) || 'export'}_slide_1.jpg`);
      }
      return;
    }
    const isVideo = asset.type === 'video';
    const src = isVideo ? (asset.videoUrl || asset.thumbnailBase64) : asset.thumbnailBase64 || asset.slides?.[0]?.image;
    if (!src) return;
    const srcUrl = isVideo && asset.videoUrl ? asset.videoUrl : imgSrc(src);
    await downloadSingleFile(srcUrl, `syncsocio-creative-${asset._id?.slice(-6) || 'export'}.${isVideo && asset.videoUrl ? 'mp4' : 'jpg'}`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      {/* Shimmer keyframe — injected once */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 mb-3">
          <Heart size={12} className="text-rose-500 fill-rose-500" />
          <span className="text-[11px] font-semibold text-rose-500">Creative Library</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">Your hearted AI-generated creatives — saved and ready to deploy.</p>
      </div>

      {/* Filter tabs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0 scroll-smooth select-none flex-1 max-w-full">
          {(['all', 'image', 'carousel', 'video', 'photoshoot', 'draft', 'scheduled'] as const).map((f) => {
            const Icon = f === 'all' ? Sparkles : typeIcon[f];
            const label = f === 'scheduled'
              ? `Scheduled & Posted ${!isUnlimitedSchedule ? `(${activeScheduledCount}/30)` : ''}`
              : f === 'draft' ? 'Draft Emails' : f;
            const count = f === 'all' ? null : filterCounts[f as keyof FilterCounts];
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
                {count !== null && (
                  <span className={cn(
                    'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                    filter === f ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          {assets.length > 0 && (
            <Button
              onClick={() => {
                if (!profile?.instagramIsConnected && !selectionMode) { navigate('/setup?step=1'); return; }
                setSelectionMode(!selectionMode);
                setSelectedAssetIds([]);
              }}
              variant={selectionMode ? 'destructive' : 'default'}
              className={cn(
                'flex items-center gap-1.5 h-9 rounded-xl text-xs font-semibold px-3.5 shrink-0',
                !selectionMode && 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
              )}
            >
              <Calendar size={13} />
              {selectionMode ? 'Cancel Selection' : 'Schedule Posts'}
            </Button>
          )}
          <button
            onClick={fetchAssets}
            disabled={loading}
            className={cn('p-2 rounded-xl text-muted-foreground hover:bg-muted transition shrink-0', loading && 'opacity-50 cursor-not-allowed')}
            title="Refresh"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive font-medium flex items-center gap-2">
          <X size={13} className="shrink-0" />
          {error}
          <button onClick={fetchAssets} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Content */}
      {loading && assets.length === 0 ? (
        <SkeletonGrid />
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
        <>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {visibleAssets.map((asset) => {
              const thumbSrc = asset.type === 'carousel'
                ? imgSrc(asset.slides?.[0]?.image)
                : imgSrc(asset.thumbnailBase64);
              const Icon = asset.status === 'draft' ? typeIcon.draft : (typeIcon[asset.type] || ImageIcon);
              const isSelected = selectedAssetIds.includes(asset._id);
              const isScheduled = asset.status === 'scheduled' && (!asset.scheduledAt || new Date(asset.scheduledAt) > new Date());
              const isPosted = asset.status === 'posted' || asset.status === 'published' ||
                (asset.status === 'scheduled' && !!asset.scheduledAt && new Date(asset.scheduledAt) <= new Date());

              return (
                <motion.div
                  key={asset._id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={cn(
                    'group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer mb-4',
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/60',
                    (isScheduled || isPosted) && selectionMode && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => {
                    if (selectionMode) {
                      if (isScheduled || isPosted) return;
                      setSelectedAssetIds(prev =>
                        isSelected ? prev.filter(id => id !== asset._id) : [...prev, asset._id]
                      );
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
                  {/* Selection checkbox */}
                  {selectionMode && !(isScheduled || isPosted) && (
                    <div className={cn(
                      'absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground shadow shadow-primary/25 scale-105'
                        : 'bg-black/30 border-white/60 text-transparent'
                    )}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="relative overflow-hidden w-full cursor-pointer select-none">
                    {asset.type === 'video' && asset.videoUrl ? (
                      <video
                        src={`${asset.videoUrl}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-auto block"
                      />
                    ) : thumbSrc ? (
                      <LazyImage src={thumbSrc} alt="" />
                    ) : (
                      <div className="w-full flex items-center justify-center" style={{ minHeight: 180 }}>
                        <Icon size={24} className="text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-foreground/60 backdrop-blur-md text-background text-[9px] font-bold px-2 py-1 rounded-full capitalize z-10">
                      <Icon size={9} />
                      {asset.status === 'draft' ? 'Email Draft' : asset.type}
                    </div>

                    {/* Status badges */}
                    {isScheduled && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow z-10">
                        <Clock size={9} /> Scheduled
                      </div>
                    )}
                    {isPosted && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow z-10">
                        <Check size={9} strokeWidth={3} /> Posted
                      </div>
                    )}

                    {/* Hover action bar */}
                    {!selectionMode && (
                      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 pt-8 translate-y-0 opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent">
                        {asset.status === 'draft' && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/dashboard/strategy?draftId=${asset._id}`); }}
                            className="w-8 h-8 rounded-full bg-blue-500/80 backdrop-blur-md text-white hover:bg-blue-500 hover:scale-105 transition flex items-center justify-center shadow-lg"
                            title="Load into Campaigns to send"
                          >
                            <Send size={14} />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDownload(asset); }}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 hover:scale-105 transition flex items-center justify-center shadow-lg"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={e => e.stopPropagation()}
                              disabled={deleting === asset._id}
                              className="w-8 h-8 rounded-full bg-rose-500/80 backdrop-blur-md text-white hover:bg-rose-500 hover:scale-105 transition flex items-center justify-center shadow-lg"
                              title="Remove from library"
                            >
                              {deleting === asset._id
                                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={e => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this creative from your library? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={e => { e.stopPropagation(); handleDelete(asset._id); }}
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
                </motion.div>
              );
            })}
          </Masonry>

          {/* Load More */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 mt-6 mb-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{visibleCount}</span> of{' '}
                <span className="font-semibold text-foreground">{filtered.length}</span> creatives
              </p>
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition hover:border-primary/40 shadow-sm"
              >
                <ChevronDown size={14} />
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
            </div>
          )}

          {!hasMore && filtered.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground mt-8 mb-4">
              {filtered.length} creative{filtered.length > 1 ? 's' : ''} in your library
            </p>
          )}
        </>
      )}

      {/* ─── Lightbox / Preview Modal ─── */}
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
              style={{ width: 'fit-content' }}
              className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[95vh] rounded-[2rem] overflow-hidden border border-border shadow-2xl relative bg-card flex flex-col cursor-default"
              onClick={e => e.stopPropagation()}
            >
              {/* Media area */}
              <div className="relative flex items-center justify-center bg-transparent w-full">
                {previewAsset.type === 'video' && previewAsset.videoUrl ? (
                  <video
                    src={previewAsset.videoUrl}
                    controls
                    autoPlay
                    className={cn(
                      'w-auto h-auto max-w-full object-contain block',
                      ['ecomm', 'photoshoot', 'video'].includes(previewAsset.type) ? 'max-h-[90vh]' : 'max-h-[70vh]'
                    )}
                  />
                ) : previewAsset.type === 'carousel' && (previewAsset.slides?.length ?? 0) > 0 ? (
                  <div className="relative flex flex-col items-center justify-center w-full">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={previewSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                        src={imgSrc(previewAsset.slides![previewSlide]?.image)}
                        alt={`Slide ${previewSlide + 1}`}
                        className={cn(
                          'w-auto h-auto max-w-full object-contain block cursor-grab active:cursor-grabbing',
                          'max-h-[70vh]'
                        )}
                        loading="lazy"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, { offset }) => {
                          const slides = previewAsset.slides!;
                          if (offset.x < -40) setPreviewSlide(p => p < slides.length - 1 ? p + 1 : 0);
                          else if (offset.x > 40) setPreviewSlide(p => p > 0 ? p - 1 : slides.length - 1);
                        }}
                      />
                    </AnimatePresence>
                    {(previewAsset.slides!.length > 1) && (
                      <>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {previewAsset.slides!.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPreviewSlide(idx)}
                              className={cn('w-2 h-2 rounded-full transition-all', idx === previewSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60')}
                            />
                          ))}
                        </div>
                        <button onClick={() => setPreviewSlide(p => p > 0 ? p - 1 : previewAsset.slides!.length - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl">‹</button>
                        <button onClick={() => setPreviewSlide(p => p < previewAsset.slides!.length - 1 ? p + 1 : 0)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl">›</button>
                        <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">{previewSlide + 1} / {previewAsset.slides!.length}</div>
                      </>
                    )}
                  </div>
                ) : (
                  <img
                    src={imgSrc(previewAsset.thumbnailBase64)}
                    alt="Preview"
                    className={cn(
                      'w-auto h-auto max-w-full object-contain block',
                      ['ecomm', 'photoshoot'].includes(previewAsset.type) ? 'max-h-[90vh]' : 'max-h-[70vh]'
                    )}
                    loading="lazy"
                  />
                )}
              </div>

              {/* Caption panel */}
              {!(['ecomm', 'photoshoot', 'video'].includes(previewAsset.type) || (previewAsset.type === 'image' && previewAsset.caption?.includes(' ✨'))) && (
                <div className="w-0 min-w-full flex flex-col bg-card overflow-y-auto shrink-0 border-t border-border/50">
                  <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {previewAsset.status === 'draft' ? 'Email Draft Content' : 'Instagram Post Caption'}
                    </span>
                    <button
                      onClick={() => {
                        let text = previewAsset.caption || '';
                        if (previewAsset.status === 'draft') {
                          try { const p = JSON.parse(previewAsset.caption || '{}'); text = `Subject: ${p.subject || ''}\n\n${p.body || ''}`; } catch { }
                        }
                        navigator.clipboard.writeText(text);
                        setCopiedAsset(true);
                        setTimeout(() => setCopiedAsset(false), 2000);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition',
                        copiedAsset ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted hover:bg-muted/80 text-muted-foreground border-border'
                      )}
                    >
                      {copiedAsset ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Text</>}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 select-text custom-scrollbar max-h-[25vh]">
                    <p className="text-[11px] sm:text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {(() => {
                        if (previewAsset.status === 'draft') {
                          try { const p = JSON.parse(previewAsset.caption || '{}'); return `Subject: ${p.subject || ''}\n\n${p.body || ''}`; } catch { }
                        }
                        return previewAsset.caption || 'No caption generated.';
                      })()}
                    </p>
                  </div>
                  {previewAsset.status === 'draft' && (
                    <div className="p-4 border-t border-border/50 bg-muted/10">
                      <Button
                        onClick={() => { setPreviewAsset(null); navigate(`/dashboard/strategy?draftId=${previewAsset._id}`); }}
                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-md border-0"
                      >
                        <Send size={12} /> Load into Campaigns to send
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Selection Bar ─── */}
      <AnimatePresence>
        {selectionMode && selectedAssetIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 bg-background/80 backdrop-blur-lg border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6"
          >
            <div className="text-xs font-semibold text-foreground">
              <span className="text-rose-500 font-bold text-sm mr-1">{selectedAssetIds.length}</span>
              creative{selectedAssetIds.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowScheduleModal(true)} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl px-4 h-9 shadow-md shadow-rose-500/15 border-0">
                Schedule Selected
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectionMode(false); setSelectedAssetIds([]); }} className="text-xs rounded-xl px-3 h-9 border-border bg-card">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Smart Schedule Modal ─── */}
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
              className={cn('w-full bg-card border border-border rounded-3xl p-6 shadow-2xl relative transition-all duration-300', modalStep === 0 ? 'max-w-md' : 'max-w-xl')}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowScheduleModal(false); setModalStep(0); setRecommendations([]); }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition"
              >
                <X size={18} />
              </button>

              {modalStep === 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><Sparkles size={18} /></div>
                    <h3 className="text-lg font-bold text-foreground font-display">Smart Schedule Posts</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">
                    Our scheduler agent will analyze follower activity peaks and distribute your {selectedAssetIds.length} posts optimally.
                  </p>

                  {/* Platforms */}
                  <div className="mb-5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Publish To</label>
                    <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-muted/20 border border-border w-full">
                      {(['instagram', 'facebook'] as const).map(p => {
                        const active = platforms[p];
                        const Icon = p === 'facebook' ? FacebookIcon : InstagramIcon;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPlatforms(prev => {
                              const next = { ...prev, [p]: !prev[p] };
                              if (!next.facebook && !next.instagram) return prev;
                              return next;
                            })}
                            aria-pressed={active}
                            className={cn(
                              'flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex-1',
                              active
                                ? p === 'facebook'
                                  ? 'bg-[#1877F2] text-white shadow-lg shadow-blue-500/20 border-0'
                                  : 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg shadow-rose-500/20 border-0'
                                : 'bg-transparent text-muted-foreground hover:text-foreground border-0 hover:bg-muted/40'
                            )}
                          >
                            <Icon size={14} /> {p === 'facebook' ? 'Facebook' : 'Instagram'}
                            {active && <Check size={12} strokeWidth={3} className="ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                      <input type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => setStartDate(e.target.value)} className="w-full text-xs bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">End Date</label>
                      <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xs bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handlePostNow} disabled={fetchingRecommendations || (!platforms.instagram && !platforms.facebook)} className="bg-emerald-500 hover:bg-emerald-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-emerald-500/20 px-6">Post Now</Button>
                    <Button onClick={handleFetchRecommendations} disabled={fetchingRecommendations || (!platforms.instagram && !platforms.facebook)} className="flex-1 bg-rose-500 hover:bg-rose-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-rose-500/20">
                      {fetchingRecommendations ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Planning...</span></div> : 'Get AI Recommendations'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowScheduleModal(false)} disabled={fetchingRecommendations} className="px-4 h-11 text-xs font-semibold rounded-xl border-border bg-card">Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><Sparkles size={18} /></div>
                    <h3 className="text-lg font-bold text-foreground font-display">Review & Adjust Schedule</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">Review or edit the dates/times calculated by the scheduler agent before finalizing.</p>

                  <div className="max-h-[50vh] overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                    {recommendations.map((rec, index) => {
                      const Icon = typeIcon[rec.type] || ImageIcon;
                      return (
                        <div key={rec.id} className="p-5 rounded-2xl border space-y-4 shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                          <div className="flex gap-4 items-start">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center shadow-sm">
                              {rec.thumbnailBase64
                                ? <img src={imgSrc(rec.thumbnailBase64)} alt="post preview" className="w-full h-full object-cover" loading="lazy" />
                                : <Icon size={20} className="text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}>{rec.type}</span>
                              <p className="text-xs text-slate-800 font-semibold line-clamp-2 leading-relaxed">{rec.caption || rec.idea || 'Skincare Creative'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-3.5 border-t border-slate-200/80">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-1">Post Time</label>
                            <input
                              type="datetime-local"
                              value={rec.scheduledAtLocal || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setRecommendations(prev => prev.map((item, idx) => idx === index ? { ...item, scheduledAtLocal: val } : item));
                              }}
                              className="w-full sm:col-span-2 text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold"
                              style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                            />
                          </div>
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

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSmartScheduleSubmit(recommendations)}
                      disabled={schedulingInProgress || recommendations.some(r => !r.scheduledAtLocal)}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-rose-500/20"
                    >
                      {schedulingInProgress ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Scheduling...</span></div> : 'Confirm & Schedule'}
                    </Button>
                    <Button variant="outline" onClick={() => setModalStep(0)} disabled={schedulingInProgress} className="px-4 h-11 text-xs font-semibold rounded-xl border-border bg-card">Back</Button>
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
