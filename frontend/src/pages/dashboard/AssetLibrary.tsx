import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Image as ImageIcon, Layers, Video, Sparkles, RefreshCw, Download, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  const profile = JSON.parse(localStorage.getItem('velocity_profile') || '{}');
  const userId = profile._id || profile.userId || profile.id || 'guest';
  const cacheKey = `velocity_strategy_assets_${userId}`;

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
        <button
          onClick={fetchAssets}
          className="ml-auto p-2 rounded-xl text-muted-foreground hover:bg-muted transition"
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
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <AnimatePresence>
            {filtered.map((asset, i) => {
              const aspect = asset.aspectRatio || '1:1';
              const thumbSrc = asset.type === 'carousel'
                ? imgSrc(asset.slides?.[0]?.image)
                : imgSrc(asset.thumbnailBase64);
              const Icon = typeIcon[asset.type] || ImageIcon;

              return (
                <motion.div
                  key={asset._id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all"
                >
                  {/* Thumbnail wrapper - clickable for preview */}
                  <div
                    onClick={() => {
                      setPreviewAsset(asset);
                      setPreviewSlide(0);
                    }}
                    className="relative bg-muted overflow-hidden cursor-pointer flex items-center justify-center min-h-[200px]"
                  >
                    {asset.type === 'video' && asset.videoUrl ? (
                      <video src={asset.videoUrl} className="w-full h-auto block" muted />
                    ) : thumbSrc ? (
                      <img src={thumbSrc} alt="" className="w-full h-auto block" />
                    ) : (
                      <Icon size={24} className="text-muted-foreground/30" />
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-foreground/60 backdrop-blur-md text-background text-[9px] font-bold px-2 py-1 rounded-full capitalize">
                      <Icon size={9} />
                      {asset.type}
                    </div>

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                      {/* Clicking the background of overlay triggers parent preview, but actions stop propagation */}
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

                  {/* Heart badge */}
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse">
                      <Heart size={10} className="text-white fill-white" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
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
            onClick={() => setPreviewAsset(null)}
          >
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition shadow-lg z-50"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-[90vw] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-card flex flex-col items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {previewAsset.type === 'video' && previewAsset.videoUrl ? (
                <video
                  src={previewAsset.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh] object-contain max-w-full"
                />
              ) : previewAsset.type === 'carousel' && previewAsset.slides?.length > 0 ? (
                <div className="relative flex flex-col items-center justify-center">
                  <img
                    src={imgSrc(previewAsset.slides[previewSlide]?.image)}
                    alt={`Slide ${previewSlide + 1}`}
                    className="w-full h-auto max-h-[75vh] object-contain max-w-full"
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
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setPreviewSlide(prev => (prev < previewAsset.slides.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
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
                  className="w-full h-auto max-h-[80vh] object-contain max-w-full"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetLibrary;
