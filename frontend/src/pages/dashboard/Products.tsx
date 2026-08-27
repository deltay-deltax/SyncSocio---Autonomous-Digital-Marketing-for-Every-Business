import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Edit2, Trash2, Package, Tag, IndianRupee,
  Sparkles, Upload, Check, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, safeSetItem } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const CACHE_KEY = 'syncsocio_products';

// ── IndexedDB helpers (avoids localStorage 5MB quota on base64 images) ────────
const IDB_NAME = 'SyncSocioProductCache';
const IDB_STORE = 'products';

function openProductDB(): Promise<IDBDatabase> {
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

async function idbSet(key: string, val: any): Promise<void> {
  try {
    const db = await openProductDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  } catch (e) { console.warn('[ProductCache] IDB set failed:', e); }
}

async function idbGet(key: string): Promise<any> {
  try {
    const db = await openProductDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  } catch (e) { console.warn('[ProductCache] IDB get failed:', e); return null; }
}

interface Product {
  _id?: string;
  imageBase64: string;
  imageUrls?: string[];
  specifications?: { label: string; value: string }[];
  name: string;
  description: string;
  price: string;
  offerPrice: string;
  keyBenefit: string;
  serviceProvider?: string;
  verifiedBenefits?: string[];
  proofPoints?: string[];
  offerDetails?: string;
  guarantee?: string;
  variantDetails?: string[];
  sourceUrl?: string;
  adVisualDescription?: string;
  adVisualDescriptionSecondary?: string;
  adVisualDescriptionStatus?: string;
}

const emptyProduct = (): Product => ({
  imageBase64: '',
  name: '',
  description: '',
  price: '',
  offerPrice: '',
  keyBenefit: '',
  serviceProvider: '',
  verifiedBenefits: [],
  proofPoints: [],
  offerDetails: '',
  guarantee: '',
  variantDetails: [],
  sourceUrl: '',
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

const cleanPriceValue = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  // Step 1: Strip all currency symbols, letters, and spaces — keep digits, commas, and period
  // This handles "Rs. 249", "₹1,199", "$29.99", "MRP 999", etc.
  const stripped = str.replace(/[^\d,.]/g, '');
  // Step 2: Remove commas (Indian thousand separators like "1,199" → "1199")
  const withoutCommas = stripped.replace(/,/g, '');
  // Step 3: Extract the first valid number (handles leading periods from "Rs." leftovers)
  const match = withoutCommas.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : '';
};

const formatPriceDisplay = (val: any, isSaas: boolean): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (!str) return '';
  if (isSaas) return str;
  const numericStr = cleanPriceValue(str);
  const num = parseFloat(numericStr);
  if (!isNaN(num)) {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return str.startsWith('₹') ? str : `₹${str}`;
};

const getDiscountPercentage = (priceStr: any, offerPriceStr: any): number | null => {
  const priceNum = parseFloat(cleanPriceValue(priceStr));
  const offerPriceNum = parseFloat(cleanPriceValue(offerPriceStr));
  if (!isNaN(priceNum) && !isNaN(offerPriceNum) && priceNum > 0) {
    return Math.round((1 - offerPriceNum / priceNum) * 100);
  }
  return null;
};

// ── Product Form Modal ───────────────────────────────────────────────────────
const ProductForm: React.FC<{
  initial?: Product;
  onSave: (p: Product) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
  const SAAS_BRAND_CATEGORIES = [
    'Mobile Apps',
    'IT & Technical Tools',
    'Gaming & Entertainment',
    'SaaS & Digital',
    'Coaching & Consulting',
    'Architecture',
    'Financial Services',
    'Real Estate & Property',
    'Travel & Hospitality',
    'Education & Training',
    'Newsletters',
    'Online Marketplaces',
    'Services'
  ];
  const isSaas = SAAS_BRAND_CATEGORIES.includes(profile.businessCategory || '');

  const [form, setForm] = useState<Product>(() => {
    const f = initial ?? emptyProduct();
    if (!isSaas) {
      f.price = cleanPriceValue(f.price);
      f.offerPrice = cleanPriceValue(f.offerPrice);
    }
    return f;
  });
  const [saving, setSaving] = useState(false);
  const [imgPreview, setImgPreview] = useState(initial?.imageBase64 || '');
  const [link, setLink] = useState('');
  const [scraping, setScraping] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [frontUrlInput, setFrontUrlInput] = useState('');
  const [backUrlInput, setBackUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Product, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const replaceTarget = useRef<'front' | 'back'>('front');

  const handleImageFile = async (file: File) => {
    const b64 = await fileToBase64(file);
    if (replaceTarget.current === 'front') {
      set('imageBase64', b64);
    } else {
      const newUrls = [...(form.imageUrls || [])];
      if (newUrls.length > 0) newUrls[0] = b64;
      else newUrls.push(b64);
      set('imageUrls', newUrls);
    }
    setImgPreview(b64);
  };

  const handleAddImageFile = async (file: File) => {
    const b64 = await fileToBase64(file);
    const newUrls = [...(form.imageUrls || []), b64];
    set('imageUrls', newUrls);
    setImgPreview(b64);
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

      // Clean scraped prices
      let scrapedPrice = isSaas ? (data.price || '') : cleanPriceValue(data.price || '');
      let scrapedOffer = isSaas ? (data.offerPrice || '') : cleanPriceValue(data.offerPrice || '');

      // Fix swapped prices: offerPrice should always be LESS than price (it's the discounted price).
      // If the AI returned them in wrong order, swap them back.
      if (!isSaas && scrapedPrice && scrapedOffer) {
        const priceNum = parseFloat(scrapedPrice);
        const offerNum = parseFloat(scrapedOffer);
        if (!isNaN(priceNum) && !isNaN(offerNum) && offerNum > priceNum) {
          [scrapedPrice, scrapedOffer] = [scrapedOffer, scrapedPrice];
        }
      }

      setForm(f => ({
        ...f,
        name: data.name || f.name,
        serviceProvider: data.serviceProvider || f.serviceProvider || '',
        description: data.description || f.description,
        price: scrapedPrice || f.price,
        offerPrice: scrapedOffer || f.offerPrice,
        keyBenefit: data.keyBenefit || f.keyBenefit,
        verifiedBenefits: data.verifiedBenefits || [],
        proofPoints: data.proofPoints || [],
        offerDetails: data.offerDetails || '',
        guarantee: data.guarantee || '',
        variantDetails: data.variantDetails || [],
        sourceUrl: data.sourceUrl || link,
        imageBase64: (() => {
          // Agent always returns images in imageUrls[0]=front, imageUrls[1]=back.
          // If imageBase64 is empty, promote imageUrls[0] → imageBase64 (FRONT).
          if (data.imageBase64) return data.imageBase64;
          return data.imageUrls?.[0] || f.imageBase64;
        })(),
        imageUrls: (() => {
          // If we promoted imageUrls[0] to imageBase64, shift the rest so imageUrls[0] = BACK.
          if (!data.imageBase64 && data.imageUrls?.length > 0) {
            return data.imageUrls.slice(1);
          }
          return data.imageUrls || f.imageUrls;
        })(),
        specifications: data.specifications || f.specifications
      }));
      if (data.imageBase64) {
        setImgPreview(data.imageBase64);
      } else if (data.imageUrls?.[0]) {
        setImgPreview(data.imageUrls[0]);
      }
      setLink('');
    } catch (e) {
      console.error(e);
      alert(isSaas ? 'Failed to scrape service details from link.' : 'Failed to scrape product from link.');
    } finally {
      setScraping(false);
    }
  };

  const handleParseText = async () => {
    const allImages = Array.from(new Set([form.imageBase64, ...(form.imageUrls || [])].filter(Boolean)));
    if (!rawText.trim() && allImages.length === 0) return;
    setParsing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ai/parse-product-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: rawText, imageUrls: allImages })
      });
      if (!res.ok) throw new Error('Parsing failed');
      const data = await res.json();

      let scrapedPrice = isSaas ? (data.price || '') : cleanPriceValue(data.price || '');
      let scrapedOffer = isSaas ? (data.offerPrice || '') : cleanPriceValue(data.offerPrice || '');

      if (!isSaas && scrapedPrice && scrapedOffer) {
        const priceNum = parseFloat(scrapedPrice);
        const offerNum = parseFloat(scrapedOffer);
        if (!isNaN(priceNum) && !isNaN(offerNum) && offerNum > priceNum) {
          [scrapedPrice, scrapedOffer] = [scrapedOffer, scrapedPrice];
        }
      }

      setForm(f => ({
        ...f,
        name: data.name || f.name,
        description: data.description || f.description,
        price: scrapedPrice || f.price,
        offerPrice: scrapedOffer || f.offerPrice,
        keyBenefit: data.keyBenefit || f.keyBenefit,
        verifiedBenefits: data.verifiedBenefits || [],
        proofPoints: data.proofPoints || [],
        offerDetails: data.offerDetails || '',
        guarantee: data.guarantee || '',
        variantDetails: data.variantDetails || [],
        specifications: data.specifications || f.specifications
      }));
      setRawText('');
      setShowRawText(false);
    } catch (e) {
      console.error(e);
      alert('Failed to parse text. Please try again.');
    } finally {
      setParsing(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isSaas
                ? (initial?._id ? 'Edit Service/Feature' : 'Add Service/Feature')
                : (initial?._id ? 'Edit Product' : 'Add Product')
              }
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSaas ? 'Fill in your service details' : 'Fill in your product details'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {/* Autofill from Link */}
          {!initial?._id && (
            <>
              <div className="p-3.5 sm:p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} /> Auto-fill from URL
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={isSaas ? "Paste service/feature URL..." : "Paste product URL..."}
                    className="flex-1 min-w-0 px-3.5 sm:px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    type="button"
                    onClick={handleAutofill}
                    disabled={!link.trim() || scraping}
                    className="rounded-xl px-4 shrink-0 bg-primary text-primary-foreground font-bold text-xs h-10"
                  >
                    {scraping ? <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> : 'Scrape'}
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground/80 mt-2 flex items-start gap-1.5 leading-tight">
                  <span className="text-amber-500 font-bold shrink-0">⚠️ Note:</span>
                  <span>AI agents may make mistakes while scraping. Please verify scraped details before saving.</span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-2 pb-1 opacity-70">
                <div className="flex-1 h-px bg-border/80"></div>
                <span className="mx-3 text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em]">OR</span>
                <div className="flex-1 h-px bg-border/80"></div>
              </div>
            </>
          )}

          {/* Image Upload */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {isSaas ? 'Service / Feature Graphic' : 'Product Image'}
            </p>
            <div className="relative">
              {(() => {
                const frontImg = form.imageBase64 || '';
                const backImg = form.imageUrls?.[0] || '';
                const hasAnyImage = Boolean(frontImg || backImg);
                const currentImg = imgPreview || (frontImg ? frontImg : backImg);

                return hasAnyImage ? (
                  <div className="flex flex-col gap-2">
                    <div className="w-full h-40 rounded-2xl border border-primary/20 overflow-hidden relative bg-muted flex items-center justify-center group">
                      <img src={imgSrc(currentImg)} alt="" className="w-full h-full object-contain p-2" />

                      {/* Overlay for Changing/Removing image */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            replaceTarget.current = currentImg === frontImg ? 'front' : 'back';
                            if (currentImg === frontImg) {
                              fileRef.current?.click();
                            } else {
                              addFileRef.current?.click();
                            }
                          }}
                          className="bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 px-3 py-1.5 shadow"
                        >
                          <Upload size={13} /> Change
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const target = currentImg === frontImg ? 'front' : 'back';
                            let newBase64 = form.imageBase64;
                            let newUrls = [...(form.imageUrls || [])];

                            if (target === 'front') {
                              set('imageBase64', '');
                              newBase64 = '';
                            } else {
                              if (newUrls.length > 0) newUrls[0] = '';
                              set('imageUrls', newUrls);
                            }
                            setImgPreview('');

                            // Immediately persist removal to the server
                            if (form._id) {
                              try {
                                const token = localStorage.getItem('token');
                                await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/products/${form._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ imageBase64: newBase64, imageUrls: newUrls })
                                });
                              } catch (err) {
                                console.error("Failed to instantly remove from server", err);
                              }
                            }
                          }}
                          className="text-xs font-semibold rounded-xl flex items-center gap-1.5 px-3 py-1.5 shadow"
                        >
                          <Trash2 size={13} /> Remove
                        </Button>
                      </div>

                      <Edit2 size={8} /> Click / Hover to edit
                    </div>

                    {hasAnyImage && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin items-center">
                        {/* Front Thumbnail */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative">
                            <div
                              onClick={() => {
                                if (frontImg) setImgPreview(frontImg);
                                else fileRef.current?.click();
                              }}
                              className={cn(
                                "w-14 h-14 shrink-0 rounded-lg border flex items-center justify-center cursor-pointer transition overflow-hidden",
                                frontImg ? "bg-muted hover:border-primary" : "border-dashed border-border hover:bg-primary/5 hover:text-primary text-muted-foreground",
                                currentImg === frontImg && frontImg ? "border-primary ring-2 ring-primary/30" : "border-border"
                              )}
                            >
                              {frontImg ? (
                                <img src={imgSrc(frontImg)} alt="Front" className="w-full h-full object-cover" />
                              ) : (
                                <Plus size={18} />
                              )}
                            </div>
                            {/* Front remove ✕ */}
                            {frontImg && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  set('imageBase64', '');
                                  if (imgPreview === frontImg) setImgPreview('');
                                  if (form._id) {
                                    try {
                                      const token = localStorage.getItem('token');
                                      await fetch(`${API_BASE}/products/${form._id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ imageBase64: '', imageUrls: form.imageUrls })
                                      });
                                    } catch {}
                                  }
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition-colors z-10"
                                aria-label="Remove front image"
                              >
                                <X size={8} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            Front
                          </span>
                        </div>

                        {/* Back Thumbnail */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative">
                            <div
                              onClick={() => {
                                if (backImg) setImgPreview(backImg);
                                else addFileRef.current?.click();
                              }}
                              className={cn(
                                "w-14 h-14 shrink-0 rounded-lg border flex items-center justify-center cursor-pointer transition overflow-hidden",
                                backImg ? "bg-muted hover:border-primary" : "border-dashed border-border hover:bg-primary/5 hover:text-primary text-muted-foreground",
                                currentImg === backImg && backImg ? "border-primary ring-2 ring-primary/30" : "border-border"
                              )}
                            >
                              {backImg ? (
                                <img src={imgSrc(backImg)} alt="Back" className="w-full h-full object-cover" />
                              ) : (
                                <Plus size={18} />
                              )}
                            </div>
                            {/* Back remove ✕ */}
                            {backImg && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const newUrls = [...(form.imageUrls || [])];
                                  if (newUrls.length > 0) newUrls[0] = '';
                                  set('imageUrls', newUrls);
                                  if (imgPreview === backImg) setImgPreview('');
                                  if (form._id) {
                                    try {
                                      const token = localStorage.getItem('token');
                                      await fetch(`${API_BASE}/products/${form._id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ imageBase64: form.imageBase64, imageUrls: newUrls })
                                      });
                                    } catch {}
                                  }
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition-colors z-10"
                                aria-label="Remove back image"
                              >
                                <X size={8} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            Back
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={async (e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-40 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition duration-200">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {isSaas ? 'Upload service graphic/icon' : (
                        <>Upload or Drag <span className="text-primary font-black">FRONT</span> product photo</>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">PNG, JPG, AVIF, WebP, SVG</p>
                  </div>
                )
              })()}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
            <input ref={addFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAddImageFile(e.target.files[0])} />

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input
                  value={frontUrlInput}
                  onChange={(e) => setFrontUrlInput(e.target.value)}
                  placeholder="Paste Front Image URL..."
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!frontUrlInput.trim()) return;
                    set('imageBase64', frontUrlInput);
                    setImgPreview(frontUrlInput);
                    setFrontUrlInput('');
                  }}
                  disabled={!frontUrlInput.trim()}
                  className="rounded-xl px-4 shrink-0 bg-secondary text-secondary-foreground font-bold text-xs h-10"
                >
                  Set Front
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  value={backUrlInput}
                  onChange={(e) => setBackUrlInput(e.target.value)}
                  placeholder="Paste Back Image URL (Optional) Required for Ecomm Lisiting..."
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!backUrlInput.trim()) return;
                    const newUrls = [...(form.imageUrls || [])];
                    if (newUrls.length > 0) newUrls[0] = backUrlInput;
                    else newUrls.push(backUrlInput);
                    set('imageUrls', newUrls);
                    setImgPreview(backUrlInput);
                    setBackUrlInput('');
                  }}
                  disabled={!backUrlInput.trim()}
                  className="rounded-xl px-4 shrink-0 bg-secondary text-secondary-foreground font-bold text-xs h-10"
                >
                  Set Back
                </Button>
              </div>
            </div>
          </div>

          {/* Raw Text Parser */}
          {!initial?._id && (
            <div className="mt-8 p-4 sm:p-5 bg-gradient-to-br from-primary/[0.03] to-secondary/[0.05] border border-primary/10 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex flex-col mb-3 relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles size={14} /> Smart Auto-fill (Text)
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Paste raw text (ingredients, descriptions) below. We'll  magically fill the entire form!
                </p>
              </div>
              <div className="space-y-3 relative z-10">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`e.g.\nPremium Skin Brightening Facewash\nOriginal price: ₹450. Current price: ₹380.\nEnriched with Niacinamide to deeply cleanse and nourish...\nBenefits: Controls oil, deep hydration...`}
                  className="w-full h-28 px-3.5 sm:px-4 py-3 rounded-xl border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none scrollbar-thin shadow-inner"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleParseText}
                    disabled={parsing}
                    className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm h-10 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto transition-all"
                  >
                    {parsing ? <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} /> Auto-fill Everything</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sleek Divider */}
          <div className="py-8 flex items-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border"></div>
            <span className="mx-4 text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50">Manual Form</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border"></div>
          </div>

          {/* Name */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {isSaas ? 'Service / Feature Name *' : 'Product Name *'}
            </p>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={isSaas ? "e.g. Simple Storage Service (S3)" : "e.g. SPF 50 Sunscreen"}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Service Provider (SaaS only) */}
          {isSaas && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Service Provider</p>
              <input
                value={form.serviceProvider || ''}
                onChange={(e) => set('serviceProvider', e.target.value)}
                placeholder="e.g. AWS, Google Cloud, Stripe, Salesforce"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Description</p>
              <span className={cn('text-[10px] font-medium', form.description.length > 900 ? 'text-destructive' : 'text-muted-foreground/60')}>
                {form.description.length}/1000
              </span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => {
                set('description', e.target.value.slice(0, 1000));
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder={isSaas ? "e.g. Highly scalable and secure object storage service." : "e.g. Broad spectrum PA++++ with Niacinamide"}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none overflow-hidden"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {isSaas ? 'Pricing' : 'Price'}
              </p>
              <div className="relative">
                {!isSaas && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>}
                <input
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder={isSaas ? "e.g. $0.023/GB or Pay-as-you-go" : "599"}
                  className={cn(
                    "w-full pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30",
                    !isSaas ? "pl-7" : "px-4"
                  )}
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {isSaas ? 'Promo / Offer Pricing' : 'Offer Price'}{' '}
                <span className="font-normal opacity-60">(opt)</span>
              </p>
              <div className="relative">
                {!isSaas && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>}
                <input
                  value={form.offerPrice}
                  onChange={(e) => set('offerPrice', e.target.value)}
                  placeholder={isSaas ? "e.g. Free Tier or $0.020/GB" : "479"}
                  className={cn(
                    "w-full pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30",
                    !isSaas ? "pl-7" : "px-4"
                  )}
                />
              </div>
            </div>
          </div>

          {/* AI Visual Description (Read-Only) */}
          {form.adVisualDescription && (
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex flex-col gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-violet-500" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">AI Visual Description (Front)</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed italic opacity-90">
                  {form.adVisualDescription}
                </p>
              </div>

              {form.adVisualDescriptionSecondary && (
                <div className="pt-3 border-t border-violet-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-violet-500" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">AI Visual Description (Back)</p>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed italic opacity-90">
                    {form.adVisualDescriptionSecondary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Key Benefit */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Key Benefit</p>
            <input
              value={form.keyBenefit}
              onChange={(e) => set('keyBenefit', e.target.value)}
              placeholder={isSaas ? "e.g. 99.999999999% data durability" : "e.g. UVA protection indoors"}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Scraped Specifications */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Specifications (Size, Fit, Nutrition, etc.)</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-primary"
                onClick={() => set('specifications', [...(form.specifications || []), { label: '', value: '' }])}
              >
                + Add
              </Button>
            </div>

            {(form.specifications || []).length > 0 ? (
              <div className="flex flex-col gap-2 bg-muted/10 p-3 rounded-xl border border-border/50">
                {form.specifications!.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      value={spec.label}
                      onChange={(e) => {
                        const newSpecs = [...form.specifications!];
                        newSpecs[idx].label = e.target.value;
                        set('specifications', newSpecs);
                      }}
                      placeholder="Label (e.g. Fit)"
                      className="w-1/3 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <textarea
                      value={spec.value}
                      onChange={(e) => {
                        const newSpecs = [...form.specifications!];
                        newSpecs[idx].value = e.target.value;
                        set('specifications', newSpecs);
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      placeholder="Value"
                      rows={1}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[32px] overflow-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newSpecs = [...form.specifications!];
                        newSpecs.splice(idx, 1);
                        set('specifications', newSpecs);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition mt-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No specifications added.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border/50 bg-card flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11 text-xs sm:text-sm font-semibold">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="flex-1 rounded-xl bg-primary h-11 text-xs sm:text-sm font-bold shadow-md"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={15} className="mr-1.5" /> {isSaas ? 'Save Service' : 'Save Product'}</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Products Page ────────────────────────────────────────────────────────
const Products = () => {
  const { userId, cacheKey, isSaas, productLimit } = React.useMemo(() => {
    const p = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
    const planName = (p.userPlan || p.selectedPlan || p.plan || '').toLowerCase();
    const isPro = planName.includes('pro') || planName.includes('agency');
    const isGrowth = planName.includes('growth') || planName.includes('elite');
    const SAAS_CATS = [
      'Mobile Apps',
      'IT & Technical Tools',
      'Gaming & Entertainment',
      'SaaS & Digital',
      'Coaching & Consulting',
      'Architecture',
      'Financial Services',
      'Real Estate & Property',
      'Travel & Hospitality',
      'Education & Training',
      'Newsletters',
      'Online Marketplaces',
      'Services'
    ];
    const uid = p.user || p._id || 'default';
    return {
      userId: uid,
      cacheKey: `${CACHE_KEY}_${uid}`,
      isSaas: SAAS_CATS.includes(p.businessCategory || ''),
      productLimit: isPro ? 500 : isGrowth ? 200 : 50,
    };
  }, []);

  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchProducts = async () => {
    // ── Step 1: Try cache first (IDB → localStorage fallback) ──────────────
    let hasCached = false;
    try {
      const cached = await idbGet(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) {
        setProducts(cached);
        hasCached = true;
        console.log('[Products] ⚡ Cache hit:', cached.length, 'products (instant)');
      }
    } catch {
      try {
        const ls = localStorage.getItem(cacheKey);
        if (ls) {
          const parsed = JSON.parse(ls);
          if (parsed.length > 0) {
            setProducts(parsed);
            hasCached = true;
            console.log('[Products] ⚡ localStorage cache hit:', parsed.length, 'products');
          }
        }
      } catch { }
    }

    // Only show skeleton when there's nothing to display yet
    if (!hasCached) setLoading(true);

    // ── Step 2: Background API refresh ─────────────────────────────────────
    try {
      console.log('[Products] Fetching →', `${API_BASE}/products`);
      const res = await fetch(`${API_BASE}/products`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const list = data.products || [];
        console.log('[Products] ✅ API:', list.length, 'products');
        setProducts(list);
        await idbSet(cacheKey, list);
        try { localStorage.removeItem(cacheKey); } catch { }
      } else {
        if (!hasCached && (res.status === 401 || res.status === 403)) {
          setProducts([]);
        }
      }
    } catch (e: any) {
      console.log('[Products] ❌ Network error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Run once on mount — userId is stable for the lifetime of the session
  useEffect(() => { fetchProducts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const originalProducts = [...products];
    const updated = products.filter((p) => p._id !== id);
    setProducts(updated);

    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      await idbSet(cacheKey, updated);
    } catch (e) {
      setProducts(originalProducts);
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-2.5">
            <Package size={12} className="text-violet-500 shrink-0" />
            <span className="text-[11px] font-semibold text-violet-500">
              {isSaas ? "Service & Feature Catalog" : "Product Catalog"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {isSaas ? "Services & Features" : "Products"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {isSaas
              ? "Add your services & features — SyncSocio will use them to generate targeted ad creatives."
              : "Add your products — SyncSocio will use them to generate targeted ad creatives."}
          </p>
          <div className="mt-3 flex items-start gap-2.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 text-xs leading-relaxed shadow-sm w-full">
            <span className="text-red-600 dark:text-red-400 font-black uppercase tracking-wider text-[11px] shrink-0 mt-0.5">⚠️ Notice:</span>
            <span className="flex-1">
              AI agents may make mistakes while parsing or scraping details. Please verify the information yourself.
              <span className="block mt-1"><strong>Missing an image?</strong> Edit the product and upload it manually to unlock AI visual description. You can add a back and front photo of your product.</span>
            </span>
          </div>
        </div>
        <Button
          onClick={() => {
            if (products.length >= productLimit) {
              toast({
                title: 'Product Limit Reached',
                description: `Your plan allows up to ${productLimit} products. Please delete some or upgrade to add more.`,
                variant: 'destructive'
              });
              return;
            }
            setEditing(null); setShowForm(true);
          }}
          className="w-full sm:w-auto shrink-0 rounded-2xl bg-primary gap-2 shadow-lg shadow-primary/20 h-11 px-5 text-xs sm:text-sm font-bold"
        >
          <Plus size={16} /> {isSaas ? "Add Service/Feature" : "Add Product"}
        </Button>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
              {/* Image skeleton */}
              <div className="h-44 bg-muted animate-pulse relative overflow-hidden">
                <div
                  className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              </div>
              {/* Text skeleton */}
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                <div className="h-3 w-full rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.05}s` }} />
                <div className="h-3 w-2/3 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.1}s` }} />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="h-5 w-12 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

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
          <h3 className="text-lg font-bold text-foreground mb-2">
            {isSaas ? "No services or features yet" : "No products yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            {isSaas
              ? "Add your first service or feature and SyncSocio will anchor ad creatives directly to it."
              : "Add your first product and SyncSocio will anchor ad creatives directly to it."}
          </p>
          <Button onClick={() => setShowForm(true)} className="rounded-2xl gap-2">
            <Plus size={16} /> {isSaas ? "Add your first service/feature" : "Add your first product"}
          </Button>
        </motion.div>
      )}

      {/* Product grid */}
      {!loading && (
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
                className="group bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col justify-between"
              >
                {/* Product image */}
                <div
                  onClick={() => {
                    const mainImage = p.imageBase64 || (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : '');
                    if (mainImage) setPreviewUrl(imgSrc(mainImage));
                  }}
                  className={cn("relative h-44 bg-muted/40 overflow-hidden", (p.imageBase64 || (p.imageUrls && p.imageUrls.length > 0)) && "cursor-zoom-in")}
                >
                  {(p.imageBase64 || (p.imageUrls && p.imageUrls.length > 0)) ? (
                    <img src={imgSrc(p.imageBase64 || p.imageUrls?.[0] || '')} alt={p.name} className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={40} className="text-muted-foreground/20" />
                    </div>
                  )}
                  {p.imageUrls && p.imageUrls.length > 1 && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                      +{p.imageUrls.length - 1} images
                    </div>
                  )}

                  {/* Action buttons (Always visible on mobile/touch screens, sleek hover on desktop) */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-all duration-200">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(p);
                        setShowForm(true);
                      }}
                      className="w-8 h-8 rounded-xl bg-white/95 dark:bg-card/95 backdrop-blur-md text-foreground hover:text-primary hover:bg-white dark:hover:bg-card hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md border border-border/50"
                      title={isSaas ? "Edit Service" : "Edit Product"}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p._id) handleDelete(p._id);
                      }}
                      disabled={deleting === p._id}
                      className="w-8 h-8 rounded-xl bg-white/95 dark:bg-card/95 backdrop-blur-md text-destructive hover:bg-destructive/10 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-md border border-border/50"
                      title={isSaas ? "Delete Service" : "Delete Product"}
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
                  {p.serviceProvider && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-500 border border-violet-500/20">
                        {p.serviceProvider}
                      </span>
                    </div>
                  )}
                  <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{p.name}</h3>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{p.description}</p>
                  )}

                  {/* Price row */}
                  {(p.price || p.offerPrice) && (
                    <div className="flex items-center gap-2 mb-2">
                      {p.offerPrice && (
                        <span className="text-sm font-black text-primary">
                          {formatPriceDisplay(p.offerPrice, isSaas)}
                        </span>
                      )}
                      {p.price && (
                        <span className={cn('text-xs font-medium', p.offerPrice ? 'text-muted-foreground line-through' : 'text-foreground font-bold')}>
                          {formatPriceDisplay(p.price, isSaas)}
                        </span>
                      )}
                      {!isSaas && p.offerPrice && p.price && getDiscountPercentage(p.price, p.offerPrice) !== null && (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          {getDiscountPercentage(p.price, p.offerPrice)}% off
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

                  {p.specifications && p.specifications.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <div className="flex flex-wrap gap-1">
                        {p.specifications.slice(0, 3).map((spec, sIdx) => (
                          <span key={sIdx} className="inline-flex bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded border border-border/50 max-w-[140px] truncate" title={`${spec.label}: ${spec.value}`}>
                            <span className="font-semibold mr-1">{spec.label}:</span>{spec.value}
                          </span>
                        ))}
                        {p.specifications.length > 3 && (
                          <span className="inline-flex bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded border border-border/50">
                            +{p.specifications.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )} {/* end !loading grid */}

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
