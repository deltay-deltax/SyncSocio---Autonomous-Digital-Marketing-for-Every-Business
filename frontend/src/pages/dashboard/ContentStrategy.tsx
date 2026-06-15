import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Layers, Video, Plus, Shuffle, Sparkles, ArrowLeft,
  Wand2, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X,
  Download, RefreshCw, AlertCircle, Library, Package, ShoppingBag, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type LayoutType = 'image' | 'carousel' | 'video';
type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

const AI_BASE  = 'http://localhost:8000';
const NODE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const ASSET_CACHE_KEY = 'velocity_strategy_assets';

const layouts: { id: LayoutType; label: string; icon: any; desc: string }[] = [
  { id: 'image',    label: 'Image',    icon: ImageIcon, desc: 'Single static post' },
  { id: 'carousel', label: 'Carousel', icon: Layers,    desc: 'Multi-slide swipe' },
  { id: 'video',    label: 'Video',    icon: Video,     desc: 'Reel / motion post' },
];

const aspects: { id: AspectRatio; label: string; ratio: string }[] = [
  { id: '1:1',  label: '1:1',  ratio: 'Square' },
  { id: '4:5',  label: '4:5',  ratio: 'Portrait' },
  { id: '9:16', label: '9:16', ratio: 'Story / Reel' },
  { id: '16:9', label: '16:9', ratio: 'Landscape' },
  { id: '2:3',  label: '2:3',  ratio: 'Classic' },
];

const imageCounts    = [1, 2, 4, 6];
const carouselCounts = [1, 2, 3];
const carouselSlides = [3, 5, 7];
const videoCounts    = [1, 2, 3, 4];

const aspectClass: Record<AspectRatio, string> = {
  '1:1':  'aspect-square',
  '4:5':  'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '2:3':  'aspect-[2/3]',
};

const stockImages = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',
  'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=600',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a File or object-URL (blob:) to base64 data-URL */
