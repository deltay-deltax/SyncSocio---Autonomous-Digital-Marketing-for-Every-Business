import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Send, Sparkles, X, Loader2, Download, Package, CheckCircle2, Upload, ShoppingBag, Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useEditor } from '@/contexts/EditorContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

type Uploaded = { url: string; name: string; base64?: string; info?: string } | null;

// Product interface matching the rest of the app
interface Product {
  _id?: string;
  name: string;
  description?: string;
  price?: string;
  imageBase64: string;
  imageUrls?: string[];
  isCustomUpload?: boolean;
  keyBenefit?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function imgSrc(b64: string | undefined) {
  if (!b64) return '';
  if (b64.startsWith('data:') || b64.startsWith('http')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

export default function EditorPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    refImage,
    setRefImage,
    prodImage,
    setProdImage,
    prompt,
    setPrompt,
    result,
    setResult,
    loading,
    freeEditUsed,
    handleGenerate
  } = useEditor();

  const [isHearted, setIsHearted] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setIsHearted(false);
  }, [result]);

  const handleTouchEnd = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleHeartClick();
    }
    lastTapRef.current = now;
  };

  const handleHeartClick = async () => {
    if (!result) return;
    if (isHearted) return;

    // Optimistically update heart state and trigger visual pop feedback immediately
    setIsHearted(true);
    setShowHeartPop(true);
    setTimeout(() => {
      setShowHeartPop(false);
    }, 800);

    // Schedule the reset after a short delay
    const resetTimeout = setTimeout(() => {
      setRefImage(null);
      setProdImage(null);
      setPrompt("");
      setResult(null);
      setIsHearted(false);
    }, 1200);

    try {
      
      const response = await fetch(`${API_BASE}/strategy-assets`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          type: 'image',
          thumbnailBase64: result,
          caption: prompt || 'AI Editor generated image',
          idea: 'AI Editor generation',
          aspectRatio: refImage?.aspectRatio || '1:1'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Saved to Library! ❤️",
          description: "Image has been saved to your Asset Library."
        });
      } else {
        throw new Error('Failed to save creative');
      }
    } catch (e: any) {
      console.error(e);
      // Revert optimistic state and cancel reset if saving fails
      clearTimeout(resetTimeout);
      setIsHearted(false);
      toast({
        title: "Failed to Save",
        description: e.message || "An error occurred while saving the image.",
        variant: "destructive"
      });
    }
  };
  
  // Product Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  
  // Brand Profile
  const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        
        const res = await fetch(`${API_BASE}/products`, { credentials: 'include', headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } });
        if (res.ok) {
          const _rawJson99 = await res.json();
            const data = _rawJson99 && _rawJson99.success !== undefined ? (_rawJson99.success ? _rawJson99.data : _rawJson99) : _rawJson99;
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error('Failed to fetch products', e);
      }
    };
    fetchProducts();
  }, []);

  const handleEditResult = () => {
    if (!result) return;
    const base64Data = result.startsWith('data:') ? result.split(',')[1] : result;
    setRefImage({
      url: result,
      name: 'Generated Result',
      base64: base64Data,
      aspectRatio: refImage?.aspectRatio || "1:1"
    });
    setResult(null);
    setIsEditingResult(true);
  };

  const handleRefFile = async (file: File | undefined) => {
    if (!file) return;
    setIsEditingResult(false);
    const url = URL.createObjectURL(file);
    const b64 = await fileToBase64(file);
    
    // Calculate aspect ratio dynamically
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const ratio = img.width / img.height;
      const ratios = [
        { name: "1:1", val: 1.0 },
        { name: "4:5", val: 0.8 },
        { name: "2:3", val: 0.6667 },
        { name: "9:16", val: 0.5625 },
        { name: "16:9", val: 1.7778 }
      ];
      let closest = ratios[0];
      let minDiff = Math.abs(ratio - closest.val);
      for (let i = 1; i < ratios.length; i++) {
        const diff = Math.abs(ratio - ratios[i].val);
        if (diff < minDiff) {
          minDiff = diff;
          closest = ratios[i];
        }
      }
      setRefImage({ url, name: file.name, base64: b64, aspectRatio: closest.name });
    };
  };

  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    const customProduct: Product = {
      _id: `custom_${Date.now()}`,
      name: file.name,
      imageBase64: b64,
      isCustomUpload: true,
    };
    setProducts(prev => [customProduct, ...prev]);
  };

  const selectProduct = (p: Product) => {
    const info = [p.name, p.description, p.keyBenefit].filter(Boolean).join(" - ");
    setProdImage({
      url: imgSrc(p.imageBase64 || (p.imageUrls && p.imageUrls[0]) || ''),
      name: p.name,
      base64: p.imageBase64 || (p.imageUrls && p.imageUrls[0]) || '',
      info: info
    });
    setShowProductModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 h-[calc(100vh-8rem)] pt-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard/strategy')} 
            className="p-2 rounded-xl hover:bg-muted transition flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">AI Editor</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload a reference, select a product, and describe your edit.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-black uppercase tracking-widest border border-primary/20">
          <Sparkles className="h-3 w-3" /> Beta
        </span>
      </div>

      {/* Result area */}
      <div className="flex-1 min-h-0 rounded-3xl border border-border bg-card shadow-sm overflow-hidden relative group">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm z-10 text-muted-foreground">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full animate-pulse" />
              <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
            </div>
            <p className="text-sm font-medium animate-pulse">Generating your masterpiece…</p>
          </div>
        ) : result ? (
          <>
            <img 
              src={result} 
              alt="Generated result" 
              className="w-full h-full object-contain bg-muted/20 cursor-pointer" 
              onDoubleClick={handleHeartClick}
              onTouchEnd={handleTouchEnd}
            />
            <AnimatePresence>
              {showHeartPop && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/15 z-10 pointer-events-none"
                >
                  <Heart className="w-16 h-16 text-rose-500 fill-rose-500 filter drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end gap-3 p-4">
              <button
                onClick={handleHeartClick}
                disabled={isHearted}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-lg hover:scale-105 active:scale-95",
                  isHearted
                    ? "bg-rose-500 text-white cursor-default"
                    : "bg-white/90 backdrop-blur text-black hover:bg-white"
                )}
              >
                <Heart className={cn("h-4 w-4", isHearted && "fill-current text-white")} />
                {isHearted ? 'Saved' : 'Heart'}
              </button>

              {(!isEditingResult && !freeEditUsed) && (
                <button
                  onClick={handleEditResult}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur text-black px-4 py-2 text-xs font-bold hover:bg-white transition-colors shadow-lg hover:scale-105 active:scale-95"
                >
                  <ImagePlus className="h-4 w-4" /> Edit Result
                </button>
              )}

              <a
                href={result}
                download="ai-edit-result.png"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur text-black px-4 py-2 text-xs font-bold hover:bg-white transition-colors shadow-lg hover:scale-105 active:scale-95"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6 bg-muted/10">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Your result appears here</h2>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Add a reference image, select your product, and tell our AI what to create — a product shot, a poster, or a restyled scene.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-3xl border border-border bg-card shadow-sm p-4 flex flex-col gap-4 shrink-0">
        {/* Upload slots */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reference Upload */}
          <UploadSlot 
            label="Reference Style" 
            sublabel="Upload from computer"
            value={refImage} 
            onChange={handleRefFile} 
            onClear={() => setRefImage(null)}
            isEditingResult={isEditingResult}
            freeEditUsed={freeEditUsed}
            handleGenerate={handleGenerate}
            loading={loading}
          />
          
          {/* Product Selection */}
          <div className="relative group">
            {prodImage ? (
              <div className="relative h-28 lg:h-32 rounded-2xl overflow-hidden border border-border bg-muted group-hover:border-primary/50 transition">
                <img src={prodImage.url} alt={prodImage.name} className="w-full h-full object-contain p-2" />
                <button
                  onClick={() => setProdImage(null)}
                  className="absolute top-2 right-2 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground transition backdrop-blur"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] text-white font-medium truncate">{prodImage.name}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="h-28 lg:h-32 w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group"
              >
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold block text-foreground">Select Product</span>
                  <span className="text-[10px] uppercase tracking-widest mt-0.5 block">From Catalog</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Prompt bar */}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40 transition-shadow px-3 py-2 shadow-inner">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            rows={1}
            placeholder="Describe the edit... e.g. 'Place the product in the center with the style of the reference image'"
            className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-2 max-h-40 text-foreground placeholder:text-muted-foreground/60"
          />
          <button
            onClick={() => handleGenerate(isEditingResult && !freeEditUsed)}
            disabled={loading || !prompt.trim() || !refImage}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition hover:shadow-lg active:scale-95 mb-0.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* ─── Product Selection Modal ─── */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                    <ShoppingBag size={18} className="text-primary" /> Select Product
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick a product from your catalog or upload a new one.
                  </p>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Upload from Computer Card */}
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="text-center relative p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center min-h-[140px] transition bg-card hover:bg-muted border-border hover:border-primary/50 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center mb-3 transition shadow-sm">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-bold text-foreground">Upload Photo</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">From computer</p>
                  </button>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleModalPhotoUpload}
                  />

                  {products.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => selectProduct(p)}
                      className="text-left relative p-3 rounded-2xl border border-border transition overflow-hidden bg-card hover:bg-muted/50 hover:border-primary/40 hover:shadow-md group"
                    >
                      <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-3 relative flex items-center justify-center group-hover:bg-muted/80 transition">
                        {p.imageBase64 || (p.imageUrls && p.imageUrls.length > 0) ? (
                          <img src={imgSrc(p.imageBase64 || p.imageUrls?.[0] || "")} alt={p.name} className="w-full h-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
                        ) : (
                          <Package className="text-muted-foreground/30 h-10 w-10" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Select
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-tight truncate">{p.name}</p>
                      {p.isCustomUpload && (
                        <span className="inline-block mt-1 bg-primary/10 text-primary text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">LOCAL</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadSlot({
  label,
  sublabel,
  value,
  onChange,
  onClear,
  isEditingResult,
  freeEditUsed,
  handleGenerate,
  loading
}: {
  label: string;
  sublabel: string;
  value: Uploaded;
  onChange: (file: File | undefined) => void;
  onClear: () => void;
  isEditingResult?: boolean;
  freeEditUsed?: boolean;
  handleGenerate?: (forceEdit?: boolean) => void;
  loading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative h-28 lg:h-32 rounded-2xl overflow-hidden border border-border bg-muted/30 group-hover:border-primary/50 transition">
          <img src={value.url} alt={value.name} className="w-full h-full object-contain p-2 rounded-2xl" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 h-7 w-7 inline-flex items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground transition backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-2 rounded-b-2xl">
            <p className="text-[10px] text-white font-medium truncate tracking-wide">{value.name}</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-28 lg:h-32 w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group"
        >
          <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <span className="text-xs font-semibold block text-foreground">{label}</span>
            <span className="text-[10px] uppercase tracking-widest mt-0.5 block">{sublabel}</span>
          </div>
        </button>
      )}
    </div>
  );
}
