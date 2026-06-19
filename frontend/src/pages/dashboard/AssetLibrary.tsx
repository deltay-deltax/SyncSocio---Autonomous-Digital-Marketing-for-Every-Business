import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Image as ImageIcon, Layers, Video, Sparkles, RefreshCw, Download, Eye, X, Copy, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Masonry from 'react-masonry-css';
import { useNavigate } from 'react-router-dom';

const breakpointColumnsObj = {
  default: 4,
  1280: 3,
  1024: 2,
  640: 1
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const CACHE_KEY = 'velocity_strategy_assets';

const aspectClass: Record<string, string> = {
  '1:1':  'aspect-square',
  '4:5':  'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '2:3':  'aspect-[2/3]',
};

function imgSrc(b64: string | null | undefined) {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http') || b64.startsWith('blob:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

function safeSetItem(key: string, value: any[]) {
  let list = [...value];
  while (list.length > 0) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      return; // Success
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        try {
          // Clear all public asset caches first to free up space
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('velocity_public_asset_')) {
              localStorage.removeItem(k);
            }
          }
        } catch {}
        
        // Exceeded quota: reduce list size by 1 and try again
        list.pop();
        console.warn(`[Storage] Quota exceeded, retrying cache with ${list.length} items...`);
      } else {
        console.error('[Storage] LocalStorage setItem failed:', e);
        return;
      }
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}

const typeIcon: Record<string, any> = {
  image:    ImageIcon,
  carousel: Layers,
  video:    Video,
};

