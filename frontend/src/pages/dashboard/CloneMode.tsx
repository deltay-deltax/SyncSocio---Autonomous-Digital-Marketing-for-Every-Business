import React, { useState, useEffect, useRef } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { Check, Sparkles, ArrowLeft, Wand2, Loader2, Heart, Download } from "lucide-react";
import { CLONE_TEMPLATES, type CloneTemplate, type Product } from "@/lib/clone-templates";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

type Step = "template" | "configure" | "result";

const breakpointColumnsObj = {
  default: 4,
  1024: 3,
  768: 2,
  640: 2
};

const urlToBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getImageDimensions = (base64: string): Promise<{ width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64;
  });
};

export default function ClonePage() {
  const { profile, startBackgroundClone, backgroundTasks, viewingTask, clearViewingTask } = useOutletContext<any>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("template");
  const [template, setTemplate] = useState<CloneTemplate | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [isHearted, setIsHearted] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/products`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error('Failed to fetch products', e);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!currentTaskId || !backgroundTasks) return;
    const task = backgroundTasks.find((t: any) => t.id === currentTaskId);
    if (!task) return;

    if (task.status === 'success') {
      const posts = task.posts || [];
      const first = posts[0] || {};
      if (first.image) {
        setResult(first.image);
        setStep("result");
        setIsHearted(false);
      }
      setCurrentTaskId(null);
    } else if (task.status === 'error') {
      setCurrentTaskId(null);
    }
  }, [backgroundTasks, currentTaskId]);

  useEffect(() => {
    if (viewingTask && viewingTask.status === 'success' && viewingTask.mode === 'clone') {
      const posts = viewingTask.posts || [];
      const first = posts[0] || {};
      if (first.image) {
        setResult(first.image);
        setStep("result");
        setIsHearted(false);
      }
      const timer = setTimeout(() => {
        if (clearViewingTask) clearViewingTask();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [viewingTask, clearViewingTask]);

  const generate = async () => {
    if (!template || !product) return;
    setLoading(true);
    try {
      const templateBase64 = await urlToBase64(template.image);
      const priceStr = product.offerPrice ? `Price: ${product.offerPrice} (Original: ${product.price})` : product.price ? `Price: ${product.price}` : null;
      const prodInfo = [product.name, product.description, product.keyBenefit, priceStr].filter(Boolean).join(" - ");

      const dims = await getImageDimensions(templateBase64);
      let calculatedAspectRatio = "1:1";
      const ratio = dims.width / dims.height;
      if (ratio > 1.5) calculatedAspectRatio = "16:9";
      else if (ratio > 0.9) calculatedAspectRatio = "1:1";
      else if (ratio > 0.7) calculatedAspectRatio = "4:5";
      else calculatedAspectRatio = "9:16";

      const payload = {
        ref_image: templateBase64,
        prod_image: product.imageBase64 || "",
        prod_info: prodInfo,
        logo_image: profile?.logo || "",
        instruction: `Make a visually appealing ad sticking to the same template. Adapt the background and overall design colors to match the brand's primary color palette and tone. Any text on the template must be decided by you based on the product info. If product pricing is not provided in the product info, you MUST remove any pricing text from the image, even if the template has pricing. Additional notes from user: ${instructions}`,
        aspectRatio: calculatedAspectRatio,
      };

      if (startBackgroundClone) {
        const tId = await startBackgroundClone(payload);
        if (tId) {
          setCurrentTaskId(tId);
        }
      } else {
        throw new Error('Background task system not initialized');
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Generation Failed",
        description: e.message || "An error occurred during generation.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHeartClick = async () => {
    if (!result || isHearted) return;

    setIsHearted(true);
    setShowHeartPop(true);
    setTimeout(() => {
      setShowHeartPop(false);
    }, 800);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/strategy-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'image',
          thumbnailBase64: result,
          caption: instructions || `Cloned ${template?.name}`,
          idea: 'Clone Mode generation',
          aspectRatio: '4:5'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Saved to Library! ❤️",
          description: "Image has been saved to your Asset Library."
        });
      } else {
        setIsHearted(false);
        toast({
          title: "Failed to save",
          description: "Could not save the image to your library.",
          variant: "destructive"
        });
      }
    } catch (e) {
      setIsHearted(false);
      console.error('Save failed', e);
    }
  };

  const handleTouchEnd = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleHeartClick();
    }
    lastTapRef.current = now;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-4 select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex items-start justify-between mb-8 shrink-0">
          <div className="flex items-start gap-3">
            <Link 
              to="/dashboard/strategy" 
              className="p-2 rounded-xl hover:bg-muted transition mt-1 flex-shrink-0"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </Link>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-black uppercase tracking-widest border border-primary/20 mb-2">
                <Sparkles className="h-3 w-3" /> Clone Mode
              </span>
              <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
                Clone a winning template
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl">
                Pick a template, tell us the product, add any custom notes — we'll clone the style with your brand.
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(["template", "configure", "result"] as Step[]).map((s) => {
            const active = step === s;
            const labels = { template: "1 · Template", configure: "2 · Configure", result: "3 · Result" } as const;
            return (
              <span
                key={s}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest border ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                }`}
              >
                {labels[s]}
              </span>
            );
          })}
        </div>

        {step === "template" && (
          <section className="rounded-3xl border border-border bg-card shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold mb-5">Choose a template</h2>
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {CLONE_TEMPLATES.filter((t) => {
                const isSaasMode = profile?.businessCategory?.toLowerCase().includes('saas') || profile?.businessCategory?.toLowerCase().includes('software');
                const isSaasTemplate = t.category.toLowerCase().includes('saas') || t.category.toLowerCase().includes('sas');
                return isSaasMode ? isSaasTemplate : !isSaasTemplate;
              }).map((t) => {
                const selected = template?.id === t.id;
                return (
                  <div key={t.id} className="mb-4">
                    <button
                      onClick={() => {
                        setTemplate(t);
                        setStep("configure");
                      }}
                      className={`group w-full relative text-left rounded-2xl overflow-hidden transition ${
                        selected ? "ring-2 ring-primary/50" : "hover:ring-2 hover:ring-primary/20"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <img src={t.image} alt={t.name} className="w-full h-auto object-contain rounded-2xl group-hover:scale-105 transition" />
                      </div>
                      {selected && (
                        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </Masonry>
            <div className="mt-8 text-center text-xs text-muted-foreground/60 max-w-lg mx-auto leading-relaxed">
              Templates adapted from "50+ High Converting Ecommerce Ads" by DesignGuru, licensed under CC BY 4.0. Modified by SyncSocio.<br />
              <a href="https://www.godesignguru.com/" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground hover:underline">
                https://www.godesignguru.com/
              </a>
            </div>
          </section>
        )}

        {step === "configure" && template && (
          <section className="grid md:grid-cols-[280px_1fr] gap-6">
            <div className="rounded-3xl border border-border bg-card shadow-sm p-4">
              <div className="rounded-xl overflow-hidden aspect-[4/5] flex items-center justify-center">
                <img src={template.image} alt={template.name} className="w-full h-full object-contain" />
              </div>
              <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary">{template.category}</div>
              <div className="font-display font-semibold text-sm">{template.name}</div>
              <button
                onClick={() => setStep("template")}
                className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Pick another template
              </button>
            </div>

            <div className="rounded-3xl border border-border bg-card shadow-sm p-6 space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Choose a product</h2>
                <p className="text-sm text-muted-foreground mb-4">The clone will be tailored around this.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((p) => {
                    const sel = product?._id === p._id;
                    const imgSrc = p.imageBase64.startsWith('data:') || p.imageBase64.startsWith('http') ? p.imageBase64 : `data:image/jpeg;base64,${p.imageBase64}`;
                    return (
                      <button
                        key={p._id || p.name}
                        onClick={() => setProduct(p)}
                        className={`rounded-2xl border overflow-hidden text-left transition ${
                          sel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square bg-muted">
                          <img src={imgSrc} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 text-xs font-semibold truncate bg-card">{p.name}</div>
                      </button>
                    );
                  })}
                  {products.length === 0 && (
                     <div className="col-span-full text-sm text-muted-foreground p-4 text-center border rounded-xl border-dashed">
                        No products found. Please add a product in the Studio first!
                     </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-display text-lg font-semibold flex items-center justify-between">
                  Optional instructions
                </label>
                <p className="text-sm text-muted-foreground mb-3">Tone, color mood, must-have text, brand notes…</p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="e.g. Keep it minimal, use warm beige tones, headline should say 'Softer, every day.'"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setStep("template")}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    Back
                  </button>
                  {currentTaskId ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cloning in background...
                      </span>
                      <button
                        onClick={() => {
                          setCurrentTaskId(null);
                          navigate('/dashboard', { replace: true });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary/20"
                      >
                        Run in background
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generate}
                      disabled={!product || loading}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {loading ? "Starting..." : "Generate clones"}
                    </button>
                  )}
                </div>
            </div>
          </section>
        )}

        {step === "result" && result && (
          <section className="rounded-3xl border border-border bg-card shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display text-lg font-semibold">Your clone</h2>
                <p className="text-sm text-muted-foreground">
                  {template && product ? (
                    <>
                      Cloned <span className="font-semibold text-foreground">{template.name}</span> for <span className="font-semibold text-foreground">{product.name}</span>
                    </>
                  ) : (
                    "Generated from background task"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {template && product ? (
                  <>
                    <button
                      onClick={() => setStep("configure")}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Tweak inputs
                    </button>

                  </>
                ) : (
                  <button
                    onClick={() => {
                      setResult(null);
                      setStep("template");
                    }}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Create Another
                  </button>
                )}
              </div>
            </div>

            {instructions && (
              <div className="mb-5 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mt-0.5">Notes</span>
                  <p>{instructions}</p>
                </div>
              </div>
            )}

            <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-border aspect-[4/5] bg-muted relative group">
              <img 
                src={result} 
                alt="Clone Result" 
                className="w-full h-full object-cover cursor-pointer" 
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

              {/* Toolbar */}
              <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleHeartClick}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur text-black flex items-center justify-center shadow hover:scale-110 active:scale-95 transition"
                  title="Save to Library"
                >
                  <Heart className={isHearted ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4"} />
                </button>
                <a
                  href={result}
                  download="clone-result.png"
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur text-black flex items-center justify-center shadow hover:scale-110 active:scale-95 transition"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
