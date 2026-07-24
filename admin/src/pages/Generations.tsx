import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Film, Layers, RefreshCw } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

interface Generation {
  _id: string;
  user: { _id: string; email: string; name?: string } | null;
  brandId: { _id: string; companyName: string; industry?: string } | null;
  type: 'image' | 'carousel' | 'video';
  thumbnailBase64?: string;
  slides?: { image: string }[];
  videoUrl?: string;
  caption?: string;
  idea?: string;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

// ─── Carousel Slide Viewer ───────────────────────────────────────────────────
function CarouselSlider({ slides }: { slides: { image: string }[] }) {
  const [current, setCurrent] = useState(0);

  const getSlideUrl = (img: string) => {
    if (img.startsWith('http')) return img;
    return `data:image/jpeg;base64,${img}`;
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1));
  };

  return (
    <div className="relative w-full h-full group/slider">
      {/* Slide Image */}
      <img
        src={getSlideUrl(slides[current].image)}
        alt={`Slide ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Prev / Next Buttons — only visible on hover */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-sm text-white rounded-full p-1 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200 hover:bg-black/80"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-sm text-white rounded-full p-1 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200 hover:bg-black/80"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  i === current ? 'bg-white scale-125' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Slide Counter */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium z-10">
            {current + 1} / {slides.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Generations() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        ...(typeFilter && { type: typeFilter }),
      });
      const res = await axios.get(`${API}/generations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setGenerations(res.data.generations);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const getTypeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon size={14} className="text-blue-400" />;
    if (type === 'carousel') return <Layers size={14} className="text-purple-400" />;
    if (type === 'video') return <Film size={14} className="text-emerald-400" />;
    return <ImageIcon size={14} />;
  };

  const getSingleMediaSource = (gen: Generation) => {
    if (gen.thumbnailBase64 && gen.thumbnailBase64.startsWith('http')) return gen.thumbnailBase64;
    if (gen.thumbnailBase64) return `data:image/jpeg;base64,${gen.thumbnailBase64}`;
    if (gen.slides && gen.slides.length > 0 && gen.slides[0].image) {
      if (gen.slides[0].image.startsWith('http')) return gen.slides[0].image;
      return `data:image/jpeg;base64,${gen.slides[0].image}`;
    }
    return '';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
          AI Generations
        </h2>
        <p className="text-muted-foreground mt-1">View creatives, carousels, and videos generated by users — {pagination.total.toLocaleString()} total.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 glass-card border border-transparent p-4 rounded-xl">
        <select
          className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none w-full sm:w-44"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="carousel">Carousel</option>
          <option value="video">Video</option>
        </select>
        <button
          onClick={fetchGenerations}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground animate-pulse">
          Loading generations...
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="mx-auto mb-2 text-muted-foreground opacity-50" size={48} />
          <p className="text-muted-foreground">No generations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {generations.map((gen) => (
            <div key={gen._id} className="glass-card rounded-2xl overflow-hidden flex flex-col group border border-transparent hover:border-blue-500/30 transition-all duration-300">
              <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">

                {/* ── Carousel: use the slider component ── */}
                {gen.type === 'carousel' && gen.slides && gen.slides.length > 0 ? (
                  <CarouselSlider slides={gen.slides} />
                ) : getSingleMediaSource(gen) ? (
                  <img src={getSingleMediaSource(gen)} alt={gen.idea || 'Generated'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : gen.type === 'video' && gen.videoUrl ? (
                  <video src={gen.videoUrl} className="w-full h-full object-cover" controls muted />
                ) : (
                  <ImageIcon size={32} className="text-muted-foreground/30" />
                )}

                {/* Type badge — hidden for carousels (slider has its own counter) */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 z-10">
                  {getTypeIcon(gen.type)}
                  <span className="text-[10px] font-medium text-white uppercase tracking-wider">{gen.type}</span>
                  {gen.type === 'carousel' && gen.slides && gen.slides.length > 0 && (
                    <span className="text-[10px] text-white/60">· {gen.slides.length} slides</span>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Brand & User</p>
                  <p className="text-sm font-semibold truncate text-foreground">{gen.brandId?.companyName || 'Unknown Brand'}</p>
                  <p className="text-xs text-muted-foreground truncate">{gen.user?.email || 'Unknown User'}</p>
                </div>

                <div className="mb-3 flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Prompt / Idea</p>
                  <p className="text-xs line-clamp-3 text-foreground/80">{gen.idea || 'No prompt provided'}</p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${gen.status === 'hearted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/50 text-muted-foreground border-border'}`}>
                    {gen.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(gen.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {generations.length > 0 && (
        <div className="glass-card px-6 py-4 rounded-xl border border-transparent flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