async function toBase64(src: string): Promise<string> {
  // Already a data-URL
  if (src.startsWith('data:')) return src;
  // HTTP/Unsplash URL or blob:// — fetch and convert
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Renders an image source — handles base64, http URLs, blob URLs */
function imgSrc(src: string | null | undefined): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) return src;
  // raw base64 without prefix
  return `data:image/jpeg;base64,${src}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedPost {
  // image layout
  image?: string | null;
  // carousel layout
  slides?: { image: string }[];
  // video layout
  url?: string | null;
  thumbnail?: string | null;
  caption: string;
  type: string;
  error?: string;
}

// ── Background Generation State Cache ─────────────────────────────────────────

interface GlobalGenState {
  stage: 'builder' | 'generating' | 'results';
  layout: LayoutType | null;
  count: number;
  slideCount: number;
  aspect: AspectRatio;
  idea: string;
  uploads: string[];
  selectedProducts: any[];
  generated: GeneratedPost[];
  genError: string | null;
}

const globalGenState: GlobalGenState = {
  stage: 'builder',
  layout: null,
  count: 2,
  slideCount: 5,
  aspect: '1:1',
  idea: '',
  uploads: [],
  selectedProducts: [],
  generated: [],
  genError: null,
};

let globalGenPromise: Promise<any> | null = null;

// ── Component ─────────────────────────────────────────────────────────────────

const DashboardStrategy = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'builder' | 'generating' | 'results'>(globalGenState.stage);
  const [layout, setLayout] = useState<LayoutType | null>(globalGenState.layout);
  const [count, setCount] = useState<number>(globalGenState.count);
  const [slideCount, setSlideCount] = useState<number>(globalGenState.slideCount);
  const [aspect, setAspect] = useState<AspectRatio>(globalGenState.aspect);
  const [idea, setIdea] = useState(globalGenState.idea);
  const [uploads, setUploads] = useState<string[]>(globalGenState.uploads);
  const [generated, setGenerated] = useState<GeneratedPost[]>(globalGenState.generated);
  const [genError, setGenError] = useState<string | null>(globalGenState.genError);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  // ── Products state ──
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>(globalGenState.selectedProducts);
  const [showProductModal, setShowProductModal] = useState(false);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const cached = localStorage.getItem('velocity_products');
        if (cached) setProducts(JSON.parse(cached));
        const res = await fetch(`${NODE_BASE}/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          localStorage.setItem('velocity_products', JSON.stringify(data.products || []));
        }
      } catch (e) { console.error(e); }
    };
    fetchProducts();
  }, []);

  // Sync state hooks back to global cache on change
  React.useEffect(() => {
    globalGenState.stage = stage;
    globalGenState.layout = layout;
    globalGenState.count = count;
    globalGenState.slideCount = slideCount;
    globalGenState.aspect = aspect;
    globalGenState.idea = idea;
    globalGenState.uploads = uploads;
    globalGenState.selectedProducts = selectedProducts;
    globalGenState.generated = generated;
    globalGenState.genError = genError;
  }, [stage, layout, count, slideCount, aspect, idea, uploads, selectedProducts, generated, genError]);

  // Hook into active background generation if component remounts
  React.useEffect(() => {
    if (globalGenPromise) {
      setStage('generating');
      globalGenPromise
        .then((data) => {
          setGenerated(data.posts || []);
          setStage('results');
        })
        .catch((err) => {
          setGenError(err.message || 'Something went wrong');
          setStage('builder');
        });
    }
  }, []);

  const profile   = JSON.parse(localStorage.getItem('velocity_profile') || '{}');
  const userId    = profile._id || profile.userId || profile.id || '';
  const brandName = (profile.brandName || 'yourbrand').toLowerCase().replace(/\s+/g, '');

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setUploads((u) => [...u, ...urls]);
  };

  const pickRandom = () => {
    if (products.length > 0) {
      const available = [...products];
      const maxToPick = Math.min(available.length, count);
      const shuffled = available.sort(() => 0.5 - Math.random()).slice(0, maxToPick);
      setSelectedProducts(shuffled);
      setUploads([]);
    } else {
      const shuffled = [...stockImages].sort(() => 0.5 - Math.random()).slice(0, 4);
      setUploads((u) => [...u, ...shuffled]);
      setSelectedProducts([]);
    }
  };

  const toggleProduct = (p: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(x => x._id === p._id);
      if (exists) return prev.filter(x => x._id !== p._id);
      if (prev.length >= count) return prev; // cap at count
      return [...prev, p];
    });
  };

  const canGenerate = !!layout;

  // ── Generate ─────────────────────────────────────────────────────────────

  const generate = async () => {
    setStage('generating');
    setGenError(null);
    globalGenState.stage = 'generating';
    globalGenState.genError = null;

    try {
      // Convert all ref images to base64 so the backend can use them
      const refImages: string[] = await Promise.all(
        uploads.map((u) => toBase64(u))
      );

      const payload = {
        userId,
        layout,
        count,
        slideCount,
        aspectRatio: aspect,
        idea,
        refImages,
        products: selectedProducts.length > 0 ? selectedProducts : undefined,
      };

      const promise = fetch(`${AI_BASE}/generate-strategy-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Generation failed');
          }
          return res.json();
        })
        .then((data) => {
          globalGenState.generated = data.posts || [];
          globalGenState.stage = 'results';
          globalGenPromise = null;
          return data;
        })
        .catch((err) => {
          globalGenState.genError = err.message || 'Something went wrong';
          globalGenState.stage = 'builder';
          globalGenPromise = null;
          throw err;
        });

      globalGenPromise = promise;

      // Listen to the promise for updating the currently mounted component's state
      promise
        .then((data) => {
          setGenerated(data.posts || []);
          setStage('results');
        })
        .catch((err) => {
          setGenError(err.message || 'Something went wrong');
          setStage('builder');
        });

    } catch (err: any) {
      console.error('[Strategy] Generation setup error:', err);
      setGenError(err.message || 'Something went wrong');
      setStage('builder');
      globalGenPromise = null;
      globalGenState.stage = 'builder';
    }
  };

  const reset = () => {
    setStage('builder');
    setGenerated([]);
    setGenError(null);
    setSavedCount(0);
    // Reset global state
    globalGenState.stage = 'builder';
    globalGenState.layout = null;
    globalGenState.count = 2;
    globalGenState.slideCount = 5;
    globalGenState.aspect = '1:1';
    globalGenState.idea = '';
    globalGenState.uploads = [];
    globalGenState.selectedProducts = [];
    globalGenState.generated = [];
    globalGenState.genError = null;
  };

  // ── Heart — save to DB + localStorage cache ───────────────────────────────
  const handleHeart = async (post: GeneratedPost) => {
    try {
      const token = localStorage.getItem('token');
      const thumbSrc = post.type === 'carousel' ? post.slides?.[0]?.image : post.image;

      const body = {
        type: post.type,
        thumbnailBase64: thumbSrc || '',
        slides: post.slides || [],
        videoUrl: post.url || '',
        caption: post.caption,
        idea,
        aspectRatio: aspect,
      };

      const res = await fetch(`${NODE_BASE}/strategy-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // Update localStorage cache
        const cached = JSON.parse(localStorage.getItem(ASSET_CACHE_KEY) || '[]');
        cached.unshift(data.creative);
        localStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(cached));
        setSavedCount((n) => n + 1);
      }
    } catch (err) {
      console.error('[Strategy] Heart error:', err);
    }
  };

  // ── Reject — remove card from results ─────────────────────────────────────
  const handleReject = (index: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== index));
  };


  // ──────────────────────────────────────────────────────────────────────────
  // GENERATING SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === 'generating') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/70 to-primary/40 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6"
        >
          <Sparkles className="text-primary-foreground" size={32} />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Cooking up your posts ✨</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Velocity AI is generating {count} on-brand{' '}
          {layout === 'video' ? 'videos' : layout === 'carousel' ? 'carousels' : 'posts'}…
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">This may take 15–30 seconds</p>
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
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESULTS SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === 'results') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="p-2 rounded-xl hover:bg-muted transition">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Your generated posts</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {generated.length} AI-generated {layout} {generated.length > 1 ? 'posts' : 'post'} · ready to ship
              </p>
            </div>
          </div>
          <Button onClick={generate} variant="outline" size="sm" className="rounded-xl gap-2">
            <RefreshCw size={14} /> Regenerate
          </Button>
        </div>

        {/* Saved to library banner */}
        <AnimatePresence>
          {savedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20"
            >
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-rose-500 fill-rose-500" />
                <span className="text-sm font-semibold text-rose-600">
                  {savedCount} creative{savedCount > 1 ? 's' : ''} saved to your library
                </span>
              </div>
              <button
                onClick={() => navigate('/dashboard/assets')}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition"
              >
                <Library size={12} /> View Assets →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          'grid gap-5 items-start',
          generated.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
          generated.length <= 4  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}>
          {generated.map((post, i) => (
            <PostCard
              key={i}
              post={post}
              index={i}
              brandName={brandName}
              aspect={aspect}
              layout={layout!}
              slideCount={slideCount}
              idea={idea}
              onHeart={handleHeart}
              onReject={handleReject}
              onPreview={setPreviewUrl}
            />
          ))}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUILDER SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Wand2 size={12} className="text-primary" />
          <span className="text-[11px] font-semibold text-primary">AI Content Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Strategy</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a layout, describe your vibe, and let Velocity design the post.</p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {genError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 flex items-start gap-3 p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive text-sm"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{genError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 1 — Layout */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">1 · Choose layout</p>
        <div className="grid grid-cols-3 gap-3">
          {layouts.map((l) => {
            const active = layout === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={cn(
                  'group relative p-5 rounded-2xl border text-left transition-all overflow-hidden',
                  active
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="layout-glow"
                    className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
                  />
                )}
                <div className="relative">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}>
                    <l.icon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{l.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* STEP 2 — Count + aspect (animated) */}
      <AnimatePresence>
        {layout && (
          <motion.section
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-5 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/30 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  {layout === 'image' ? 'Post count' : layout === 'carousel' ? 'Carousels' : 'Videos'}
                </p>
                <div className="flex gap-2">
                  {(layout === 'image' ? imageCounts : layout === 'carousel' ? carouselCounts : videoCounts).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCount(c)}
                      className={cn(
                        'flex-1 sm:flex-none sm:w-20 py-2.5 rounded-xl text-sm font-semibold transition',
                        count === c
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : 'bg-card border border-border text-foreground hover:border-primary/40'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {layout === 'carousel' && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Slides per carousel</p>
                  <div className="flex gap-2">
                    {carouselSlides.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSlideCount(s)}
                        className={cn(
                          'flex-1 sm:flex-none sm:w-20 py-2.5 rounded-xl text-sm font-semibold transition',
                          slideCount === s
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'bg-card border border-border text-foreground hover:border-primary/40'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Aspect ratio</p>
                <div className="flex flex-wrap gap-2">
                  {aspects.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAspect(a.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2',
                        aspect === a.id
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : 'bg-card border border-border text-foreground hover:border-primary/40'
                      )}
                    >
                      <span>{a.label}</span>
                      <span className={cn('text-[10px]', aspect === a.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {a.ratio}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* STEP 3 — Idea */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {layout ? '3' : '2'} · Explain your idea <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
        </p>
        <div className="relative">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. Launching a soft pastel summer drop with 6 hero products — vibe should feel dreamy, sun-soaked & a little playful."
            className="min-h-[120px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed pr-12"
          />
          <Sparkles size={14} className="absolute top-3.5 right-4 text-primary/60" />
        </div>
      </section>

      {/* STEP 4 — Reference images */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {layout ? '4' : '3'} · Reference images{' '}
            <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowProductModal(true)} className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
              <ShoppingBag size={12} /> From Products
            </button>
            <button onClick={pickRandom} className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
              <Shuffle size={12} /> Pick Random
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          <button
            onClick={() => fileInput.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition">
              <Plus size={16} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">Upload</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Render Selected Products */}
          {selectedProducts.map((p, i) => (
            <motion.div
              key={`prod-${p._id || i}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square rounded-xl overflow-hidden group bg-card border border-primary/40 shadow-sm shadow-primary/10"
            >
              {p.imageBase64 ? (
                <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-2 text-center">
                  <Package size={16} className="text-muted-foreground mb-1" />
                  <span className="text-[9px] font-medium leading-tight text-foreground line-clamp-2">{p.name}</span>
                </div>
              )}
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">PRODUCT</div>
              <button
                onClick={() => toggleProduct(p)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 backdrop-blur text-background opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </motion.div>
          ))}

          {/* Render Uploads */}
          {uploads.map((url, i) => (
            <motion.div
              key={`up-${i}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square rounded-xl overflow-hidden group bg-muted"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setUploads((u) => u.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 backdrop-blur text-background opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Product Selection Modal */}
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
                    Pick up to {count} products to feature. Velocity will anchor the AI generations to these.
                  </p>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {products.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Package size={32} className="text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">Add products in the Products tab first so Velocity can use them.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map(p => {
                      const selected = !!selectedProducts.find(x => x._id === p._id);
                      const disabled = !selected && selectedProducts.length >= count;
                      return (
                        <button
                          key={p._id}
                          onClick={() => toggleProduct(p)}
                          disabled={disabled}
                          className={cn(
                            'text-left relative p-3 rounded-2xl border transition overflow-hidden group',
                            selected
                              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                              : disabled
                                ? 'border-border/40 opacity-50 cursor-not-allowed'
                                : 'border-border hover:border-primary/40 bg-card hover:bg-muted/30'
                          )}
                        >
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative">
                            {p.imageBase64 ? (
                              <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-contain p-2" />
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
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border/50 shrink-0 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  <span className={cn(selectedProducts.length === count ? 'text-primary' : 'text-foreground')}>
                    {selectedProducts.length}
                  </span> / {count} selected
                </p>
                <Button onClick={() => setShowProductModal(false)} className="rounded-xl px-6">
                  Done
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GENERATE */}
      <div className="sticky bottom-4 lg:bottom-0 lg:static pt-2">
        <Button
          onClick={generate}
          disabled={!canGenerate}
          size="lg"
          className={cn(
            'w-full h-14 rounded-2xl text-base font-bold gap-2 transition-all',
            canGenerate
              ? 'bg-gradient-to-r from-primary to-primary/80 hover:shadow-2xl hover:shadow-primary/30'
              : 'opacity-50 cursor-not-allowed'
          )}
        >
          <Sparkles size={18} />
          Generate {count} {layout === 'video' ? 'videos' : layout === 'carousel' ? 'carousels' : 'posts'}
        </Button>
        {!layout && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Pick a layout to start ✨
          </p>
        )}
      </div>
      {/* Lightbox / Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
            onClick={() => setPreviewUrl(null)}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition shadow-lg z-50"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-card flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain max-w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Post Card sub-component
// ──────────────────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: GeneratedPost;
  index: number;
  brandName: string;
  aspect: AspectRatio;
  layout: LayoutType;
  slideCount: number;
  idea: string;
  onHeart: (post: GeneratedPost) => Promise<void>;
  onReject: (index: number) => void;
  onPreview: (url: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, index, brandName, aspect, layout, slideCount, idea, onHeart, onReject, onPreview }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [hearted, setHearted] = useState(false);
  const [hearting, setHearting] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHeartingRef = useRef(false);

  const handleHeart = async () => {
    if (hearted || isHeartingRef.current) return;
    isHeartingRef.current = true;
    setHearting(true);
    await onHeart(post);
    setHearted(true);
    setHearting(false);
    isHeartingRef.current = false;
  };

  const handleDoubleClick = () => {
    if (post.error) return;
    handleHeart();
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 800);
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    if (post.error) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      handleDoubleClick();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        if (displaySrc) {
          onPreview(displaySrc);
        }
      }, 250);
    }
  };

  const handleReject = () => {
    setRejected(true);
    setTimeout(() => onReject(index), 300);
  };

  const displaySrc = (() => {
    if (layout === 'image')    return imgSrc(post.image);
    if (layout === 'carousel') return imgSrc(post.slides?.[activeSlide]?.image);
    if (layout === 'video')    return imgSrc(post.thumbnail);
    return '';
  })();

  if (rejected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all"
    >
      {/* IG Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <span className="text-[10px] font-bold text-foreground">{brandName.slice(0, 2).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">{brandName}</p>
            <p className="text-[10px] text-muted-foreground">AI Generated · Velocity</p>
          </div>
        </div>
        <MoreHorizontal size={16} className="text-muted-foreground" />
      </div>

      {/* Media area */}
      <div 
        className={cn('relative bg-muted overflow-hidden cursor-pointer select-none', aspectClass[aspect])}
        onClick={layout === 'video' && post.url ? undefined : handleMediaClick}
      >
        {/* Double-tap big heart animation */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.4, 1.2, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <Heart size={64} className="text-white fill-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.error ? (
          /* Error state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <AlertCircle size={24} className="text-destructive/60" />
            <p className="text-xs text-muted-foreground">Generation failed</p>
            <p className="text-[10px] text-muted-foreground/60">{post.error.slice(0, 80)}</p>
          </div>
        ) : layout === 'video' && post.url ? (
          /* Video */
          <video
            src={post.url}
            poster={post.thumbnail ? imgSrc(post.thumbnail) : undefined}
            controls
            className="w-full h-full object-cover"
          />
        ) : displaySrc ? (
          /* Image / Carousel slide */
          <img src={displaySrc} alt="" className="w-full h-full object-cover pointer-events-none" />
        ) : (
          /* Loading placeholder (shouldn't happen but safe) */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* Carousel slide badge + navigation */}
        {layout === 'carousel' && post.slides && post.slides.length > 0 && (
          <>
            <div className="absolute top-3 right-3 bg-foreground/60 backdrop-blur-md text-background text-[10px] font-semibold px-2 py-1 rounded-full">
              {activeSlide + 1}/{post.slides.length}
            </div>
            {post.slides.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-10">
                {post.slides.map((_, si) => (
                  <button
                    key={si}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlide(si);
                    }}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition',
                      si === activeSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Video play overlay (when no native video) */}
        {layout === 'video' && !post.url && !post.error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-foreground/40 backdrop-blur-md flex items-center justify-center">
              <div className="w-0 h-0 border-l-[10px] border-l-background border-y-[7px] border-y-transparent ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Caption row */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-xs font-semibold text-foreground mb-0.5">{(2300 + index * 470).toLocaleString()} likes</p>
        <p className="text-xs text-foreground leading-relaxed line-clamp-2">
          <span className="font-semibold">{brandName}</span> {post.caption}
        </p>
      </div>

      {/* Action row — Heart / Reject / Download */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40 mt-1">
        {/* Heart — saves to library */}
        <button
          onClick={handleHeart}
          disabled={!!post.error || hearting}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
            hearted
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'
          )}
        >
          {hearting ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Heart size={16} className={hearted ? 'fill-white' : ''} />
          )}
          {hearted ? 'Saved!' : 'Save to Library'}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Small download */}
          <button
            onClick={() => {
              const src = layout === 'image' ? post.image
                        : layout === 'carousel' ? post.slides?.[activeSlide]?.image
                        : post.thumbnail;
              if (!src) return;
              const a = document.createElement('a');
              a.href = imgSrc(src);
              a.download = `velocity-post-${index + 1}.jpg`;
              a.click();
            }}
            disabled={!!post.error}
            className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition flex items-center justify-center"
            title="Download"
          >
            <Download size={13} />
          </button>

          {/* Reject */}
          <button
            onClick={handleReject}
            className="w-8 h-8 rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition flex items-center justify-center"
            title="Reject"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardStrategy;
