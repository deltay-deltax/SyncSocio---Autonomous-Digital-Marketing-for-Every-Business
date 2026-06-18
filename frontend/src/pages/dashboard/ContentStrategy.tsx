import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Layers, Video, Plus, Shuffle, Sparkles, ArrowLeft,
  Wand2, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, ShoppingBag,
  PartyPopper, Download, RefreshCw, Check, MessageSquare, Mail, Upload,
  Phone, AtSign, Paperclip, Smile, Mic, CheckCheck, AlertCircle, Library,
  Package, CheckCircle2, FileSpreadsheet, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import FestivalCalendar, { FESTIVALS_2026 } from '@/components/FestivalCalendar';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'image' | 'carousel' | 'video' | 'ecomm' | 'festival' | 'whatsapp' | 'email';
type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

// Keep the original GeneratedPost type for real API responses
interface GeneratedPost {
  image?: string | null;
  slides?: { image: string }[];
  url?: string | null;
  thumbnail?: string | null;
  caption: string;
  type: string;
  error?: string;
  subject?: string;
  template?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_BASE  = 'http://localhost:8000';
const NODE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const ASSET_CACHE_KEY = 'velocity_strategy_assets';

const modes: { id: Mode; label: string; icon: any; desc: string; accent: string }[] = [
  { id: 'image',    label: 'Image',              icon: ImageIcon,    desc: 'Single static post',         accent: 'from-sky-500/20 to-blue-500/10' },
  { id: 'carousel', label: 'Carousel',           icon: Layers,       desc: 'Multi-slide swipe',          accent: 'from-fuchsia-500/20 to-rose-500/10' },
  { id: 'video',    label: 'Video',              icon: Video,        desc: 'Reel / motion post',         accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'ecomm',    label: 'E-Comm Listing',     icon: ShoppingBag,  desc: 'Marketplace-ready creative', accent: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'festival', label: 'Festival',           icon: PartyPopper,  desc: 'Calendar-led campaigns',     accent: 'from-violet-500/20 to-indigo-500/10' },
  { id: 'whatsapp', label: 'WhatsApp Campaign',  icon: MessageSquare,desc: 'Broadcast to your list',     accent: 'from-green-500/20 to-emerald-500/10' },
  { id: 'email',    label: 'Email Campaign',     icon: Mail,         desc: 'Newsletter & promo blast',   accent: 'from-blue-500/20 to-indigo-500/10' },
];

const aspects: { id: AspectRatio; label: string; ratio: string }[] = [
  { id: '1:1',  label: '1:1',  ratio: 'Square' },
  { id: '4:5',  label: '4:5',  ratio: 'Portrait' },
  { id: '9:16', label: '9:16', ratio: 'Story / Reel' },
  { id: '16:9', label: '16:9', ratio: 'Landscape' },
  { id: '2:3',  label: '2:3',  ratio: 'Classic' },
];

const imageCounts    = [1, 2, 4, 6, 8];
const carouselCounts = [1, 2, 3];
const carouselSlides = [3, 5, 7];
const videoCounts    = [1, 2, 3, 4];

const platforms       = ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Shopify', 'Nykaa'];
const ecommImageCounts = [1, 2, 4, 6, 8];

const videoKinds = [
  { id: 'ai-ugc',    label: 'AI UGC',        desc: 'Talking-head creator-style video' },
  { id: 'img2video', label: 'Image to Video', desc: 'Animate your reference images' },
];

const languages = [
  { id: 'english',  label: 'English',  flag: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', flag: '🅷' },
  { id: 'hindi',    label: 'Hindi',    flag: '🇮🇳' },
  { id: 'tamil',    label: 'Tamil',    flag: '🪔' },
  { id: 'kannada',  label: 'Kannada',  flag: '🌺' },
];

// ── Ad composition templates ─────────────────────────────────────────────────
const AD_TEMPLATES: { id: number; label: string; icon: string; desc: string }[] = [
  { id: 1,  label: 'Product Hero + Bottom Bar',   icon: '🏷️',  desc: 'Product big, text bar at bottom' },
  { id: 2,  label: 'Bold Headline + Center',      icon: '✍️',  desc: 'Headline top, product center' },
  { id: 3,  label: 'Split: Product | Text',       icon: '⬛',  desc: 'Product left, copy right' },
  { id: 4,  label: 'Full Bleed + Overlay',        icon: '🎨',  desc: 'Product fills frame, text overlay' },
  { id: 5,  label: 'Minimal White + Caption',     icon: '⬜',  desc: 'Clean white, product centered, text below' },
  { id: 6,  label: 'Dark BG + Vibrant CTA',       icon: '🌑',  desc: 'Dark backdrop, bold neon CTA' },
  { id: 7,  label: 'Before / After Split',        icon: '🔀',  desc: 'Left = before, right = after' },
  { id: 8,  label: 'Social Proof',                icon: '⭐',  desc: 'Stars, quote, product in one frame' },
  { id: 9,  label: 'Feature List + Product',      icon: '📋',  desc: 'Bullet benefits beside product' },
  { id: 10, label: 'Urgency / Offer',             icon: '🔥',  desc: 'Big discount badge, product, deadline' },
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a File or object-URL (blob:) to base64 data-URL */
async function toBase64(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
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
  return `data:image/jpeg;base64,${src}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

const DashboardStrategy = () => {
  const navigate = useNavigate();

  // ── Stage / Mode
  const [stage, setStage] = useState<'pick' | 'builder' | 'generating' | 'results'>('pick');
  const [mode, setMode] = useState<Mode | null>(null);

  // ── Shared
  const [count, setCount] = useState<number>(4);
  const [slideCount, setSlideCount] = useState<number>(5);
  const [aspect, setAspect] = useState<AspectRatio>('1:1');
  const [idea, setIdea] = useState('');
  const [uploads, setUploads] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('english');
  const [videoKind, setVideoKind] = useState<string>('ai-ugc');

  // ── E-comm
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<string>('Amazon');
  const [ecommImgCount, setEcommImgCount] = useState<number>(4);

  // ── Image ad template (null = auto, 1–10 = specific template, -1 = all 8 variants)
  const [adTemplate, setAdTemplate] = useState<number | null>(null);

  // ── Festival
  const [festival, setFestival] = useState<string>('diwali');
  const [tone, setTone] = useState<string>('Festive sale');

  // ── WhatsApp / Email
  const [generateImage, setGenerateImage] = useState<boolean>(true);
  const [productPick, setProductPick] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignImage, setCampaignImage] = useState<string>('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const recipientsFileRef = useRef<HTMLInputElement>(null);

  // ── WhatsApp / Email 3-Box Upload states
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [creativeLibrary, setCreativeLibrary] = useState<any[]>([]);
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [selectedCampaignCreative, setSelectedCampaignCreative] = useState<any | null>(null);
  const [selectedCampaignComputerImage, setSelectedCampaignComputerImage] = useState<string | null>(null);
  const [activeCampaignImageSource, setActiveCampaignImageSource] = useState<'product' | 'creative' | 'computer' | null>(null);
  const campaignFileInput = useRef<HTMLInputElement>(null);

  // ── Products (from API)
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);

  // ── Generated results
  const [generated, setGenerated] = useState<GeneratedPost[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [showAdTemplates, setShowAdTemplates] = useState(false);
  const [computerImageSourceClass, setComputerImageSourceClass] = useState<'product' | 'creative' | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  // ── Profile
  const profile   = JSON.parse(localStorage.getItem('velocity_profile') || '{}');
  const userId    = profile._id || profile.userId || profile.id || '';
  const brandName = (profile.brandName || 'yourbrand').toLowerCase().replace(/\s+/g, '');

  // ── Fetch products
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



  // ── File handlers
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setUploads((u) => [...u, ...urls]);
  };

  const handleCampaignComputerFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const url = URL.createObjectURL(files[0]);
    setSelectedCampaignComputerImage(url);
    setActiveCampaignImageSource('computer');
  };

  const fetchCreativeLibrary = async () => {
    setLoadingCreatives(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NODE_BASE}/strategy-assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCreativeLibrary(data.creatives || []);
      }
    } catch (err) {
      console.error('[Strategy] Fetch creatives error:', err);
    } finally {
      setLoadingCreatives(false);
    }
  };

  const pickRandom = () => {
    if (products.length > 0) {
      const shuffled = [...products].sort(() => 0.5 - Math.random()).slice(0, Math.min(products.length, count));
      setSelectedProducts(shuffled);
      setUploads([]);
    } else {
      const shuffled = [...stockImages].sort(() => 0.5 - Math.random()).slice(0, 4);
      setUploads((u) => [...u, ...shuffled]);
      setSelectedProducts([]);
    }
  };

  const toggleProduct = (p: any) => {
    setSelectedProducts((prev) => {
      if (mode === 'whatsapp' || mode === 'email') {
        const exists = prev.find((x) => x._id === p._id);
        if (exists) {
          if (activeCampaignImageSource === 'product') {
            setActiveCampaignImageSource(null);
          }
          return [];
        }
        setActiveCampaignImageSource('product');
        return [p];
      } else {
        const exists = prev.find((x) => x._id === p._id);
        if (exists) return prev.filter((x) => x._id !== p._id);
        const limit = mode === 'ecomm' ? ecommImgCount : count;
        if (prev.length >= limit) return prev;
        return [...prev, p];
      }
    });
  };

  // ── Mode navigation
  const openMode = (m: Mode) => {
    setMode(m);
    setStage('builder');
    if (m === 'image')   setCount(4);
    if (m === 'carousel') setCount(2);
    if (m === 'video')   setCount(2);
    if (m === 'ecomm')   setCount(5);
    if (m === 'festival') setCount(4);
    if (m === 'whatsapp' || m === 'email') {
      setCount(1);
      setCampaignSubject('');
      setCampaignBody('');
      setCampaignImage('');
      setRecipients([]);
      setSendStatus('idle');
    }
  };

  const backToPick = () => {
    setStage('pick');
    setMode(null);
    setIdea('');
    setUploads([]);
    setProductName('');
    setProductPick('');
    setRecipients([]);
    setCampaignSubject('');
    setCampaignBody('');
    setCampaignImage('');
    setSendStatus('idle');
    setGenError(null);
    setSelectedCampaignComputerImage(null);
    setSelectedCampaignCreative(null);
    setActiveCampaignImageSource(null);
    setComputerImageSourceClass(null);
  };

  // ── Can generate guard
  const canGenerate = (() => {
    if (!mode) return false;
    if (mode === 'ecomm')    return true;
    if (mode === 'festival') return true;
    if (mode === 'whatsapp' || mode === 'email') return idea.trim().length > 4;
    return idea.trim().length > 4;
  })();

  const ecommTotal = ecommImgCount;

  const randomProduct = () => {
    const products_ = ['Hydrating Vitamin-C Serum', 'Glow Lip Tint', 'Festive Hamper', 'Saffron Night Cream', 'Limited Edition Combo', 'Detox Face Mask'];
    setProductPick(products_[Math.floor(Math.random() * products_.length)]);
  };

  const handleRecipientsFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const pattern = mode === 'email'
        ? /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
        : /(\+?\d[\d\s\-()]{7,}\d)/g;
      const matches = Array.from(new Set(text.match(pattern) || [])).map((x: string) => x.replace(/[\s\-()]/g, ''));
      setRecipients((r) => Array.from(new Set([...r, ...matches])));
    };
    reader.readAsText(files[0]);
  };

  const addRecipient = () => {
    const v = newRecipient.trim();
    if (!v) return;
    setRecipients((r) => Array.from(new Set([...r, v])));
    setNewRecipient('');
  };

  const sendCampaign = () => {
    if (!recipients.length) return;
    setSendStatus('sending');
    setTimeout(() => setSendStatus('sent'), 1800);
  };

  const generate = async (overrides?: { idea?: string; count?: number; products?: any[]; layout?: string; aspect?: string }) => {
    setStage('generating');
    setGenError(null);

    try {
      // Convert all ref images to base64 so the backend can use them
      let refImages: string[] = [];
      const currentMode = overrides?.layout || (mode === 'festival' ? 'image' : mode);
      const currentProducts = overrides?.products !== undefined ? overrides.products : selectedProducts;
      const currentIdea = overrides?.idea !== undefined ? overrides.idea : idea;
      const currentCount = overrides?.count !== undefined ? overrides.count : count;
      const currentAspect = overrides?.aspect !== undefined ? overrides.aspect : (mode === 'festival' && tone === 'Story' ? '9:16' : aspect);

      if (currentMode === 'whatsapp' || currentMode === 'email') {
        if (activeCampaignImageSource === 'product' && currentProducts[0]?.imageBase64) {
          refImages = [currentProducts[0].imageBase64];
        } else if (activeCampaignImageSource === 'creative' && selectedCampaignCreative) {
          const thumb = selectedCampaignCreative.thumbnailBase64 || selectedCampaignCreative.slides?.[0]?.image || '';
          if (thumb) {
            refImages = [thumb];
          }
        } else if (activeCampaignImageSource === 'computer' && selectedCampaignComputerImage) {
          const b64 = await toBase64(selectedCampaignComputerImage);
          refImages = [b64];
        }
      } else {
        if (currentProducts.length > 0) {
          refImages = currentProducts.map((p) => p.imageBase64).filter(Boolean);
        } else {
          refImages = await Promise.all(uploads.map((u) => toBase64(u)));
        }
      }

      const payload = {
        userId,
        layout: currentMode === 'ecomm' ? 'ecomm' : currentMode === 'festival' ? 'image' : currentMode,
        count: currentMode === 'ecomm' ? ecommTotal : currentCount,
        slideCount,
        aspectRatio: currentAspect,
        idea: currentMode === 'ecomm' ? '' : currentIdea,
        refImages,
        products: currentProducts.length > 0 ? currentProducts : undefined,
        language,
        generateImage: (currentMode === 'whatsapp' || currentMode === 'email') ? false : generateImage,
        // E-comm specific — platform + image count for shot-type rotation
        ...(currentMode === 'ecomm' && {
          platform,
          imageCount: ecommTotal,
        }),
        // Image template — null = let backend pick shots, number = specific template
        ...((currentMode === 'image' || currentMode === 'festival') && {
          adTemplate: currentCount === 8 ? -1 : adTemplate,  // -1 means generate all 8 variants
        }),
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
          return data;
        });

      promise
        .then((data) => {
          const posts = data.posts || [];
          setGenerated(posts);

          if (mode === 'whatsapp' || mode === 'email') {
            const first = posts[0] || {};
            setCampaignImage(imgSrc(first.image) || '');
            setCampaignBody(first.caption || '');
            if (mode === 'email') setCampaignSubject(first.subject || '');
          }

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
    }
  };

  const resetToBuilder = () => {
    setStage('builder');
    setGenerated([]);
    setGenError(null);
    setSendStatus('idle');
  };

  // ── Heart — save to DB + localStorage cache
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
        const keys = [ASSET_CACHE_KEY, `velocity_strategy_assets_${userId}`];
        for (const key of keys) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '[]');
            cached.unshift(data.creative);
            localStorage.setItem(key, JSON.stringify(cached));
          } catch (e) {
            console.error('[Strategy] LocalStorage save error for key:', key, e);
          }
        }
        setSavedCount((n) => n + 1);
      }
    } catch (err) {
      console.error('[Strategy] Heart error:', err);
    }
  };

  const handleReject = (index: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATING SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
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
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {mode === 'whatsapp' ? 'Drafting your WhatsApp blast 📲' : mode === 'email' ? 'Composing your email campaign ✉️' : 'Cooking up your posts ✨'}
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          {mode === 'whatsapp' || mode === 'email'
            ? 'Velocity is writing copy & laying out the creative…'
            : `Velocity AI is generating ${count} on-brand ${mode === 'video' ? 'videos' : mode === 'carousel' ? 'carousels' : 'posts'}…`}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULTS — WhatsApp / Email campaign preview
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'results' && (mode === 'whatsapp' || mode === 'email')) {
    return (
      <CampaignResults
        mode={mode}
        brandName={profile.brandName || brandName}
        image={campaignImage}
        subject={campaignSubject}
        setSubject={setCampaignSubject}
        body={campaignBody}
        setBody={setCampaignBody}
        recipients={recipients}
        setRecipients={setRecipients}
        newRecipient={newRecipient}
        setNewRecipient={setNewRecipient}
        addRecipient={addRecipient}
        recipientsFileRef={recipientsFileRef}
        handleRecipientsFile={handleRecipientsFile}
        sendStatus={sendStatus}
        sendCampaign={sendCampaign}
        back={resetToBuilder}
        regenerate={generate}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULTS — Gallery (image / carousel / video / ecomm / festival)
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'results') {
    const selectedFest = FESTIVALS_2026.find((f) => f.id === festival);
    const modeLabel = mode === 'ecomm'    ? `Listing · ${platform}`
      : mode === 'festival' && selectedFest ? `Campaign · ${selectedFest.name} ${selectedFest.emoji}`
      : mode === 'festival' ? `Campaign · ${festival}`
      : mode === 'video'    ? 'Reel · Velocity AI'
      : 'Post · Velocity AI';

    const accentGrad = mode === 'festival' ? 'from-violet-500 via-fuchsia-500 to-rose-500'
      : mode === 'ecomm'   ? 'from-emerald-400 via-teal-400 to-cyan-500'
      : mode === 'video'   ? 'from-amber-400 via-orange-500 to-rose-500'
      : mode === 'carousel' ? 'from-fuchsia-500 via-rose-500 to-pink-400'
      : 'from-sky-400 via-indigo-500 to-fuchsia-500';

    return (
      <div className="relative max-w-6xl mx-auto">
        {/* Ambient gradient backdrop */}
        <div aria-hidden className={cn('absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 bg-gradient-to-br', accentGrad)} />
        <div aria-hidden className={cn('absolute -bottom-32 -right-20 w-[360px] h-[360px] rounded-full blur-3xl opacity-20 bg-gradient-to-tr', accentGrad)} />

        {/* Header */}
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <button onClick={resetToBuilder} className="p-2 rounded-xl hover:bg-muted transition mt-1">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                <Sparkles size={11} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Fresh drop</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
                Your{' '}
                <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', accentGrad)}>
                  {mode}
                </span>{' '}
                drop is ready
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                {generated.length} on-brand {generated.length > 1 ? 'creatives' : 'creative'} · {aspect} · {languages.find((l) => l.id === language)?.label}
              </p>
            </div>
          </div>
          <div className="flex gap-2 relative">
            {/* Saved banner */}
            <AnimatePresence>
              {savedCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute -top-10 right-0 whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold"
                >
                  <Heart size={12} className="fill-rose-500" />
                  {savedCount} saved ·{' '}
                  <button onClick={() => navigate('/dashboard/assets')} className="underline underline-offset-2">
                    View Assets →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button onClick={() => generate()} variant="outline" size="sm" className="rounded-xl gap-2 h-10">
              <RefreshCw size={14} /> Regenerate
            </Button>
            <Button size="sm" className={cn('rounded-xl gap-2 h-10 bg-gradient-to-r text-white border-0 shadow-lg', accentGrad)}>
              <Download size={14} /> Export all
            </Button>
          </div>
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

        {/* Masonry / zigzag bento gallery */}
        <div className="columns-2 lg:columns-3 gap-4 space-y-4">
          {generated.map((post, i) => {
            const isBig = i % 3 === 0;
            const displaySrc = (() => {
              if (mode === 'carousel' || post.type === 'carousel') return imgSrc(post.slides?.[0]?.image);
              if (mode === 'video' || post.type === 'video')    return imgSrc(post.thumbnail);
              return imgSrc(post.image);
            })();

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="break-inside-avoid rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm group"
              >
                <div className={cn('relative w-full overflow-hidden', isBig ? 'aspect-[3/4]' : 'aspect-square')}>
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      {post.error ? (
                        <AlertCircle size={24} className="text-destructive/40" />
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Featured badge on first item */}
                  {i === 0 && (
                    <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr', accentGrad)}>
                          <div className="w-full h-full rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{brandName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-white leading-tight">{brandName}</p>
                          <p className="text-[9px] text-white/60">{modeLabel}</p>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
                        <span className="text-[9px] font-bold text-white tracking-wide">★ FEATURED</span>
                      </div>
                    </div>
                  )}

                  {/* Rank pill */}
                  {i > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[9px] font-bold">
                      #{i + 1}
                    </div>
                  )}

                  {/* Video play icon */}
                  {(mode === 'video' || post.type === 'video') && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={cn('rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl', isBig ? 'w-14 h-14' : 'w-10 h-10')}>
                        <div className={cn('border-l-white border-y-transparent', isBig ? 'border-l-[12px] border-y-[8px] ml-1' : 'border-l-[8px] border-y-[6px] ml-1')} />
                      </div>
                    </div>
                  )}

                  {/* Carousel badge */}
                  {(mode === 'carousel' || post.type === 'carousel') && (
                    <div className={cn('absolute bg-black/50 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full', i === 0 ? 'top-16 right-3' : 'top-2 right-2')}>
                      1/{post.slides?.length || slideCount}
                    </div>
                  )}

                  {/* Hover caption */}
                  <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-[11px] text-white font-medium line-clamp-2 leading-snug drop-shadow">{post.caption}</p>
                  </div>
                </div>

                {/* Card footer */}
                <div className="p-3">
                  <p className="text-xs font-medium text-foreground line-clamp-2 mb-2">{post.caption}</p>
                  <div className="flex gap-1.5">
                    <button className="flex-1 h-7 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-[10px] font-semibold flex items-center justify-center gap-1 transition">
                      <RefreshCw size={10} /> Remix
                    </button>
                    <button
                      onClick={() => handleHeart(post)}
                      className="flex-1 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Heart size={10} /> Save
                    </button>
                    <button
                      onClick={() => {
                        if (displaySrc) setPreviewUrl(displaySrc);
                      }}
                      className={cn('flex-1 h-7 rounded-lg bg-gradient-to-r text-white text-[10px] font-semibold flex items-center justify-center gap-1', accentGrad)}
                    >
                      <Check size={10} /> Use
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="relative mt-8 p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', accentGrad)}>
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ship the whole drop in one tap</p>
              <p className="text-xs text-muted-foreground">Schedule across Instagram, Facebook & more — Velocity handles the rest.</p>
            </div>
          </div>
          <Button className={cn('rounded-xl gap-2 bg-gradient-to-r text-white border-0 shadow-lg', accentGrad)}>
            <Check size={14} /> Approve & Schedule All
          </Button>
        </div>

        {/* Lightbox */}
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
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
              >
                <X size={20} />
              </button>
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-card flex items-center justify-center cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain max-w-full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PICK (landing) — mode selection grid
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'pick') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <Wand2 size={12} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary">AI Content Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            What do you want to generate today?
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Pick a format — Velocity opens a tailored brief for it.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modes.map((m, i) => (
            <motion.button
              key={m.id}
              onClick={() => openMode(m.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="group relative p-6 rounded-2xl border border-border/60 bg-card text-left overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all"
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity', m.accent)} />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center mb-4 transition">
                  <m.icon size={20} />
                </div>
                <p className="text-base font-semibold text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition">
                  Open brief <span aria-hidden>→</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUILDER — per-mode form
  // ─────────────────────────────────────────────────────────────────────────────
  const isStandard = mode === 'image' || mode === 'carousel' || mode === 'video';
  const standardCounts = mode === 'image' ? imageCounts : mode === 'carousel' ? carouselCounts : videoCounts;
  const currentMode = modes.find((m) => m.id === mode)!;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Builder header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={backToPick} className="p-2 rounded-xl hover:bg-muted transition">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <currentMode.icon size={18} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">{currentMode.label}</h1>
          <p className="text-xs text-muted-foreground">{currentMode.desc}</p>
        </div>
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

      {/* ─── STANDARD (image / carousel / video) ─── */}
      {isStandard && (
        <>
          {/* Video style picker */}
          {mode === 'video' && (
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Video style</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {videoKinds.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVideoKind(v.id)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition',
                      videoKind === v.id
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border/60 bg-card hover:border-primary/40'
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{v.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{v.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Count + Aspect */}
          <section className="mb-6">
            <div className="p-5 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/30 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  {mode === 'image' ? 'Post count' : mode === 'carousel' ? 'Carousels' : 'Videos'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {standardCounts.map((c) => (
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

              {mode === 'carousel' && (
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
          </section>

          <LanguagePicker language={language} setLanguage={setLanguage} />

          {/* ─── Ad Template Picker (image mode only) ─── */}
          {mode === 'image' && (
            <section className="mb-6 border border-border/60 rounded-2xl p-4 bg-card/40 hover:border-primary/20 transition-all duration-300">
              <div
                onClick={() => setShowAdTemplates(!showAdTemplates)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ad template
                  </span>
                  {count === 8 && (
                    <span className="text-emerald-500 text-[10px]">· All 8 variants will be generated</span>
                  )}
                  {adTemplate !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-wide">
                      {AD_TEMPLATES.find((t) => t.id === adTemplate)?.label || 'Selected'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {adTemplate !== null && count !== 8 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdTemplate(null);
                      }}
                      className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md"
                    >
                      <X size={10} /> Clear
                    </button>
                  )}
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-muted-foreground transition-transform duration-300 ease-in-out',
                      showAdTemplates && 'rotate-180 text-primary'
                    )}
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showAdTemplates && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-2">
                      {AD_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setAdTemplate(adTemplate === t.id ? null : t.id)}
                          className={cn(
                            'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                            adTemplate === t.id
                              ? 'border-primary bg-primary/8 shadow-md shadow-primary/15 ring-1 ring-primary/30'
                              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
                          )}
                        >
                          <span className="text-xl leading-none">{t.icon}</span>
                          <p className={cn(
                            'text-[10px] font-semibold leading-tight',
                            adTemplate === t.id ? 'text-primary' : 'text-foreground'
                          )}>
                            {t.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{t.desc}</p>
                          {adTemplate === t.id && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check size={9} className="text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {adTemplate === null && (
                      <p className="mt-2.5 text-[10px] text-muted-foreground">
                        No template selected — Velocity will choose the best layout for your brief.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* References — with "From Products" button kept */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Reference images <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
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
              <input ref={fileInput} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

              {/* Selected products */}
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

          {/* Uploads */}
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
      
      <IdeaBox idea={idea} setIdea={setIdea} />
    </>
  )}

      {/* ─── E-COMM ─── */}
      {mode === 'ecomm' && (
        <>
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">1 · Platform</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-semibold transition',
                    platform === p
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'bg-card border border-border text-foreground hover:border-primary/40'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">2 · Image count</p>
            <div className="flex gap-2 flex-wrap">
              {ecommImageCounts.map((c) => (
                <button
                  key={c}
                  onClick={() => setEcommImgCount(c)}
                  className={cn(
                    'flex-1 sm:flex-none sm:w-20 py-2.5 rounded-xl text-sm font-semibold transition',
                    ecommImgCount === c
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'bg-card border border-border text-foreground hover:border-primary/40'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          <LanguagePicker language={language} setLanguage={setLanguage} />

          {/* Product images — with "From Products" */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Product images <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
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
              <input ref={fileInput} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              {selectedProducts.map((p, i) => (
                <motion.div key={`prod-${p._id || i}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square rounded-xl overflow-hidden group bg-card border border-primary/40">
                  {p.imageBase64 ? <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-2 text-center"><Package size={16} className="text-muted-foreground mb-1" /><span className="text-[9px] font-medium leading-tight text-foreground line-clamp-2">{p.name}</span></div>}
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">PRODUCT</div>
                  <button onClick={() => toggleProduct(p)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 backdrop-blur text-background opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><X size={11} /></button>
                </motion.div>
              ))}
              {uploads.map((url, i) => (
                <motion.div key={`up-${i}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square rounded-xl overflow-hidden group bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setUploads((u) => u.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 backdrop-blur text-background opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><X size={11} /></button>
                </motion.div>
              ))}
            </div>
          </section>

          <IdeaBox idea={idea} setIdea={setIdea} />
        </>
      )}

      {/* ─── FESTIVAL — Calendar driven ─── */}
      {mode === 'festival' && (
        <FestivalCalendar
          brand={{
            brandName: profile.brandName,
            businessCategory: profile.businessCategory || profile.category,
            brandTone: profile.brandTone || 'warm & confident',
            primaryColor: profile.primaryColor || '#2563eb',
            secondaryColor: profile.secondaryColor || '#f59e0b',
            visualStyle: profile.visualStyle || 'modern premium',
          }}
          language={(language === 'hinglish' || language === 'hindi' ? language : 'english') as 'english' | 'hinglish' | 'hindi'}
          products={products}
          onGenerate={(data) => {
            setFestival(data.festival.id);
            setIdea(data.prompt);
            setCount(data.imageCount);
            setTone(data.postType);
            if (data.product) {
              setSelectedProducts([data.product]);
            } else {
              setSelectedProducts([]);
            }

            // Determine layout and aspect ratio overrides
            let layoutOverride = 'image';
            let aspectOverride = aspect;

            if (data.postType === 'Story') {
              aspectOverride = '9:16';
            }

            // Trigger generation with exact values to bypass React's state delay
            generate({
              idea: data.prompt,
              count: data.imageCount,
              products: data.product ? [data.product] : [],
              layout: layoutOverride,
              aspect: aspectOverride,
            });
          }}
        />
      )}

      {/* ─── WHATSAPP / EMAIL ─── */}
      {(mode === 'whatsapp' || mode === 'email') && (
        <>
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Campaign Hero Visual Source
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              
              {/* Box 1: From Product Catalog OR Uploaded from Product Picker */}
              <div
                onClick={() => {
                  if (activeCampaignImageSource === 'computer' && computerImageSourceClass === 'product') {
                    // Stay selected
                  } else if (selectedProducts[0]) {
                    setActiveCampaignImageSource('product');
                  } else {
                    setShowProductModal(true);
                  }
                }}
                className={cn(
                  'h-36 flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer relative overflow-hidden group transition-all duration-300',
                  (activeCampaignImageSource === 'product' || (activeCampaignImageSource === 'computer' && computerImageSourceClass === 'product'))
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-lg shadow-primary/5'
                    : 'border-border hover:border-primary/40 bg-card hover:bg-muted/30'
                )}
              >
                {activeCampaignImageSource === 'computer' && computerImageSourceClass === 'product' && selectedCampaignComputerImage ? (
                  <>
                    <img
                      src={selectedCampaignComputerImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                      Selected
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaignComputerImage(null);
                        setActiveCampaignImageSource(null);
                        setComputerImageSourceClass(null);
                      }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <X size={10} />
                    </button>
                    <p className="absolute bottom-7 left-3 right-3 text-left text-[11px] font-bold text-white truncate">
                      Local File
                    </p>
                    <p className="absolute bottom-2.5 left-3 right-3 text-left text-[8px] font-semibold text-white/75 uppercase tracking-widest flex items-center gap-1">
                      <Upload size={8} /> Local Upload
                    </p>
                  </>
                ) : selectedProducts[0] ? (
                  <>
                    {selectedProducts[0].imageBase64 ? (
                      <img
                        src={imgSrc(selectedProducts[0].imageBase64)}
                        alt={selectedProducts[0].name}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
                        <Package size={24} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {activeCampaignImageSource === 'product' && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                        Selected
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProducts([]);
                        if (activeCampaignImageSource === 'product') {
                          setActiveCampaignImageSource(null);
                        }
                      }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <X size={10} />
                    </button>
                    
                    <p className="absolute bottom-7 left-3 right-3 text-left text-[11px] font-bold text-white truncate">
                      {selectedProducts[0].name}
                    </p>
                    <p className="absolute bottom-2.5 left-3 right-3 text-left text-[8px] font-semibold text-white/75 uppercase tracking-widest flex items-center gap-1">
                      <ShoppingBag size={8} /> Product Catalog
                    </p>
                  </>
                ) : (
                  <div className="text-center flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <ShoppingBag size={14} />
                    </div>
                    <p className="text-xs font-bold text-foreground">Product Catalog</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Select store product</p>
                  </div>
                )}
              </div>
 
              {/* Box 2: From Creatives / Asset Library OR Uploaded from Creative Picker */}
              <div
                onClick={() => {
                  if (activeCampaignImageSource === 'computer' && computerImageSourceClass === 'creative') {
                    // Stay selected
                  } else if (selectedCampaignCreative) {
                    setActiveCampaignImageSource('creative');
                  } else {
                    setShowCreativeModal(true);
                    fetchCreativeLibrary();
                  }
                }}
                className={cn(
                  'h-36 flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer relative overflow-hidden group transition-all duration-300',
                  (activeCampaignImageSource === 'creative' || (activeCampaignImageSource === 'computer' && computerImageSourceClass === 'creative'))
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-lg shadow-primary/5'
                    : 'border-border hover:border-primary/40 bg-card hover:bg-muted/30'
                )}
              >
                {activeCampaignImageSource === 'computer' && computerImageSourceClass === 'creative' && selectedCampaignComputerImage ? (
                  <>
                    <img
                      src={selectedCampaignComputerImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                      Selected
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaignComputerImage(null);
                        setActiveCampaignImageSource(null);
                        setComputerImageSourceClass(null);
                      }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <X size={10} />
                    </button>
                    <p className="absolute bottom-7 left-3 right-3 text-left text-[11px] font-bold text-white truncate">
                      Local File
                    </p>
                    <p className="absolute bottom-2.5 left-3 right-3 text-left text-[8px] font-semibold text-white/75 uppercase tracking-widest flex items-center gap-1">
                      <Upload size={8} /> Local Upload
                    </p>
                  </>
                ) : selectedCampaignCreative ? (
                  <>
                    <img
                      src={imgSrc(selectedCampaignCreative.thumbnailBase64 || selectedCampaignCreative.slides?.[0]?.image)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {activeCampaignImageSource === 'creative' && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                        Selected
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaignCreative(null);
                        if (activeCampaignImageSource === 'creative') {
                          setActiveCampaignImageSource(null);
                        }
                      }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <X size={10} />
                    </button>
                    
                    <p className="absolute bottom-7 left-3 right-3 text-left text-[11px] font-bold text-white truncate">
                      {selectedCampaignCreative.caption || 'Saved Creative'}
                    </p>
                    <p className="absolute bottom-2.5 left-3 right-3 text-left text-[8px] font-semibold text-white/75 uppercase tracking-widest flex items-center gap-1">
                      <Heart size={8} className="fill-white/75 text-transparent" /> Creative Library
                    </p>
                  </>
                ) : (
                  <div className="text-center flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Heart size={14} />
                    </div>
                    <p className="text-xs font-bold text-foreground">Creative Library</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Select hearted post</p>
                  </div>
                )}
              </div>
 
              {/* Hidden file input for Campaign Local Upload */}
              <input
                ref={campaignFileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCampaignComputerFile(e.target.files)}
              />
            </div>
          </section>

          <IdeaBox
            idea={idea}
            setIdea={setIdea}
            placeholder={mode === 'whatsapp'
              ? 'e.g. Diwali blast — 20% off + free gift on prepaid. Short, warm, emoji-heavy.'
              : 'e.g. New collection launch — premium tone, hero image up top, single CTA to shop.'}
          />
        </>
      )}

      {/* ─── Product Selection Modal ─── */}
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
                    Pick up to {mode === 'ecomm' ? ecommImgCount : count} products. Velocity will anchor generations to these.
                  </p>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* First option: Upload from Computer */}
                  {!(mode === 'whatsapp' || mode === 'email' || mode === 'ecomm') && (
                    <button
                      onClick={() => {
                        setComputerImageSourceClass('product');
                        campaignFileInput.current?.click();
                        setShowProductModal(false);
                      }}
                      className="text-center flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition group min-h-[150px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <Upload size={16} />
                      </div>
                      <p className="text-xs font-bold text-primary">Upload Image</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">From computer</p>
                    </button>
                  )}

                  {products.map((p) => {
                    const selected = !!selectedProducts.find((x) => x._id === p._id);
                    const disabled = !selected && selectedProducts.length >= (mode === 'ecomm' ? ecommImgCount : count);
                    return (
                      <button
                        key={p._id}
                        onClick={() => toggleProduct(p)}
                        disabled={disabled}
                        className={cn(
                          'text-left relative p-3 rounded-2xl border transition overflow-hidden bg-card hover:bg-muted/30',
                          selected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : disabled ? 'border-border/40 opacity-50 cursor-not-allowed'
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
              </div>

              <div className="p-5 border-t border-border/50 shrink-0 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  <span className={cn(selectedProducts.length === (mode === 'ecomm' ? ecommImgCount : count) ? 'text-primary' : 'text-foreground')}>
                    {selectedProducts.length}
                  </span> / {mode === 'ecomm' ? ecommImgCount : count} selected
                </p>
                <Button onClick={() => setShowProductModal(false)} className="rounded-xl px-6">Done</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Creative Selection Modal (Asset Library) ─── */}
      <AnimatePresence>
        {showCreativeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowCreativeModal(false)}
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
                    <Heart size={18} className="text-rose-500 fill-rose-500" /> Select Creative
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick a hearted creative from your asset library to use in your campaign.
                  </p>
                </div>
                <button onClick={() => setShowCreativeModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {loadingCreatives ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading library...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* First option: Upload from Computer */}
                    {!(mode === 'whatsapp' || mode === 'email') && (
                      <button
                        onClick={() => {
                          setComputerImageSourceClass('creative');
                          campaignFileInput.current?.click();
                          setShowCreativeModal(false);
                        }}
                        className="text-center flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition group min-h-[150px]"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                          <Upload size={16} />
                        </div>
                        <p className="text-xs font-bold text-primary">Upload Image</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">From computer</p>
                      </button>
                    )}

                    {creativeLibrary.map((c) => {
                      const src = c.thumbnailBase64 || c.slides?.[0]?.image || '';
                      const selected = selectedCampaignCreative?._id === c._id;
                      return (
                        <button
                          key={c._id}
                          onClick={() => {
                            setSelectedCampaignCreative(c);
                            setActiveCampaignImageSource('creative');
                            setShowCreativeModal(false);
                          }}
                          className={cn(
                            'text-left relative p-3 rounded-2xl border transition overflow-hidden bg-card hover:bg-muted/30',
                            selected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border'
                          )}
                        >
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative">
                            {src ? (
                              <img src={imgSrc(src)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-muted-foreground/30" /></div>
                            )}
                            {selected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm">
                                <CheckCircle2 size={12} />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-foreground leading-tight truncate">{c.caption || 'Saved Creative'}</p>
                          <p className="text-[8px] text-muted-foreground/70 mt-0.5 capitalize">{c.type}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border/50 shrink-0 flex items-center justify-end">
                <Button onClick={() => setShowCreativeModal(false)} className="rounded-xl px-6">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Generate button ─── */}
      {mode !== 'festival' && (
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
            {mode === 'whatsapp' ? 'Generate WhatsApp message' :
             mode === 'email'    ? 'Generate email campaign' :
             `Generate ${mode === 'ecomm' ? ecommTotal : count} ${
               mode === 'video'   ? (videoKind === 'ai-ugc' ? 'UGC videos' : 'videos') :
               mode === 'carousel' ? 'carousels' :
               mode === 'ecomm'   ? 'assets' : 'posts'}`}
          </Button>
          {!canGenerate && mode !== 'ecomm' && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Tell us your idea to start ✨
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-blocks
// ─────────────────────────────────────────────────────────────────────────────

const IdeaBox = ({
  idea, setIdea, placeholder,
}: {
  idea: string;
  setIdea: (v: string) => void;
  placeholder?: string;
}) => (
  <section className="mb-6">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
      Explain your idea <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
    </p>
    <div className="relative">
      <Textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder={placeholder || 'e.g. Launching a soft pastel summer drop with 6 hero products — dreamy, sun-soaked & a little playful.'}
        className="min-h-[120px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed pr-12"
      />
      <Sparkles size={14} className="absolute top-3.5 right-4 text-primary/60" />
    </div>
  </section>
);

const LanguagePicker = ({
  language, setLanguage,
}: {
  language: string;
  setLanguage: (v: string) => void;
}) => (
  <section className="mb-6">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Caption language</p>
    <div className="flex flex-wrap gap-2">
      {languages.map((l) => (
        <button
          key={l.id}
          onClick={() => setLanguage(l.id)}
          className={cn(
            'px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2',
            language === l.id
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'bg-card border border-border text-foreground hover:border-primary/40'
          )}
        >
          <span className="text-sm">{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Results (WhatsApp / Email)
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignResultsProps {
  mode: 'whatsapp' | 'email';
  brandName: string;
  image: string;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  recipients: string[];
  setRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  newRecipient: string;
  setNewRecipient: (v: string) => void;
  addRecipient: () => void;
  recipientsFileRef: React.RefObject<HTMLInputElement | null>;
  handleRecipientsFile: (f: FileList | null) => void;
  sendStatus: 'idle' | 'sending' | 'sent';
  sendCampaign: () => void;
  back: () => void;
  regenerate: () => void;
  saveHeroImage?: () => void;
}

const CampaignResults: React.FC<CampaignResultsProps> = ({
  mode, brandName, image, subject, setSubject, body, setBody,
  recipients, setRecipients, newRecipient, setNewRecipient, addRecipient,
  recipientsFileRef, handleRecipientsFile, sendStatus, sendCampaign, back, regenerate, saveHeroImage,
}) => {
  const isWA = mode === 'whatsapp';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={back} className="p-2 rounded-xl hover:bg-muted transition">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
              {isWA ? 'WhatsApp campaign ready' : 'Email campaign ready'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Preview it, add recipients & send the blast 🚀</p>
          </div>
        </div>
        <div className="flex gap-2">
          {saveHeroImage && (
            <Button onClick={saveHeroImage} variant="outline" size="sm" className="rounded-xl gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20">
              <Heart size={14} /> Save hero image
            </Button>
          )}
          <Button onClick={regenerate} variant="outline" size="sm" className="rounded-xl gap-2">
            <RefreshCw size={14} /> Regenerate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PREVIEW */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Live preview</p>
          {isWA ? (
            /* WhatsApp phone mockup */
            <div className="rounded-3xl overflow-hidden border-[6px] border-foreground/80 shadow-2xl max-w-sm mx-auto bg-[#e5ddd5]">
              <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-3">
                <ArrowLeft size={16} />
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight">{brandName}</p>
                  <p className="text-[10px] opacity-80">online</p>
                </div>
                <Phone size={16} />
                <MoreHorizontal size={16} />
              </div>
              <div
                className="p-3 min-h-[420px] space-y-2"
                style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
              >
                <div className="ml-auto max-w-[88%] bg-[#dcf8c6] rounded-2xl rounded-tr-md shadow-sm overflow-hidden">
                  {image && (
                    <div className="p-1">
                      <img src={image} className="w-full rounded-xl aspect-square object-cover" />
                    </div>
                  )}
                  <div className="px-3 pb-2 pt-1">
                    <pre className="text-[12px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-foreground/50">
                      {time} <CheckCheck size={12} className="text-[#34B7F1]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
                <Smile size={18} className="text-foreground/50" />
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-foreground/40">Message</div>
                <Paperclip size={16} className="text-foreground/50" />
                <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white">
                  <Mic size={14} />
                </div>
              </div>
            </div>
          ) : (
            /* Email mockup */
            <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
              <div className="bg-muted/60 px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Inbox · 1 new</span>
              </div>
              <div className="p-5 space-y-4 min-h-[420px]">
                <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {brandName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{brandName}</p>
                    <p className="text-[11px] text-muted-foreground">{subject || '✨ New drop just landed'}</p>
                  </div>
                </div>
                {image && (
                  <img src={image} className="w-full rounded-xl object-cover aspect-video" />
                )}
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
              </div>
            </div>
          )}
        </div>

        {/* EDITOR + RECIPIENTS */}
        <div className="space-y-4">
          {/* Edit body */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {isWA ? 'Edit message' : 'Edit email body'}
            </p>
            {!isWA && (
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line…"
                className="rounded-xl border-border/60 bg-card h-10 text-sm mb-2"
              />
            )}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[160px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Recipients ({recipients.length})
              </p>
              <button
                onClick={() => recipientsFileRef.current?.click()}
                className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <FileSpreadsheet size={11} /> Import CSV/TXT
              </button>
              <input
                ref={recipientsFileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => handleRecipientsFile(e.target.files)}
              />
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                placeholder={isWA ? '+91 98765 43210' : 'email@example.com'}
                className="rounded-xl border-border/60 bg-card h-10 text-sm"
              />
              <Button onClick={addRecipient} variant="outline" className="rounded-xl h-10 shrink-0">Add</Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {recipients.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    {r}
                    <button onClick={() => setRecipients((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={10} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={sendCampaign}
            disabled={!recipients.length || sendStatus !== 'idle'}
            size="lg"
            className={cn(
              'w-full h-12 rounded-2xl font-bold gap-2',
              sendStatus === 'sent'
                ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                : isWA
                ? 'bg-[#25D366] hover:bg-[#20bb5a] text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
            )}
          >
            {sendStatus === 'sending' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
            ) : sendStatus === 'sent' ? (
              <><CheckCheck size={16} /> Sent to {recipients.length} recipients!</>
            ) : (
              <><Send size={16} /> {isWA ? `Send WhatsApp blast` : `Send email campaign`}{recipients.length > 0 ? ` → ${recipients.length}` : ''}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardStrategy;