const AssetLibrary = () => {
  const navigate = useNavigate();
  const profile = JSON.parse(localStorage.getItem('velocity_profile') || '{}');
  const userId = profile._id || profile.userId || profile.id || 'guest';
  const cacheKey = `velocity_strategy_assets_${userId}`;

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
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

  const [assets, setAssets] = useState<any[]>(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = localStorage.getItem(cacheKey);
    return !cached;
  });
  const [filter, setFilter] = useState<'all' | 'image' | 'carousel' | 'video'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);
  const [previewSlide, setPreviewSlide] = useState<number>(0);
  const [copiedAsset, setCopiedAsset] = useState<boolean>(false);

  const fetchAssets = useCallback(async () => {
    const cached = localStorage.getItem(cacheKey);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/strategy-assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rawCreatives = data.creatives || [];
        // Deduplicate creatives on id only to prevent hiding distinct ones
        const uniqueCreatives = rawCreatives.filter(
          (item: any, index: number, self: any[]) =>
            self.findIndex((t) => t._id === item._id) === index
        );
        setAssets(uniqueCreatives);
        safeSetItem(cacheKey, uniqueCreatives);
      }
    } catch (err) {
      console.error('[Assets] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);



  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSmartScheduleSubmit = async () => {
    if (selectedAssetIds.length === 0) return;
    setSchedulingInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/posts/smart-schedule`, {
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
        throw new Error(errorData.message || 'Failed to smart schedule posts');
      }

      const data = await res.json();
      console.log('Smart schedule results:', data);

      // Reset selection mode & refresh
      setSelectionMode(false);
      setSelectedAssetIds([]);
      setShowScheduleModal(false);
      
      // Clear localStorage cache to force fresh assets reload
      localStorage.removeItem(cacheKey);
      await fetchAssets();

      // Navigate to post history
      navigate('/dashboard/history');
    } catch (err: any) {
      console.error('[Schedule] smart schedule error:', err);
      alert(err.message || 'Error scheduling posts. Please try again.');
    } finally {
      setSchedulingInProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/strategy-assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = assets.filter((a) => a._id !== id);
      setAssets(updated);
      safeSetItem(cacheKey, updated);
    } catch (err) {
      console.error('[Assets] Delete error:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (asset: any) => {
    const src = asset.type === 'image' ? asset.thumbnailBase64
              : asset.type === 'carousel' ? asset.slides?.[0]?.image
              : asset.thumbnailBase64;
    if (!src) return;
    const a = document.createElement('a');
    a.href = imgSrc(src);
    a.download = `velocity-creative-${asset._id?.slice(-6) || 'export'}.jpg`;
    a.click();
  };

  const filtered = filter === 'all' ? assets : assets.filter((a) => a.type === filter);

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
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'image', 'carousel', 'video'] as const).map((f) => {
          const Icon = f === 'all' ? Sparkles : typeIcon[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition capitalize',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <Icon size={12} />
              {f}
              {f !== 'all' && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                  filter === f ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {assets.filter((a) => a.type === f).length}
                </span>
              )}
            </button>
          );
        })}
        {assets.length > 0 && (
          <Button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedAssetIds([]);
            }}
            variant={selectionMode ? "destructive" : "default"}
            className={cn(
              "ml-auto flex items-center gap-1.5 h-9 rounded-xl text-xs font-semibold px-3.5",
              !selectionMode && "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20"
            )}
          >
            <Calendar size={13} />
            {selectionMode ? 'Cancel Selection' : 'Schedule Posts'}
          </Button>
        )}
        <button
          onClick={fetchAssets}
          className={cn("p-2 rounded-xl text-muted-foreground hover:bg-muted transition", assets.length === 0 && "ml-auto")}
          title="Refresh"
        >
          <RefreshCw size={14} />
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
              const Icon = typeIcon[asset.type] || ImageIcon;

              const isSelected = selectedAssetIds.includes(asset._id);
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
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/60"
                  )}
                  onClick={() => {
                    if (selectionMode) {
                      if (isSelected) {
                        setSelectedAssetIds(selectedAssetIds.filter(id => id !== asset._id));
                      } else {
                        setSelectedAssetIds([...selectedAssetIds, asset._id]);
                      }
                    } else {
                      setPreviewAsset(asset);
                      setPreviewSlide(0);
                    }
                  }}
                >
                  {/* Selection Mode Checkbox Overlay */}
                  {selectionMode && (
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
                      <video src={asset.videoUrl} className="w-full h-auto block" muted />
                    ) : thumbSrc ? (
                      <img src={thumbSrc} alt="" className="w-full h-auto block" />
                    ) : (
                      <Icon size={24} className="text-muted-foreground/30" />
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-foreground/60 backdrop-blur-md text-background text-[9px] font-bold px-2 py-1 rounded-full capitalize z-10">
                      <Icon size={9} />
                      {asset.type}
                    </div>

                    {/* Hover overlay with actions - only visible if not in selection mode */}
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(asset._id);
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
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="p-3">
                    <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">{asset.caption}</p>
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
                    <img
                      src={imgSrc(previewAsset.slides[previewSlide]?.image)}
                      alt={`Slide ${previewSlide + 1}`}
                      className="w-full h-auto max-h-[55vh] md:max-h-[60vh] object-contain max-w-full"
                    />
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
                  />
                )}
              </div>

              {/* Right panel: Caption & Hashtags */}
              <div className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-border/60 flex flex-col bg-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instagram Post Caption</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewAsset.caption || '');
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
                    {previewAsset.caption || "No caption generated."}
                  </p>
                </div>
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
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
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
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition"
              >
                <X size={18} />
              </button>

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
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-border hover:border-rose-500/40 bg-muted/20 flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={platforms.instagram}
                      onChange={(e) => setPlatforms({ ...platforms, instagram: e.target.checked })}
                      className="rounded border-input text-rose-500 focus:ring-rose-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-foreground">Instagram</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-border hover:border-rose-500/40 bg-muted/20 flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={platforms.facebook}
                      onChange={(e) => setPlatforms({ ...platforms, facebook: e.target.checked })}
                      className="rounded border-input text-rose-500 focus:ring-rose-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-foreground">Facebook</span>
                  </label>
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
                  onClick={handleSmartScheduleSubmit}
                  disabled={schedulingInProgress || (!platforms.instagram && !platforms.facebook)}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 border-0 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-rose-500/20"
                >
                  {schedulingInProgress ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Scheduling...</span>
                    </div>
                  ) : (
                    <span>Optimize & Schedule</span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={schedulingInProgress}
                  className="px-4 h-11 text-xs font-semibold rounded-xl border-border bg-card"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetLibrary;
