import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Edit2, Trash2, Package, Tag, IndianRupee,
  Sparkles, Upload, Check, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const CACHE_KEY = 'velocity_products';

interface Product {
  _id?: string;
  imageBase64: string;
  name: string;
  description: string;
  price: string;
  offerPrice: string;
  keyBenefit: string;
}

const emptyProduct = (): Product => ({
  imageBase64: '',
  name: '',
  description: '',
  price: '',
  offerPrice: '',
  keyBenefit: '',
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function imgSrc(b64: string) {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

// ── Product Form Modal ───────────────────────────────────────────────────────
const ProductForm: React.FC<{
  initial?: Product;
  onSave: (p: Product) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<Product>(initial ?? emptyProduct());
  const [saving, setSaving] = useState(false);
  const [imgPreview, setImgPreview] = useState(initial?.imageBase64 || '');
  const [link, setLink] = useState('');
  const [scraping, setScraping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Product, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageFile = async (file: File) => {
    const b64 = await fileToBase64(file);
    setImgPreview(b64);
    set('imageBase64', b64);
  };

  const handleAutofill = async () => {
    if (!link.trim()) return;
    setScraping(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ai/scrape-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: link })
      });
      if (!res.ok) throw new Error('Scraping failed');
      const data = await res.json();
      
      setForm(f => ({
        ...f,
        name: data.name || f.name,
        description: data.description || f.description,
        price: data.price || f.price,
        offerPrice: data.offerPrice || f.offerPrice,
        keyBenefit: data.keyBenefit || f.keyBenefit,
        imageBase64: data.imageBase64 || f.imageBase64
      }));
      if (data.imageBase64) {
        setImgPreview(data.imageBase64);
      }
      setLink('');
    } catch (e) {
      console.error(e);
      alert('Failed to scrape product from link.');
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground">{initial?._id ? 'Edit Product' : 'Add Product'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in your product details</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Autofill from Link */}
          {!initial?._id && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                <Sparkles size={12}/> Auto-fill with AI
              </p>
              <div className="flex gap-2">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Paste product URL..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button 
                  onClick={handleAutofill} 
                  disabled={!link.trim() || scraping}
                  className="rounded-xl px-4 bg-primary text-primary-foreground"
                >
                  {scraping ? <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> : 'Scrape'}
                </Button>
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Product Image</p>
            <button
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full h-40 rounded-2xl border-2 border-dashed transition overflow-hidden relative group',
                imgPreview ? 'border-primary/40' : 'border-border hover:border-primary hover:bg-primary/5'
              )}
            >
              {imgPreview ? (
                <>
                  <img src={imgSrc(imgPreview)} alt="" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <p className="text-white text-xs font-semibold flex items-center gap-1.5"><Upload size={14} /> Change</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Upload product photo</p>
                  <p className="text-[10px] text-muted-foreground/60">PNG, JPG, AVIF, WebP</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
          </div>

          {/* Name */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Product Name *</p>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. SPF 50 Sunscreen"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Short Description</p>
              <span className={cn('text-[10px] font-medium', form.description.length > 180 ? 'text-destructive' : 'text-muted-foreground/60')}>
                {form.description.length}/200
              </span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value.slice(0, 200))}
              placeholder="e.g. Broad spectrum PA++++ with Niacinamide"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Price</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <input
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="599"
                  className="w-full pl-7 pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Offer Price <span className="font-normal opacity-60">(opt)</span></p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <input
                  value={form.offerPrice}
                  onChange={(e) => set('offerPrice', e.target.value)}
                  placeholder="479"
                  className="w-full pl-7 pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Key Benefit */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Key Benefit</p>
            <input
              value={form.keyBenefit}
              onChange={(e) => set('keyBenefit', e.target.value)}
              placeholder="e.g. UVA protection indoors"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="flex-1 rounded-xl bg-primary"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={14} className="mr-1.5" /> Save Product</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Products Page ────────────────────────────────────────────────────────
const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchProducts = async () => {
    setLoading(true);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) setProducts(JSON.parse(cached));
    try {
      const res = await fetch(`${API_BASE}/products`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.products || []));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async (p: Product) => {
    try {
      const isEdit = !!editing?._id;
      const url = isEdit ? `${API_BASE}/products/${editing!._id}` : `${API_BASE}/products`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        await fetchProducts();
        setShowForm(false);
        setEditing(null);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const updated = products.filter((p) => p._id !== id);
      setProducts(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } finally { setDeleting(null); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-3">
            <Package size={12} className="text-violet-500" />
            <span className="text-[11px] font-semibold text-violet-500">Product Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Add your products — Velocity will use them to generate targeted ad creatives.</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="rounded-2xl bg-primary gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-28 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-5">
            <Package size={32} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No products yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Add your first product and Velocity will anchor ad creatives directly to it.
          </p>
          <Button onClick={() => setShowForm(true)} className="rounded-2xl gap-2">
            <Plus size={16} /> Add your first product
          </Button>
        </motion.div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {products.map((p, i) => (
            <motion.div
              key={p._id || i}
              layout
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.04 }}
              className="group bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all"
            >
              {/* Product image */}
              <div 
                onClick={() => {
                  if (p.imageBase64) setPreviewUrl(imgSrc(p.imageBase64));
                }}
                className={cn("relative h-44 bg-muted overflow-hidden", p.imageBase64 && "cursor-zoom-in")}
              >
                {p.imageBase64 ? (
                  <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={40} className="text-muted-foreground/20" />
                  </div>
                )}

                {/* Action buttons hover */}
                <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                      setShowForm(true);
                    }}
                    className="w-8 h-8 rounded-xl bg-white/80 backdrop-blur text-foreground hover:bg-white transition flex items-center justify-center shadow-sm"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (p._id) handleDelete(p._id);
                    }}
                    disabled={deleting === p._id}
                    className="w-8 h-8 rounded-xl bg-white/80 backdrop-blur text-destructive hover:bg-white transition flex items-center justify-center shadow-sm"
                  >
                    {deleting === p._id ? (
                      <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{p.name}</h3>
                {p.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{p.description}</p>
                )}

                {/* Price row */}
                {(p.price || p.offerPrice) && (
                  <div className="flex items-center gap-2 mb-2">
                    {p.offerPrice && (
                      <span className="text-sm font-black text-primary">₹{p.offerPrice}</span>
                    )}
                    {p.price && (
                      <span className={cn('text-xs font-medium', p.offerPrice ? 'text-muted-foreground line-through' : 'text-foreground font-bold')}>
                        ₹{p.price}
                      </span>
                    )}
                    {p.offerPrice && p.price && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        {Math.round((1 - parseFloat(p.offerPrice) / parseFloat(p.price)) * 100)}% off
                      </span>
                    )}
                  </div>
                )}

                {p.keyBenefit && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <Sparkles size={11} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">{p.keyBenefit}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProductForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

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
              className="max-w-[90vw] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-card flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt="Product Preview"
                className="w-full h-auto max-h-[80vh] object-contain max-w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
