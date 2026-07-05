import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Layers, Video, Plus, Shuffle, Sparkles, ArrowLeft, ArrowRight,
  Wand2, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, ShoppingBag,
  PartyPopper, Download, RefreshCw, Check, MessageSquare, Mail, Upload,
  Phone, AtSign, Paperclip, Smile, Mic, CheckCheck, AlertCircle, Library,
  Package, CheckCircle2, FileSpreadsheet, ChevronDown, Copy, Folder, ExternalLink, Edit3, Lock, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn, safeSetItem } from '@/lib/utils';
import { useNavigate, useOutletContext, useLocation, useBlocker } from 'react-router-dom';
import FestivalCalendar, { FESTIVALS_2026 } from '@/components/FestivalCalendar';
import Masonry from 'react-masonry-css';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const breakpointColumnsObj = {
  default: 3,
  1024: 2,
  640: 1
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'all_in_one' | 'image' | 'carousel' | 'video' | 'ecomm' | 'festival' | 'whatsapp' | 'email' | 'edit_media';
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
  sectionType?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
const NODE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const ASSET_CACHE_KEY = 'syncsocio_strategy_assets';

const modes: { id: Mode; label: string; icon: any; desc: string; accent: string }[] = [
  { id: 'all_in_one', label: 'All In One', icon: Wand2, desc: 'Generate complete marketing pack', accent: 'from-indigo-500/20 via-purple-500/10 to-pink-500/5' },
  { id: 'image', label: 'Image', icon: ImageIcon, desc: 'Single static post', accent: 'from-sky-500/20 to-blue-500/10' },
  { id: 'carousel', label: 'Carousel', icon: Layers, desc: 'Multi-slide swipe', accent: 'from-fuchsia-500/20 to-rose-500/10' },
  { id: 'video', label: 'Video', icon: Video, desc: 'Reel / motion post', accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'ecomm', label: 'E-Comm Listing', icon: ShoppingBag, desc: 'Marketplace-ready creative', accent: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'festival', label: 'Festival', icon: PartyPopper, desc: 'Calendar-led campaigns', accent: 'from-violet-500/20 to-indigo-500/10' },
  // { id: 'whatsapp', label: 'WhatsApp Campaign', icon: MessageSquare, desc: 'Broadcast to your list', accent: 'from-green-500/20 to-emerald-500/10' },
  { id: 'email', label: 'Email Campaign', icon: Mail, desc: 'Newsletter & promo blast', accent: 'from-blue-500/20 to-indigo-500/10' },
];

const aspects: { id: AspectRatio; label: string; ratio: string }[] = [
  { id: '1:1', label: '1:1', ratio: 'Square' },
  { id: '4:5', label: '4:5', ratio: 'Portrait' },
  { id: '9:16', label: '9:16', ratio: 'Story / Reel' },
  { id: '16:9', label: '16:9', ratio: 'Landscape' },
  { id: '2:3', label: '2:3', ratio: 'Classic' },
];

const imageCounts = [1, 2, 4, 6, 8];
const carouselCounts = [1, 2, 3];
const carouselSlides = [1, 2, 3, 5, 7];
const videoCounts = [1, 2, 3, 4];

const platforms = ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Shopify', 'Nykaa'];
const ecommImageCounts = [1, 2, 4, 6, 8];

const videoKinds = [
  { id: 'ai-ugc', label: 'AI UGC', desc: 'Talking-head creator-style video' },
  { id: 'img2video', label: 'Image to Video', desc: 'Animate your reference images' },
];

const MOTION_PRESETS = [
  { id: 'zoom', label: 'Dynamic Zoom', desc: 'Gradually zoom into the product with a cinematic slow-motion focus.', promptModifier: 'cinematic slow-motion dynamic zoom on the product, clean focal pull' },
  { id: 'spin', label: 'Product Orbit', desc: 'Smoothly rotate around the product to display it from multiple angles.', promptModifier: '360-degree smooth orbit rotation around the product showcasing its design details' },
  { id: 'fluid', label: 'Fluid Reveal', desc: 'Make the product rise into view with a smooth liquid splash or mist.', promptModifier: 'the product rises dynamically with a smooth fluid splash transition and soft atmospheric mist' },
  { id: 'pan', label: 'Cinematic Pan', desc: 'Slowly glide the camera horizontally across the product.', promptModifier: 'slow horizontal camera pan across the product, cinematic side-lighting' },
  { id: 'pop', label: 'Bounce & Pop', desc: 'A lively, playful bounce that makes the product pop into view.', promptModifier: 'playful bounce and pop reveal, energetic motion, clean studio backdrop' },
  { id: 'melt', label: 'Melt In', desc: 'A liquid melting effect that transitions the backdrop organically.', promptModifier: 'organic liquid melt reveal, product stays sharp, smooth physics transition' },
];

const languages = [
  { id: 'english', label: 'English', flag: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', flag: '🅷' },
  { id: 'hindi', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { id: 'marathi', label: 'Marathi (मराठी)', flag: '🌾' },
  { id: 'bengali', label: 'Bengali (বাংলা)', flag: '🌸' },
  { id: 'gujarati', label: 'Gujarati (ગુજરાતી)', flag: '🪁' },
  { id: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🌾' },
  { id: 'tamil', label: 'Tamil (தமிழ்)', flag: '🪔' },
  { id: 'telugu', label: 'Telugu (தெలుగు)', flag: '🌟' },
  { id: 'kannada', label: 'Kannada (ಕನ್ನಡ)', flag: '🌺' },
  { id: 'malayalam', label: 'Malayalam (മലയാളം)', flag: '🌴' },
  { id: 'odia', label: 'Odia (ଓଡ଼ିଆ)', flag: '🐚' },
];

// ── Ad composition templates ─────────────────────────────────────────────────
const AD_TEMPLATES: { id: number; label: string; icon: string; desc: string }[] = [
  { id: 1, label: 'Product Hero + Bottom Bar', icon: '🏷️', desc: 'Product big, text bar at bottom' },
  { id: 2, label: 'Bold Headline + Center', icon: '✍️', desc: 'Headline top, product center' },
  { id: 3, label: 'Split: Product | Text', icon: '⬛', desc: 'Product left, copy right' },
  { id: 4, label: 'Full Bleed + Overlay', icon: '🎨', desc: 'Product fills frame, text overlay' },
  { id: 5, label: 'Minimal White + Caption', icon: '⬜', desc: 'Clean white, product centered, text below' },
  { id: 6, label: 'Dark BG + Vibrant CTA', icon: '🌑', desc: 'Dark backdrop, bold neon CTA' },
  { id: 7, label: 'Before / After Split', icon: '🔀', desc: 'Left = before, right = after' },
  { id: 8, label: 'Social Proof', icon: '⭐', desc: 'Stars, quote, product in one frame' },
  { id: 9, label: 'Feature List + Product', icon: '📋', desc: 'Bullet benefits beside product' },
  { id: 10, label: 'Urgency / Offer', icon: '🔥', desc: 'Big discount badge, product, deadline' },
];

// ── SaaS Creative Format Tracks ───────────────────────────────────────────────
// IDs 101-104 = Text-led (no image ref needed)
// IDs 105-106 = Image/UI-led (dashboard screenshot anchors the output)
type SaasTrack = 'text_led' | 'image_led';
interface SaasFormat {
  id: number;
  track: SaasTrack;
  label: string;
  icon: string;
  tagline: string;
  desc: string;
}
const SAAS_FORMAT_TRACKS: SaasFormat[] = [
  {
    id: 101, track: 'text_led', icon: '⚡', label: 'Outcome-led',
    tagline: 'Bold result. Zero clutter.',
    desc: '"Cut content time by 80%" — logo — CTA. Pure typography, no UI imagery. Notion/Linear style.',
  },
  {
    id: 102, track: 'text_led', icon: '📊', label: 'Stat-led',
    tagline: 'One big number. Nothing else.',
    desc: '"₹50,000 saved per month" in a massive display font on a clean background.',
  },
  {
    id: 103, track: 'text_led', icon: '⭐', label: 'Social Proof',
    tagline: 'Real voice. Real result.',
    desc: 'AI headshot + testimonial quote + star rating card. No product shown.',
  },
  {
    id: 104, track: 'text_led', icon: '🔀', label: 'Before / After',
    tagline: 'Show the transformation.',
    desc: 'Left = chaos. Right = calm + automated. Text/illustrated split — no actual UI needed.',
  },
  {
    id: 105, track: 'image_led', icon: '🔍', label: 'Feature Callout',
    tagline: 'One feature. Maximum impact.',
    desc: 'Close-up of a single UI element from your screenshot with a bold callout annotation.',
  },
  {
    id: 106, track: 'image_led', icon: '🖥', label: 'Dashboard Hero',
    tagline: 'Your UI as the star.',
    desc: 'Dashboard fills 70% of frame anchored from your screenshot. Metric bar at bottom.',
  },
];

const aspectClass: Record<AspectRatio, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '2:3': 'aspect-[2/3]',
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

// Simple IndexedDB helper for caching large datasets
const dbName = 'SyncSocioAssetCache';
const storeName = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setCache(key: string, val: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(val, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[Cache] IndexedDB set failed:', e);
  }
}

async function getCache(key: string): Promise<any> {
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

// ── Product Cache IDB Helpers ────────────────────────────────────────────────
const IDB_PRODUCT_NAME = 'SyncSocioProductCache';
const IDB_PRODUCT_STORE = 'products';
const PRODUCT_CACHE_KEY = 'syncsocio_products';

function openProductDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_PRODUCT_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_PRODUCT_STORE)) {
        db.createObjectStore(IDB_PRODUCT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function setProductCache(key: string, val: any): Promise<void> {
  try {
    const db = await openProductDB();
    const tx = db.transaction(IDB_PRODUCT_STORE, 'readwrite');
    tx.objectStore(IDB_PRODUCT_STORE).put(val, key);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  } catch (e) { console.warn('[ProductCache] IDB set failed:', e); }
}

async function getProductCache(key: string): Promise<any> {
  try {
    const db = await openProductDB();
    const tx = db.transaction(IDB_PRODUCT_STORE, 'readonly');
    const req = tx.objectStore(IDB_PRODUCT_STORE).get(key);
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  } catch (e) { console.warn('[ProductCache] IDB get failed:', e); return null; }
}

type Studio = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconTint: string;
  iconBg: string;
  tags: { label: string; tint: string }[];
  cta: { label: string; tint: string };
  to: string;
  image: string;
  featured?: boolean;
  wide?: boolean;
  hoverBorder?: string;
};

const STUDIOS: Studio[] = [
  {
    id: "all_in_one",
    title: "All In One",
    subtitle: "Generate a complete marketing pack",
    icon: Wand2,
    iconTint: "text-indigo-600",
    iconBg: "bg-indigo-100",
    tags: [
      { label: "Post", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
      { label: "Video", tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
    ],
    cta: { label: "Generate Pack", tint: "text-indigo-600" },
    to: "/dashboard?mode=all_in_one",
    image: "/assets/Creatives_icon/studio-allinone.jpg",
    featured: true,
    hoverBorder: "hover:border-indigo-400 hover:ring-1 hover:ring-indigo-400",
  },
  {
    id: "image",
    title: "Image",
    subtitle: "Single static post",
    icon: ImageIcon,
    iconTint: "text-blue-600",
    iconBg: "bg-blue-100",
    tags: [
      { label: "Product", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
      { label: "Offer", tint: "bg-orange-50 text-orange-700 ring-orange-100" },
    ],
    cta: { label: "Start Creating", tint: "text-blue-600" },
    to: "/dashboard?mode=image",
    image: "/assets/Creatives_icon/studio-image.jpg",
    hoverBorder: "hover:border-blue-400 hover:ring-1 hover:ring-blue-400",
  },
  {
    id: "carousel",
    title: "Carousel",
    subtitle: "Multi-slide swipe storytelling",
    icon: Layers,
    iconTint: "text-violet-600",
    iconBg: "bg-violet-100",
    tags: [
      { label: "Tips", tint: "bg-violet-50 text-violet-700 ring-violet-100" },
      { label: "Guide", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
    ],
    cta: { label: "Build Carousel", tint: "text-violet-600" },
    to: "/dashboard?mode=carousel",
    image: "/assets/Creatives_icon/studio-carousel.jpg",
    hoverBorder: "hover:border-violet-400 hover:ring-1 hover:ring-violet-400",
  },
  {
    id: "video",
    title: "Video",
    subtitle: "Reel / motion post",
    icon: Video,
    iconTint: "text-emerald-600",
    iconBg: "bg-emerald-100",
    tags: [
      { label: "Reels", tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
      { label: "AI UGC", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
    ],
    cta: { label: "Create Video", tint: "text-emerald-600" },
    to: "/dashboard?mode=video",
    image: "/assets/Creatives_icon/studio-video.jpg",
    hoverBorder: "hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400",
  },
  {
    id: "ecomm",
    title: "E-Comm Listing",
    subtitle: "Marketplace-ready creative",
    icon: ShoppingBag,
    iconTint: "text-orange-600",
    iconBg: "bg-orange-100",
    tags: [
      { label: "Product", tint: "bg-orange-50 text-orange-700 ring-orange-100" },
      { label: "Listing", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
    ],
    cta: { label: "Create Listing", tint: "text-orange-600" },
    to: "/dashboard?mode=ecomm",
    image: "/assets/Creatives_icon/studio-ecomm.jpg",
    hoverBorder: "hover:border-orange-400 hover:ring-1 hover:ring-orange-400",
  },
  {
    id: "festival",
    title: "Festival",
    subtitle: "Calendar-led campaigns",
    icon: PartyPopper,
    iconTint: "text-pink-600",
    iconBg: "bg-pink-100",
    tags: [
      { label: "Diwali", tint: "bg-red-50 text-red-700 ring-red-100" },
      { label: "+ More", tint: "bg-slate-50 text-slate-600 ring-slate-200" },
    ],
    cta: { label: "Browse Festivals", tint: "text-pink-600" },
    to: "/dashboard?mode=festival",
    image: "/assets/Creatives_icon/studio-festival.jpg",
    hoverBorder: "hover:border-pink-400 hover:ring-1 hover:ring-pink-400",
  },
  /*
  {
    id: "whatsapp",
    title: "WhatsApp Campaign",
    subtitle: "Broadcast messages to your list",
    icon: MessageSquare,
    iconTint: "text-emerald-600",
    iconBg: "bg-emerald-100",
    tags: [
      { label: "Promotion", tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
      { label: "Offer", tint: "bg-orange-50 text-orange-700 ring-orange-100" },
      { label: "Reminder", tint: "bg-pink-50 text-pink-700 ring-pink-100" },
    ],
    cta: { label: "Create Campaign", tint: "text-emerald-600" },
    to: "/dashboard?mode=whatsapp",
    image: "/assets/Creatives_icon/studio-whatsapp.png",
    hoverBorder: "hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400",
  },
  */
  {
    id: "email",
    title: "Email Campaign",
    subtitle: "Newsletter & promo blast",
    icon: Mail,
    iconTint: "text-violet-600",
    iconBg: "bg-violet-100",
    tags: [
      { label: "Newsletter", tint: "bg-violet-50 text-violet-700 ring-violet-100" },
      { label: "Offer", tint: "bg-pink-50 text-pink-700 ring-pink-100" },
    ],
    cta: { label: "Design Email", tint: "text-violet-600" },
    to: "/dashboard?mode=email",
    image: "/assets/Creatives_icon/studio-email.jpg",
    hoverBorder: "hover:border-violet-400 hover:ring-1 hover:ring-violet-400",
  },
];

const StudioCard: React.FC<{ s: Studio; i: number; onPick: (id: Mode) => void }> = ({ s, i, onPick }) => {
  const Icon = s.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.04 }}
      className={cn("h-full", s.wide && "md:col-span-3", !s.wide && "md:col-span-2")}
    >
      <button
        onClick={() => onPick(s.id as Mode)}
        className={cn(
          "group relative flex flex-col w-full h-full min-h-[210px] text-left overflow-hidden rounded-3xl border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant",
          s.featured
            ? "border-transparent bg-gradient-to-br from-indigo-50/60 via-white to-white"
            : "border-transparent",
          s.hoverBorder
        )}
      >
        {/* Right image — absolutely positioned so it never affects left column height */}
        <div className="absolute right-0 top-0 bottom-0 w-[140px] md:w-[170px] flex items-center justify-center pointer-events-none">
          <img
            src={s.image}
            alt={`${s.title} preview`}
            loading="lazy"
            className={cn(
              "h-full w-full object-contain transition-transform duration-500",
              s.id === "video" && "rotate-3"
            )}
          />
        </div>

        {/* Left content — pr ensures it never overlaps the image */}
        <div className="flex flex-col flex-1 min-w-0 pr-[150px] md:pr-[180px]">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner shrink-0",
              s.iconBg,
            )}
          >
            <Icon size={20} className={s.iconTint} />
          </div>
          <h3 className="mt-3 font-display text-base font-black tracking-tight text-foreground leading-tight">
            {s.title}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {s.subtitle}
          </p>

          {/* Pills — single row, no wrap */}
          <div className="mt-3 flex items-center gap-1.5 flex-nowrap">
            {s.tags.map((t) => (
              <span
                key={t.label}
                className={cn(
                  "whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 shrink-0",
                  t.tint,
                )}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[12px] font-bold",
                s.cta.tint,
              )}
            >
              {s.cta.label}
              <ArrowRight
                size={13}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const DashboardStrategy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    setShowNotifications,
    backgroundTasks,
    viewingTask,
    startBackgroundGeneration,
    startBackgroundAllInOne,
    startBackgroundEdit,
    viewCompletedTask,
    clearViewingTask,
    removeTask
  } = useOutletContext<{
    setShowNotifications?: (show: boolean) => void;
    backgroundTasks?: import('./DashboardLayout').BgTask[];
    viewingTask?: import('./DashboardLayout').BgTask | null;
    startBackgroundGeneration?: (payload: any, creditCost: number, creditReason: string, mode: any) => Promise<string>;
    startBackgroundAllInOne?: (requests: any[], creditCost: number, creditReason: string) => Promise<string>;
    startBackgroundEdit?: (previewPost: any, previewIndex: number, previewSlide: number, fullMediaSrc: string, editInstruction: string, aspect: string) => Promise<string>;
    viewCompletedTask?: (id: string) => void;
    clearViewingTask?: () => void;
    removeTask?: (id: string) => void;
  }>() || {};

  // ── Profile
  const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
  const userId = profile.user || profile._id || 'default';
  const brandId = profile._id || 'default';
  const brandName = (profile.brandName || 'yourbrand').toLowerCase().replace(/\s+/g, '');
  const { toast } = useToast();

  // ── Stage / Mode
  const [stage, setStage] = useState<'pick' | 'builder' | 'generating' | 'results'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') ? 'builder' : 'pick';
  });
  const [mode, setMode] = useState<Mode | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('mode') as Mode) || null;
  });

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get('mode') as Mode;
    if (m) {
      setMode(m);
      setStage('builder');
    } else {
      setMode(null);
      setStage('pick');
    }
  }, [location.search]);

  // Sync with background generation
  React.useEffect(() => {
    if (!currentTaskId || !backgroundTasks) return;

    const task = backgroundTasks.find(t => t.id === currentTaskId);
    if (!task) return;

    if (task.status === 'success') {
      const posts = task.posts || [];
      setGenerated(posts);
      setSavedIndices(new Set());
      setShowHeartPop({});
      setStage('results');

      if (task.mode !== 'all_in_one') {
        setMode(task.mode);
      }

      if (task.mode === 'whatsapp' || task.mode === 'email') {
        const first = posts[0] || {};
        setCampaignImage(imgSrc(first.image) || '');
        setCampaignBody(first.caption || '');
        if (task.mode === 'email') setCampaignSubject(first.subject || '');
      }

      setCurrentTaskId(null);
    } else if (task.status === 'error') {
      setGenError(task.error || 'Something went wrong');
      setStage('builder');
      setCurrentTaskId(null);
    }
  }, [backgroundTasks, currentTaskId]);

  // Listen for external requests to view a task (from top-right manager)
  React.useEffect(() => {
    if (viewingTask && viewingTask.status === 'success') {
      const posts = viewingTask.posts || [];
      setGenerated(posts);
      setSavedIndices(new Set());
      setShowHeartPop({});
      setStage('results');

      if (viewingTask.mode !== 'all_in_one') {
        setMode(viewingTask.mode);
      }

      if (viewingTask.mode === 'whatsapp' || viewingTask.mode === 'email') {
        const first = posts[0] || {};
        setCampaignImage(imgSrc(first.image) || '');
        setCampaignBody(first.caption || '');
        if (viewingTask.mode === 'email') setCampaignSubject(first.subject || '');
      }

      if (clearViewingTask) clearViewingTask();
    }
  }, [viewingTask, clearViewingTask]);

  // ── Custom Import List Modal
  const [showListNameModal, setShowListNameModal] = useState(false);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [listNameInput, setListNameInput] = useState('');

  // ── Shared
  const [count, setCount] = useState<number>(4);
  const [slideCount, setSlideCount] = useState<number>(5);
  const [aspect, setAspect] = useState<AspectRatio>('1:1');
  const [idea, setIdea] = useState('');
  const [uploads, setUploads] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('english');

  React.useEffect(() => {
    if (profile?.location?.country?.toLowerCase() === 'nepal') {
      if (language !== 'english' && language !== 'nepali') {
        setLanguage('english');
      }
    }
  }, [profile?.location?.country, language]);

  const [videoKind, setVideoKind] = useState<string>('ai-ugc');
  const [selectedMotionPreset, setSelectedMotionPreset] = useState<string | null>(null);
  const [avatarDescription, setAvatarDescription] = useState<string>('');
  const [videoScript, setVideoScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);

  // ── E-comm
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<string>('Amazon');
  const [ecommImgCount, setEcommImgCount] = useState<number>(4);

  // ── Image ad template (null = auto, 1–10 = specific template, -1 = all 8 variants)
  const [adTemplate, setAdTemplate] = useState<number | null>(null);
  // ── SaaS Format Track (only active when isSaasMode && mode === 'image')
  const [saasFormatId, setSaasFormatId] = useState<number | null>(null);
  const [saasFormatTrack, setSaasFormatTrack] = useState<SaasTrack | null>(null);

  // ── Festival
  const [festival, setFestival] = useState<string>('diwali');
  const [tone, setTone] = useState<string>('Festive sale');

  // ── WhatsApp / Email
  const [generateImage, setGenerateImage] = useState<boolean>(true);
  const [productPick, setProductPick] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignImage, setCampaignImage] = useState<string>('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const recipientsFileRef = useRef<HTMLInputElement>(null);

  interface SavedListObj {
    _id: string;
    name: string;
    emails?: string[];
    phones?: string[];
  }
  const [savedEmailLists, setSavedEmailLists] = useState<SavedListObj[]>([]);
  const [savedPhoneLists, setSavedPhoneLists] = useState<SavedListObj[]>([]);
  const savedLists = mode === 'whatsapp' ? savedPhoneLists : savedEmailLists;

  const setSavedLists = React.useCallback((val: any) => {
    if (mode === 'whatsapp') {
      setSavedPhoneLists(val);
    } else {
      setSavedEmailLists(val);
    }
  }, [mode]);

  const [selectedListId, setSelectedListId] = useState<string>('');

  React.useEffect(() => {
    const fetchSavedLists = async () => {
      try {
        const token = localStorage.getItem('token');
        const [emailRes, phoneRes] = await Promise.all([
          fetch(`${NODE_BASE}/campaigns/lists`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${NODE_BASE}/campaigns/phone-lists`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (emailRes.ok) {
          setSavedEmailLists(await emailRes.json());
        }
        if (phoneRes.ok) {
          setSavedPhoneLists(await phoneRes.json());
        }
      } catch (err) {
        console.error("Error fetching saved lists:", err);
      }
    };

    fetchSavedLists();
  }, []);

  // ── WhatsApp / Email 3-Box Upload states
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [creativeLibrary, setCreativeLibrary] = useState<any[]>([]);
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [fetchingCreatives, setFetchingCreatives] = useState(false);
  const [selectedCampaignCreative, setSelectedCampaignCreative] = useState<any | null>(null);
  const [selectedCampaignComputerImage, setSelectedCampaignComputerImage] = useState<string | null>(null);
  const [activeCampaignImageSource, setActiveCampaignImageSource] = useState<'product' | 'creative' | 'computer' | null>(null);
  const campaignFileInput = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // ── Products (from API)
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);

  React.useEffect(() => {
    const maxProducts = mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count));
    if (selectedProducts.length > maxProducts) {
      setSelectedProducts(selectedProducts.slice(0, maxProducts));
    }
  }, [mode, videoKind, count, ecommImgCount, selectedProducts.length]);

  // ── Generated results
  const [generated, setGenerated] = useState<GeneratedPost[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<GeneratedPost | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [isApplyingEdit, setIsApplyingEdit] = useState<boolean>(false);
  const [previewSlide, setPreviewSlide] = useState<number>(0);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showAdTemplates, setShowAdTemplates] = useState(false);
  const [computerImageSourceClass, setComputerImageSourceClass] = useState<'product' | 'creative' | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [showHeartPop, setShowHeartPop] = useState<Record<number, boolean>>({});
  const clickTimeoutRef = useRef<Record<number, any>>({});

  const fileInput = useRef<HTMLInputElement>(null);


  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<'expired' | 'premium' | null>(null);

  const isPlanExpired = profile?.userPlanExpiresAt ? new Date(profile.userPlanExpiresAt) < new Date() : false;
  const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
  const isElite = planName.includes('elite');

  React.useEffect(() => {
    if (mode) {
      const isPremium = ['all_in_one', 'video', 'ecomm', 'whatsapp', 'email'].includes(mode);
      if (isPlanExpired) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason('expired');
        setShowUpgradeModal(true);
      } else if (isPremium && !isElite) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason('premium');
        setShowUpgradeModal(true);
      }
    }
  }, [mode, isPlanExpired, isElite]);

  const handleModeClick = (mId: Mode) => {
    const isPremium = ['all_in_one', 'video', 'ecomm', 'whatsapp', 'email'].includes(mId);

    if (isPlanExpired) {
      setUpgradeModalReason('expired');
      setShowUpgradeModal(true);
      return;
    }

    if (isPremium && !isElite) {
      setUpgradeModalReason('premium');
      setShowUpgradeModal(true);
      return;
    }

    openMode(mId);
  };

  // ── SaaS / Services / Consulting mode detection
  // If the brand category is one of these 3, hide E-Comm Listing tab and route to SaaS prompts
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
  const isSaasMode = SAAS_BRAND_CATEGORIES.includes(profile.businessCategory || '');

  // ── AI Script Generator ───────────────────────────────────────────────────
  const generateAiScript = async () => {
    setIsGeneratingScript(true);
    try {
      // Pick first product from uploads or products list for context
      const firstProduct = products[0] || {};
      const payload = {
        brandName: profile.brandName || '',
        brandTone: profile.brandTone || '',
        usp: profile.usp || '',
        productName: firstProduct.name || '',
        productDescription: firstProduct.description || '',
        keyBenefit: firstProduct.keyBenefit || '',
        avatarDescription: avatarDescription.trim(),
        isSaas: isSaasMode,
        language: language,
      };
      const res = await fetch(`${AI_BASE}/generate-ugc-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.script) setVideoScript(data.script);
    } catch (err) {
      console.error('[AI Script] Failed:', err);
      toast({ title: 'Script generation failed', description: 'Please try again or write manually.', variant: 'destructive' });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Filter modes: SaaS brands don’t see E-Comm Listing or All In One
  const visibleModes = isSaasMode
    ? modes.filter((m) => m.id !== 'ecomm' && m.id !== 'all_in_one')
    : modes;

  const visibleVideoKinds = isSaasMode
    ? videoKinds.filter((v) => v.id !== 'img2video')
    : videoKinds;

  // ── Fetch products
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const cacheKey = userId ? `${PRODUCT_CACHE_KEY}_${userId}` : PRODUCT_CACHE_KEY;
        const cached = await getProductCache(cacheKey);
        if (Array.isArray(cached) && cached.length > 0) setProducts(cached);
        else {
          const ls = localStorage.getItem(cacheKey);
          if (ls) setProducts(JSON.parse(ls));
          else setProducts([]);
        }

        const res = await fetch(`${NODE_BASE}/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.products || [];
          setProducts(list);
          await setProductCache(cacheKey, list);
          try { localStorage.removeItem(cacheKey); } catch { }
        } else {
          if (res.status === 401 || res.status === 403) {
            setProducts([]);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchProducts();
  }, [userId]);



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

  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const limit = mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count);
    if (selectedProducts.length >= limit) {
      alert(`You can select at most ${limit} item(s). Please deselect an item first.`);
      return;
    }

    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const rawB64 = res.split(',')[1] || res;
          resolve(rawB64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const customProduct = {
        _id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: file.name.split('.')[0] || 'Uploaded Photo',
        imageBase64: b64,
        isCustomUpload: true,
        price: '',
        offerPrice: '',
        description: '',
        keyBenefit: ''
      };

      setSelectedProducts((prev) => [...prev, customProduct]);

      // Reset input value so same file can be selected again
      if (modalFileInputRef.current) {
        modalFileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[Upload] Failed to process modal upload:', err);
    }
  };

  const fetchCreativeLibrary = async () => {
    const cacheKey = `syncsocio_strategy_assets_${brandId}`;

    // 1. Try to load from IndexedDB cache first
    try {
      const cachedData = await getCache(cacheKey);
      if (Array.isArray(cachedData) && cachedData.length > 0) {
        setCreativeLibrary(cachedData);
        setLoadingCreatives(false);
      } else {
        // Fallback to localStorage just in case (legacy)
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const fallbackData = JSON.parse(cachedStr);
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            setCreativeLibrary(fallbackData);
            setLoadingCreatives(false);
          } else {
            setLoadingCreatives(true);
          }
        } else {
          setLoadingCreatives(true);
        }
      }
    } catch (e) {
      setLoadingCreatives(true);
    }

    // 2. Fetch the latest from server in the background
    setFetchingCreatives(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NODE_BASE}/strategy-assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedCreatives = data.creatives || [];
        setCreativeLibrary(fetchedCreatives);
        // Save to IndexedDB (as primary cache)
        await setCache(cacheKey, fetchedCreatives);
        // Clear any old bloated localStorage cache to free up quota
        try {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(ASSET_CACHE_KEY);
        } catch (e) { }
      }
    } catch (err) {
      console.error('[Strategy] Fetch creatives error:', err);
    } finally {
      setLoadingCreatives(false);
      setFetchingCreatives(false);
    }
  };

  const pickRandom = () => {
    const targetLimit = mode === 'ecomm' ? 1 : count;
    if (products.length > 0) {
      const shuffled = [...products].sort(() => 0.5 - Math.random()).slice(0, Math.min(products.length, targetLimit));
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
        if (!activeCampaignImageSource || activeCampaignImageSource === 'product') {
          setActiveCampaignImageSource('product');
        }
        return [p];
      } else {
        const exists = prev.find((x) => x._id === p._id);
        if (exists) return prev.filter((x) => x._id !== p._id);
        const limit = mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count));
        if (prev.length >= limit) return prev;
        return [...prev, p];
      }
    });
  };

  // ── Mode navigation
  const openMode = (m: Mode) => {
    setMode(m);
    setStage('builder');
    if (m === 'all_in_one') {
      setCount(1);
      setLanguage('english');
    }
    if (m === 'image') setCount(4);
    if (m === 'carousel') setCount(2);
    if (m === 'video') {
      setCount(1);
      setAspect('9:16');
      setLanguage('english');
    }
    if (m === 'ecomm') setCount(5);
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
    if (mode === 'all_in_one') {
      return selectedProducts.length > 0 || uploads.length > 0;
    }
    if (mode === 'video' && videoKind === 'ai-ugc') {
      return avatarDescription.trim().length > 0 && videoScript.trim().length > 0;
    }
    return true;
  })();

  const ecommTotal = ecommImgCount;

  const randomProduct = () => {
    const products_ = ['Hydrating Vitamin-C Serum', 'Glow Lip Tint', 'Festive Hamper', 'Saffron Night Cream', 'Limited Edition Combo', 'Detox Face Mask'];
    setProductPick(products_[Math.floor(Math.random() * products_.length)]);
  };

  const handleImportedEmails = (emails: string[], filename: string) => {
    if (!emails.length) {
      toast({
        title: "Import Error",
        description: "No recipients found in the uploaded file.",
        variant: "destructive"
      });
      return;
    }

    const defaultListName = filename.split('.')[0] || 'Imported List';
    setListNameInput(defaultListName);
    setPendingEmails(emails);
    setShowListNameModal(true);
  };

  const handleSaveImportedList = async () => {
    const isWhatsapp = mode === 'whatsapp';
    const endpoint = isWhatsapp ? `${NODE_BASE}/campaigns/phone-lists` : `${NODE_BASE}/campaigns/lists`;
    const finalListName = listNameInput.trim() || 'Imported List';
    try {
      const token = localStorage.getItem('token');
      const payload = isWhatsapp
        ? { name: finalListName, phones: pendingEmails }
        : { name: finalListName, emails: pendingEmails };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedList = await res.json();
        setSavedLists((prev: any[]) => {
          const index = prev.findIndex((x: any) => x._id === savedList._id || x.name === savedList.name);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = savedList;
            return updated;
          }
          return [savedList, ...prev];
        });
        setSelectedListId(savedList._id);
        const savedRecipients = isWhatsapp ? savedList.phones : savedList.emails;
        setRecipients(savedRecipients);

        toast({
          title: "List Saved",
          description: `Saved list "${finalListName}" with ${savedRecipients.length} recipients!`,
        });
      } else {
        toast({
          title: "Database Sync Failed",
          description: "Failed to save recipient list on backend, but imported locally.",
          variant: "destructive"
        });
        setRecipients(pendingEmails);
      }
    } catch (err) {
      console.error("Failed to save list:", err);
      setRecipients(pendingEmails);
    } finally {
      setShowListNameModal(false);
      setPendingEmails([]);
    }
  };

  const parseTextToRows = (text: string): any[][] | null => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return null;

    // 1. Detect if it is a markdown table by looking for lines with at least 2 pipes
    const pipeLines = lines.filter(line => (line.match(/\|/g) || []).length >= 2);
    if (pipeLines.length >= 2) {
      const rows = pipeLines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        if (line.startsWith('|')) parts.shift();
        if (line.endsWith('|')) parts.pop();
        return parts;
      });
      return rows.filter(row => !row.every(cell => /^[-:\s]+$/.test(cell)));
    }

    // 2. Try CSV/TSV/Semicolon-separated detection with header/metadata tolerance
    const delimiters = [',', '\t', ';'];
    for (const delimiter of delimiters) {
      const columnCounts = lines.map(line => line.split(delimiter).length);
      const countMap: Record<number, number> = {};
      let maxCount = 0;
      let bestColCount = 0;

      for (const count of columnCounts) {
        if (count < 2) continue;
        countMap[count] = (countMap[count] || 0) + 1;
        if (countMap[count] > maxCount) {
          maxCount = countMap[count];
          bestColCount = count;
        }
      }

      if (bestColCount >= 2 && maxCount >= Math.max(2, lines.length * 0.5)) {
        return lines
          .filter(line => line.split(delimiter).length === bestColCount)
          .map(line => line.split(delimiter).map(cell => cell.trim()));
      }
    }

    return null;
  };

  const parseRecipients = (textOrRows: any, isRows: boolean): string[] => {
    const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    const phonePattern = /\+?\d[\d\s\-()]{7,15}\d/g;
    const results: string[] = [];

    const extractPhonesFromRow = (rowCells: any[]) => {
      let rowStr = rowCells.map(c => String(c || '').trim()).join(' ');
      // Try to find a country code cell or pattern in the row
      let rowCC = '';
      for (const cell of rowCells) {
        if (cell === null || cell === undefined) continue;
        const cellStr = String(cell).trim();
        // Look for cell starting with + followed by 1-4 digits
        const ccMatch = cellStr.match(/^\+(\d{1,4})/);
        // Ensure the cell isn't a full phone number
        if (ccMatch && cellStr.replace(/[^\d+]/g, '').length <= 5) {
          rowCC = '+' + ccMatch[1];
          break;
        }
      }

      // If not found in a specific cell, try a loose regex on the whole row
      if (!rowCC) {
        const looseMatch = rowStr.match(/(?:^|\s)\+(\d{1,4})(?:\s|\(|$)/);
        if (looseMatch) {
          rowCC = '+' + looseMatch[1];
        }
      }

      const matches = rowStr.match(phonePattern);
      if (matches) {
        for (const m of matches) {
          let cleaned = m.replace(/[\s\-()]/g, '');
          if (cleaned.length < 7) continue;

          if (cleaned.startsWith('+')) {
            results.push(cleaned);
          } else {
            if (cleaned.startsWith('0') && cleaned.length > 5) {
              cleaned = cleaned.substring(1);
            }
            if (rowCC) {
              const ccDigits = rowCC.replace('+', '');
              if (cleaned.startsWith(ccDigits)) {
                results.push('+' + cleaned);
              } else {
                results.push(rowCC + cleaned);
              }
            } else {
              const ccDigits = whatsappCountryCode.replace('+', '');
              if (cleaned.startsWith(ccDigits)) {
                results.push('+' + cleaned);
              } else {
                results.push(whatsappCountryCode + cleaned);
              }
            }
          }
        }
      }
    };

    const extractEmailsFromRow = (rowCells: any[]) => {
      let rowStr = rowCells.map(c => String(c || '').trim()).join(' ');
      const matches = rowStr.match(emailPattern);
      if (matches) {
        results.push(...matches);
      }
    };

    // Strip basic RTF/HTML for fallback string parsing
    let processedTextOrRows = textOrRows;
    let finalIsRows = isRows;

    if (typeof processedTextOrRows === 'string' && processedTextOrRows.includes('{\\rtf')) {
      // Very rudimentary RTF table parsing: split by \row to keep rows together
      const rows = processedTextOrRows.split('\\row');
      processedTextOrRows = rows.map((r: string) => r.replace(/\\[a-z0-9]+[ ]?/gi, '').replace(/[\{\}]/g, '').trim()).filter((r: string) => r.length > 0);
      finalIsRows = true;
    } else if (typeof processedTextOrRows === 'string' && processedTextOrRows.includes('<tr')) {
      // Basic HTML table parsing
      const rows = processedTextOrRows.split(/<tr[^>]*>/i);
      processedTextOrRows = rows.map((r: string) => r.replace(/<[^>]+>/g, ' ').trim()).filter((r: string) => r.length > 0);
      finalIsRows = true;
    }

    if (finalIsRows && Array.isArray(processedTextOrRows) && processedTextOrRows.length > 0) {
      for (const row of processedTextOrRows) {
        const cells = Array.isArray(row) ? row : [row];
        if (mode === 'email') {
          extractEmailsFromRow(cells);
        } else {
          extractPhonesFromRow(cells);
        }
      }
    } else if (typeof processedTextOrRows === 'string') {
      if (mode === 'email') {
        const matches = processedTextOrRows.match(emailPattern);
        if (matches) results.push(...matches);
      } else {
        // Split into lines and treat each line as a row to preserve row-level CC context
        const lines = processedTextOrRows.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        for (const line of lines) {
          extractPhonesFromRow([line]);
        }
      }
    }

    return Array.from(new Set(results));
  };

  const handleRecipientsFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

          const matches = parseRecipients(rows, true);
          handleImportedEmails(matches, file.name);
        } catch (err) {
          console.error("File Parse Error:", err);
          toast({
            title: "Parse Error",
            description: `Failed to parse ${extension.toUpperCase()} file.`,
            variant: "destructive"
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        const rows = parseTextToRows(text);
        if (rows) {
          const matches = parseRecipients(rows, true);
          handleImportedEmails(matches, file.name);
        } else {
          const matches = parseRecipients(text, false);
          handleImportedEmails(matches, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const addRecipient = () => {
    let v = newRecipient.trim();
    if (!v) return;
    if (mode === 'whatsapp') {
      // Strip spaces, dashes, and parentheses
      let cleanNum = v.replace(/[\s\-()]/g, '');
      // Strip leading local zero if prepending code
      if (cleanNum.startsWith('0') && cleanNum.length > 5 && !cleanNum.startsWith(whatsappCountryCode.replace('+', ''))) {
        cleanNum = cleanNum.substring(1);
      }
      // If the number doesn't start with a plus or doesn't have the selected country code, prepend it
      if (!cleanNum.startsWith('+') && !cleanNum.startsWith(whatsappCountryCode.replace('+', ''))) {
        cleanNum = `${whatsappCountryCode}${cleanNum}`;
      } else if (cleanNum.startsWith(whatsappCountryCode.replace('+', '')) && !cleanNum.startsWith('+')) {
        cleanNum = `+${cleanNum}`;
      }
      v = cleanNum;
    }
    setRecipients((r) => Array.from(new Set([...r, v])));
    setNewRecipient('');
  };

  const sendCampaign = async () => {
    if (!recipients.length) return;

    // Client-side guard: check domain verification status before sending
    if (mode === 'email' && !profile?.email_domain_verified) {
      toast({
        title: '⚠️ Email setup required',
        description: 'Verify your email domain in Settings → Email Setup before sending campaigns.',
        variant: 'destructive'
      });
      return;
    }

    setSendStatus('sending');

    try {
      const token = localStorage.getItem('token');
      const isWhatsapp = mode === 'whatsapp';
      const endpoint = isWhatsapp
        ? `${NODE_BASE}/campaigns/send-whatsapp`
        : `${NODE_BASE}/campaigns/send`;

      const payload: any = {
        recipients: recipients,
        body: campaignBody,
        image: campaignImage,
        subject: campaignSubject || (isWhatsapp ? 'WhatsApp Campaign' : 'Email Campaign')
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSendStatus('sent');
      } else {
        // Handle specific backend error codes
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'EMAIL_DOMAIN_NOT_VERIFIED') {
          toast({
            title: '⚠️ Email setup required',
            description: 'Verify your email domain in Settings → Email Setup before sending campaigns.',
            variant: 'destructive'
          });
          setSendStatus('idle');
          return;
        }
        throw new Error(errData.message || 'Failed to send campaign');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Campaign Error",
        description: 'Failed to send campaign: ' + err.message,
        variant: "destructive"
      });
      setSendStatus('idle');
    }
  };


  const generate = async (overrides?: { idea?: string; count?: number; products?: any[]; layout?: string; aspect?: string; language?: string }) => {
    setStage('generating');
    setGenError(null);

    try {
      const currentMode = overrides?.layout || (mode === 'festival' ? 'image' : mode);
      const currentProducts = overrides?.products !== undefined ? overrides.products : selectedProducts;
      const currentIdea = overrides?.idea !== undefined ? overrides.idea : idea;

      let currentCount = overrides?.count !== undefined ? overrides.count : count;
      let currentAspect = overrides?.aspect !== undefined ? overrides.aspect : (mode === 'festival' && tone === 'Story' ? '9:16' : aspect);
      let currentLanguage = overrides?.language !== undefined ? overrides.language : language;

      let refImages: string[] = [];
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

      // Append brand logo as an additional reference image if available
      if (profile?.logo && !refImages.includes(profile.logo)) {
        refImages.push(profile.logo);
      }

      // ── SaaS text-led track: strip product/upload refs, keep logo only ──
      // Text-led formats (101–104) are pure typography — passing a dashboard
      // image confuses the model into including unwanted UI elements.
      if (isSaasMode && currentMode === 'image' && saasFormatTrack === 'text_led') {
        // Keep only the brand logo URL (http) if present — drop base64 product images
        refImages = refImages.filter((r) => r.startsWith('http'));
      }

      if (currentMode === 'all_in_one') {
        const requests = [
          // 1. 2 images
          {
            userId,
            brandId: profile?._id,
            layout: 'image',
            count: 2,
            aspectRatio: '1:1',
            idea: currentIdea,
            refImages,
            products: currentProducts.length > 0 ? currentProducts : undefined,
            language: currentLanguage,
            generateImage: true,
          },
          // 2. 2 carousels of 3 slides each
          {
            userId,
            brandId: profile?._id,
            layout: 'carousel',
            count: 2,
            slideCount: 3,
            aspectRatio: '1:1',
            idea: currentIdea,
            refImages,
            products: currentProducts.length > 0 ? currentProducts : undefined,
            language: currentLanguage,
            generateImage: true,
          },
          // 3. 1 AI UGC Video
          {
            userId,
            brandId: profile?._id,
            layout: 'video',
            count: 1,
            aspectRatio: '9:16',
            idea: currentIdea,
            refImages,
            products: currentProducts.length > 0 ? currentProducts : undefined,
            language: currentLanguage,
            generateImage: true,
            videoKind: 'ai-ugc',
            avatarDescription: avatarDescription || '',
            videoScript: videoScript || '',
          }
        ];

        if (!isSaasMode) {
          requests.push({
            userId,
            brandId: profile?._id,
            layout: 'ecomm',
            count: 4,
            aspectRatio: '1:1',
            idea: currentIdea,
            refImages,
            products: currentProducts.length > 0 ? currentProducts : undefined,
            language: currentLanguage,
            generateImage: true,
            platform: 'Shopify',
            imageCount: 4,
          } as any);
        }

        const creditCost = 140;
        const creditReason = 'All-in-One generation (2 images, 2 carousels of 3 slides, 4 ecomm listings, 1 AI UGC Video)';
        if (startBackgroundAllInOne) {
          const tId = await startBackgroundAllInOne(requests, creditCost, creditReason);
          setCurrentTaskId(tId);
          setAdTemplate(null);
          setIdea('');
        }
        return;
      }

      let finalIdea = currentIdea;
      if (currentMode === 'video') {
        currentCount = 1;
        currentAspect = '9:16';
        currentLanguage = 'english';

        if (videoKind === 'img2video' && selectedMotionPreset) {
          const preset = MOTION_PRESETS.find((p) => p.id === selectedMotionPreset);
          if (preset) {
            finalIdea = `${currentIdea ? currentIdea.trim() + '. ' : ''}${preset.promptModifier}`;
          }
        }
      }
      const hasCustomUpload = currentProducts.some((p: any) => p.isCustomUpload);

      const payload = {
        userId,
        brandId: profile?._id,
        layout: currentMode === 'ecomm' ? 'ecomm' : currentMode === 'festival' ? 'image' : currentMode,
        count: currentMode === 'ecomm' ? ecommTotal : currentCount,
        slideCount,
        aspectRatio: currentAspect,
        idea: currentMode === 'ecomm' ? '' : finalIdea,
        refImages,
        products: (currentProducts.length > 0 && !hasCustomUpload) ? currentProducts : undefined,
        language: currentLanguage,
        generateImage: (currentMode === 'whatsapp' || currentMode === 'email') ? false : generateImage,
        ...(currentMode === 'ecomm' && {
          platform,
          imageCount: ecommTotal,
        }),
        ...((currentMode === 'image' || currentMode === 'festival') && {
          // SaaS brands: use saasFormatId (101-106) when a format is selected
          // D2C brands: use the regular adTemplate (1-10)
          adTemplate: isSaasMode && currentMode === 'image'
            ? (saasFormatId ?? null)
            : (currentCount === 8 ? -1 : adTemplate),
        }),
        videoKind: currentMode === 'video' ? videoKind : undefined,
        avatarDescription: (currentMode === 'video' && videoKind === 'ai-ugc') ? avatarDescription : undefined,
        videoScript: (currentMode === 'video' && videoKind === 'ai-ugc') ? videoScript : undefined,
      };

      // ── Credit cost — calculated upfront, deducted ONLY after success ──
      let creditCost = 0;
      if (currentMode === 'video') {
        creditCost = currentCount * 80;
      } else if (currentMode === 'carousel') {
        creditCost = currentCount * slideCount * 5;
      } else if (currentMode === 'ecomm') {
        creditCost = ecommTotal * 5;
      } else if (currentMode === 'whatsapp' || currentMode === 'email') {
        creditCost = 0;  // campaigns are free
      } else {
        creditCost = currentCount * 5;  // image / festival
      }
      const creditReason = `${currentMode} generation (${currentMode === 'ecomm' ? ecommTotal
        : currentMode === 'carousel' ? `${currentCount} × ${slideCount} slides`
          : currentCount
        } items)`;
      // ─────────────────────────────────────────────────────────────────

      if (currentMode === 'whatsapp' || currentMode === 'email') {
        try {
          const res = await fetch(`${AI_BASE}/generate-strategy-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.status === 'success' && data.posts && data.posts.length > 0) {
            setGenerated(data.posts);
            const first = data.posts[0];
            setCampaignImage(imgSrc(first.image) || '');
            if (currentMode === 'email') setCampaignSubject(first.subject || '');
            setCampaignBody(first.caption || '');
            setStage('results');
          } else {
            setGenError(data.detail || 'Generation failed. Try again.');
            setStage('builder');
          }
        } catch (err: any) {
          console.error('[Strategy] Generation error:', err);
          setGenError(err.message || 'Something went wrong');
          setStage('builder');
        }
        return;
      }

      if (startBackgroundGeneration) {
        const tId = await startBackgroundGeneration(payload, creditCost, creditReason, currentMode);
        setCurrentTaskId(tId);
        setAdTemplate(null);
        setSaasFormatId(null);
        setSaasFormatTrack(null);
        setIdea('');
      }
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
    setSavedIndices(new Set());
    setShowHeartPop({});
    setAvatarDescription('');
    setVideoScript('');
  };

  // ── Heart — save to DB + localStorage cache
  const handleHeart = async (post: GeneratedPost, index: number) => {
    // Optimistic UI updates
    setSavedCount((n) => n + 1);
    setSavedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    try {
      const token = localStorage.getItem('token');
      const thumbSrc = post.type === 'carousel' ? post.slides?.[0]?.image : post.type === 'video' ? post.thumbnail : post.image;

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

        // Save to IndexedDB cache
        const cacheKey = `syncsocio_strategy_assets_${brandId}`;
        try {
          const cached = await getCache(cacheKey) || [];
          cached.unshift(data.creative);
          await setCache(cacheKey, cached);
        } catch (e) {
          console.error('[Strategy] IndexedDB save error:', e);
        }

        // No localStorage fallback needed anymore since we use robust IndexedDB above.
        // This prevents QuotaExceededError crashes when the app tries to save profiles later.
      } else {
        // Revert optimistic UI if failed
        setSavedCount((n) => Math.max(0, n - 1));
        setSavedIndices((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    } catch (err) {
      console.error('[Strategy] Heart error:', err);
    }
  };

  const handleDownload = async (post: GeneratedPost, index: number) => {
    const isVideo = post.type === 'video';
    const displaySrc = isVideo ? (post.url || post.thumbnail) : (post.type === 'carousel' ? post.slides?.[0]?.image : post.image);
    if (!displaySrc) return;

    const srcUrl = isVideo && post.url ? post.url : imgSrc(displaySrc);
    const filename = `${brandName || 'syncsocio'}_creative_${index + 1}.${isVideo && post.url ? 'mp4' : 'jpg'}`;

    try {
      if (srcUrl.startsWith('http') || srcUrl.startsWith('/') || srcUrl.startsWith('blob:')) {
        const response = await fetch(srcUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        const link = document.createElement('a');
        link.href = srcUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(isVideo ? 'Failed to download video:' : 'Failed to download image:', err);
      const link = document.createElement('a');
      link.href = srcUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDoubleTap = (post: GeneratedPost, index: number) => {
    if (!savedIndices.has(index)) {
      handleHeart(post, index);
    }
    setShowHeartPop((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setShowHeartPop((prev) => ({ ...prev, [index]: false }));
    }, 800);
  };

  const handleReject = (index: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageClick = (post: GeneratedPost, index: number, displaySrc: string) => {
    if (clickTimeoutRef.current[index]) {
      clearTimeout(clickTimeoutRef.current[index]);
      delete clickTimeoutRef.current[index];
      handleDoubleTap(post, index);
    } else {
      clickTimeoutRef.current[index] = setTimeout(() => {
        delete clickTimeoutRef.current[index];
        setPreviewPost(post);
        setPreviewIndex(index);
        setPreviewSlide(0);
        setIsEditing(false);
        setEditInstruction('');
      }, 250);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditInstruction('');
  };

  const handleApplyEdit = async () => {
    if (!previewPost || previewIndex === null) return;
    setIsApplyingEdit(true);
    setStage('generating');

    let baseMedia = '';
    if (previewPost.type === 'carousel' && previewPost.slides && previewPost.slides.length > 0) {
      baseMedia = previewPost.slides[previewSlide]?.image || '';
    } else if (previewPost.type === 'video') {
      baseMedia = previewPost.thumbnail || '';
    } else {
      baseMedia = previewPost.image || '';
    }

    const fullMediaSrc = imgSrc(baseMedia);

    if (startBackgroundEdit) {
      const tId = await startBackgroundEdit(
        previewPost,
        previewIndex,
        previewSlide,
        fullMediaSrc,
        editInstruction,
        aspect
      );
      setCurrentTaskId(tId);
      setIsEditing(false);
      setIsApplyingEdit(false);
    }
  };

  const handleExportAll = async () => {
    for (let i = 0; i < generated.length; i++) {
      const post = generated[i];
      await new Promise((resolve) => setTimeout(resolve, i * 200));
      await handleDownload(post, i);
    }
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
          {mode === 'all_in_one' ? 'Generating All-in-One Marketing Pack ⚡' :
            mode === 'whatsapp' ? 'Drafting your WhatsApp blast 📲' :
              mode === 'email' ? 'Composing your email campaign ✉️' :
                currentTaskId && backgroundTasks?.find(t => t.id === currentTaskId)?.mode === 'edit_media' ? 'Applying AI Edit ✨' :
                  'Cooking up your posts ✨'}
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          {mode === 'all_in_one'
            ? 'SyncSocio is cooking up 1 image, 1 carousel, and 2 listing designs…'
            : mode === 'whatsapp' || mode === 'email'
              ? 'SyncSocio is writing copy & laying out the creative…'
              : currentTaskId && backgroundTasks?.find(t => t.id === currentTaskId)?.mode === 'edit_media'
                ? 'SyncSocio AI is analyzing and applying your edit request…'
                : `SyncSocio AI is generating ${count} on-brand ${mode === 'video' ? 'videos' : mode === 'carousel' ? 'carousels' : 'posts'}…`}
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">
          This may take a few moments
        </p>
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

        {mode !== 'whatsapp' && mode !== 'email' && (
          <div className="mt-12 flex flex-col items-center">
            <p className="text-sm font-medium text-muted-foreground mb-4">Don't want to wait?</p>
            <Button
              variant="outline"
              className="rounded-full shadow-sm hover:shadow"
              onClick={() => {
                setStage('builder');
                setCurrentTaskId(null);
                // Reset all fields so the user has a fresh slate
                setIdea('');
                setSelectedProducts([]);
                setUploads([]);
                setVideoScript('');
                setAvatarDescription('');
                setSelectedCampaignCreative(null);
                setSelectedCampaignComputerImage(null);
                setActiveCampaignImageSource(null);
              }}
            >
              {currentTaskId && backgroundTasks?.find(t => t.id === currentTaskId)?.mode === 'edit_media'
                ? 'Run in background'
                : 'Generate more in background'}
            </Button>
          </div>
        )}
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
        whatsappCountryCode={whatsappCountryCode}
        setWhatsappCountryCode={setWhatsappCountryCode}
        addRecipient={addRecipient}
        recipientsFileRef={recipientsFileRef}
        handleRecipientsFile={handleRecipientsFile}
        sendStatus={sendStatus}
        sendCampaign={sendCampaign}
        back={resetToBuilder}
        regenerate={() => generate()}
        savedLists={savedLists}
        setSavedLists={setSavedLists}
        selectedListId={selectedListId}
        setSelectedListId={setSelectedListId}
        showListNameModal={showListNameModal}
        setShowListNameModal={setShowListNameModal}
        listNameInput={listNameInput}
        setListNameInput={setListNameInput}
        handleSaveImportedList={handleSaveImportedList}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULTS — Gallery (image / carousel / video / ecomm / festival)
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'results') {
    const selectedFest = FESTIVALS_2026.find((f) => f.id === festival);
    const modeLabel = mode === 'all_in_one' ? 'All-in-One Pack · SyncSocio AI'
      : mode === 'ecomm' ? `Listing · ${platform}`
        : mode === 'festival' && selectedFest ? `Campaign · ${selectedFest.name} ${selectedFest.emoji}`
          : mode === 'festival' ? `Campaign · ${festival}`
            : mode === 'video' ? 'Reel · SyncSocio AI'
              : 'Post · SyncSocio AI';

    const accentGrad = mode === 'all_in_one' ? 'from-indigo-500 via-purple-500 via-pink-500 to-amber-500'
      : mode === 'festival' ? 'from-violet-500 via-fuchsia-500 to-rose-500'
        : mode === 'ecomm' ? 'from-emerald-400 via-teal-400 to-cyan-500'
          : mode === 'video' ? 'from-amber-400 via-orange-500 to-rose-500'
            : mode === 'carousel' ? 'from-fuchsia-500 via-rose-500 to-pink-400'
              : 'from-sky-400 via-indigo-500 to-fuchsia-500';

    const hasSection = (sectionType: string) => {
      return generated.some((post: any) => post.sectionType === sectionType);
    };

    const renderPostCard = (post: GeneratedPost, i: number) => {
      const isBig = mode === 'all_in_one' ? false : (i % 3 === 0);
      const displaySrc = (() => {
        if (mode === 'carousel' || post.type === 'carousel') return imgSrc(post.slides?.[0]?.image);
        if (mode === 'video' || post.type === 'video') return imgSrc(post.thumbnail);
        return imgSrc(post.image);
      })();

      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (i % 8) * 0.06 }}
          className="break-inside-avoid rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm group"
        >
          <div
            onClick={() => handleImageClick(post, i, displaySrc || '')}
            className={cn('relative w-full overflow-hidden cursor-pointer select-none', isBig ? 'aspect-[3/4]' : 'aspect-square')}
          >
            {(mode === 'video' || post.type === 'video') && post.url ? (
              <video
                src={`${post.url}#t=0.5`}
                preload="metadata"
                muted
                playsInline
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : displaySrc ? (
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

            {/* Heart pop-up animation */}
            <AnimatePresence>
              {showHeartPop[i] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none"
                >
                  <Heart className="w-16 h-16 text-rose-500 fill-rose-500 filter drop-shadow-md" />
                </motion.div>
              )}
            </AnimatePresence>

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
              <button
                onClick={() => handleDownload(post, i)}
                className="flex-1 h-7 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-[10px] font-semibold flex items-center justify-center gap-1 transition"
              >
                <Download size={10} /> Download
              </button>
              <button
                onClick={() => {
                  if (!savedIndices.has(i)) handleHeart(post, i);
                }}
                className={cn(
                  "flex-1 h-7 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition",
                  savedIndices.has(i)
                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                )}
              >
                <Heart size={10} className={cn(savedIndices.has(i) && "fill-rose-500 text-rose-500")} />
                {savedIndices.has(i) ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </motion.div>
      );
    };

    const renderSection = (sectionType: string, title: string, subtitle: string) => {
      const sectionPosts = generated
        .map((post, index) => ({ post, index }))
        .filter(({ post }: any) => post.sectionType === sectionType);

      if (sectionPosts.length === 0) return null;

      return (
        <div className="space-y-5 border border-border/40 rounded-3xl p-6 bg-card/10 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-[0.03] bg-primary" />

          <div>
            <h2 className="text-lg font-display font-black text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>

          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {sectionPosts.map(({ post, index }) => renderPostCard(post, index))}
          </Masonry>
        </div>
      );
    };

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
                  {mode === 'all_in_one' ? 'All-in-One' : mode}
                </span>{' '}
                drop is ready
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                {mode === 'all_in_one' ? (
                  `${generated.length} on-brand creatives · Multi-format pack`
                ) : (
                  `${generated.length} on-brand ${generated.length > 1 ? 'creatives' : 'creative'} · ${aspect} · ${languages.find((l) => l.id === language)?.label}`
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-3 bg-rose-500/10 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold w-fit border border-rose-500/20">
                <Heart size={14} className="fill-rose-500/50" />
                Make sure to heart (save) to protect across all platforms like image, carousel, and video
              </div>
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
            <Button onClick={handleExportAll} size="sm" className={cn('rounded-xl gap-2 h-10 bg-gradient-to-r text-white border-0 shadow-lg', accentGrad)}>
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

        {/* Gallery */}
        {mode === 'all_in_one' ? (
          <div className="grid grid-cols-1 gap-12">
            {hasSection('image') && renderSection('image', 'Static Images 📸', 'Vibrant single-post creatives designed to capture attention in feeds.')}
            {hasSection('carousel') && renderSection('carousel', 'Carousel Swipeables 🎠', 'Multi-slide storytelling creatives for progressive product narratives.')}
            {hasSection('video') && renderSection('video', 'AI Reels & UGC Videos 🎥', 'Engagement-focused short-form video creatives.')}
            {hasSection('ecomm') && renderSection('ecomm', 'E-Commerce Listings 🛒', 'Conversion-optimized marketplace listing hero shots.')}
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {generated.map((post, i) => renderPostCard(post, i))}
          </Masonry>
        )}



        {/* Lightbox */}
        <AnimatePresence>
          {previewPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
              onClick={() => { setPreviewPost(null); setCopiedText(false); }}
            >
              <button
                onClick={() => { setPreviewPost(null); setCopiedText(false); }}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
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
                  {previewPost.type === 'video' && previewPost.url ? (
                    <video
                      src={previewPost.url}
                      controls
                      autoPlay
                      className="w-full h-auto max-h-[60vh] md:max-h-[65vh] object-contain max-w-full"
                    />
                  ) : previewPost.type === 'carousel' && previewPost.slides && previewPost.slides.length > 0 ? (
                    <div className="relative flex flex-col items-center justify-center w-full">
                      <img
                        src={imgSrc(previewPost.slides[previewSlide]?.image)}
                        alt={`Slide ${previewSlide + 1}`}
                        className="w-full h-auto max-h-[55vh] md:max-h-[60vh] object-contain max-w-full"
                      />
                      {/* Navigation dots */}
                      {previewPost.slides.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {previewPost.slides.map((_: any, idx: number) => (
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
                      {previewPost.slides.length > 1 && (
                        <>
                          <button
                            onClick={() => setPreviewSlide(prev => (prev > 0 ? prev - 1 : (previewPost.slides?.length || 1) - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl"
                          >
                            ‹
                          </button>
                          <button
                            onClick={() => setPreviewSlide(prev => (prev < (previewPost.slides?.length || 1) - 1 ? prev + 1 : 0))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition text-xl"
                          >
                            ›
                          </button>
                        </>
                      )}
                      {/* Counter badge */}
                      <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {previewSlide + 1} / {previewPost.slides.length}
                      </div>
                    </div>
                  ) : (
                    <img
                      src={imgSrc(previewPost.image || previewPost.thumbnail)}
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
                        navigator.clipboard.writeText(previewPost.caption || '');
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition",
                        copiedText
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                      )}
                    >
                      {copiedText ? (
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
                      {previewPost.caption || "No caption generated."}
                    </p>
                  </div>

                  {/* Edit action footer */}
                  <div className="p-4 border-t border-border/50 bg-muted/10 space-y-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="What would you like to change? (e.g. 'Make the background a serene beach', 'Add bold yellow text saying SALE')"
                          className="w-full min-h-[80px] p-2.5 rounded-xl border border-border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelEdit}
                            disabled={isApplyingEdit}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleApplyEdit}
                            disabled={isApplyingEdit || !editInstruction.trim()}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                          >
                            {isApplyingEdit ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <Wand2 size={13} />
                                Apply Edit
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {['image', 'carousel', 'video', 'ecomm'].includes(previewPost.type || previewPost.sectionType || '') ? (
                          <>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="flex-1 h-9 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            >
                              <Edit3 size={13} />
                              Edit Media
                            </button>
                            <button
                              onClick={() => {
                                if (previewIndex !== null && !savedIndices.has(previewIndex)) {
                                  handleHeart(previewPost, previewIndex);
                                }
                              }}
                              className={cn(
                                "flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition",
                                previewIndex !== null && savedIndices.has(previewIndex)
                                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                              )}
                            >
                              <Heart size={13} className={cn(previewIndex !== null && savedIndices.has(previewIndex) && "fill-rose-500 text-rose-500")} />
                              {previewIndex !== null && savedIndices.has(previewIndex) ? 'Saved' : 'Save/Heart'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (previewIndex !== null && !savedIndices.has(previewIndex)) {
                                handleHeart(previewPost, previewIndex);
                              }
                            }}
                            className={cn(
                              "w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition",
                              previewIndex !== null && savedIndices.has(previewIndex)
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                            )}
                          >
                            <Heart size={13} className={cn(previewIndex !== null && savedIndices.has(previewIndex) && "fill-rose-500 text-rose-500")} />
                            {previewIndex !== null && savedIndices.has(previewIndex) ? 'Saved' : 'Save/Heart'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
      <div className="relative min-h-screen bg-gradient-hero">
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />

        <div className="relative mx-auto max-w-6xl px-6 pt-0 pb-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1.5 shadow-soft">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[11px] font-bold tracking-tight text-primary">
                AI Content Studio
              </span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-foreground md:text-5xl">
              What do you want to generate today?
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Pick a format — Velocity opens a tailored brief for it.
            </p>
          </motion.div>

          {/* Studio grid — 6-col so wide cards can span 3 */}
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-6 md:auto-rows-[210px]">
            {STUDIOS.filter(s => {
              if (isSaasMode && (s.id === 'ecomm' || s.id === 'all_in_one')) return false;
              return true;
            }).map((s, i) => (
              <StudioCard key={s.id} s={s} i={i} onPick={handleModeClick} />
            ))}
          </div>
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
                {visibleVideoKinds.map((v) => (
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
          {mode !== 'video' && (
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
          )}

          {(mode !== 'video' || videoKind === 'ai-ugc') && (
            <LanguagePicker
              language={language}
              setLanguage={setLanguage}
              country={profile?.location?.country}
              isAiUgc={mode === 'video' && videoKind === 'ai-ugc'}
            />
          )}

          {/* ─── SaaS Format Track Selector (SaaS image mode only) ─── */}
          {mode === 'image' && isSaasMode && (
            <section className="mb-6 border border-border/60 rounded-2xl p-4 bg-card/40">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Creative Format
                  </span>
                  {saasFormatId !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-wide">
                      {SAAS_FORMAT_TRACKS.find((f) => f.id === saasFormatId)?.label || 'Selected'}
                    </span>
                  )}
                </div>
                {saasFormatId !== null && (
                  <button
                    onClick={() => { setSaasFormatId(null); setSaasFormatTrack(null); }}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md"
                  >
                    <X size={10} /> Clear
                  </button>
                )}
              </div>

              {/* Track Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['text_led', 'image_led'] as SaasTrack[]).map((track) => {
                  const isActive = saasFormatTrack === track;
                  return (
                    <button
                      key={track}
                      onClick={() => {
                        if (saasFormatTrack === track) {
                          setSaasFormatTrack(null);
                          setSaasFormatId(null);
                        } else {
                          setSaasFormatTrack(track);
                          setSaasFormatId(null);
                        }
                      }}
                      className={cn(
                        'relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200',
                        isActive
                          ? 'border-primary bg-primary/8 shadow-sm shadow-primary/20 ring-1 ring-primary/30'
                          : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-base leading-none">
                          {track === 'text_led' ? '🅰' : '🖥'}
                        </span>
                        <p className={cn('text-[11px] font-bold', isActive ? 'text-primary' : 'text-foreground')}>
                          {track === 'text_led' ? 'Text-led' : 'UI / Dashboard'}
                        </p>
                        {isActive && (
                          <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check size={9} className="text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-tight pl-6">
                        {track === 'text_led'
                          ? 'Pure typography — no image needed'
                          : 'Pass a screenshot to anchor the visual'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Format Cards for selected track */}
              <AnimatePresence initial={false}>
                {saasFormatTrack !== null && (
                  <motion.div
                    key={saasFormatTrack}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {SAAS_FORMAT_TRACKS.filter((f) => f.track === saasFormatTrack).map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setSaasFormatId(saasFormatId === fmt.id ? null : fmt.id)}
                          className={cn(
                            'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all duration-200',
                            saasFormatId === fmt.id
                              ? 'border-primary bg-primary/8 shadow-md shadow-primary/15 ring-1 ring-primary/30'
                              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
                          )}
                        >
                          <span className="text-xl leading-none">{fmt.icon}</span>
                          <p className={cn('text-[10px] font-bold leading-tight', saasFormatId === fmt.id ? 'text-primary' : 'text-foreground')}>
                            {fmt.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground/80 leading-tight italic">{fmt.tagline}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{fmt.desc}</p>
                          {saasFormatId === fmt.id && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check size={9} className="text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Image-led callout banner */}
                    {saasFormatTrack === 'image_led' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25"
                      >
                        <span className="text-amber-500 text-sm shrink-0">📸</span>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                          <span className="font-bold">Upload a dashboard or app screenshot below.</span> The AI will use it as the visual anchor — replicating your UI's colors, layout, and style in the creative.
                        </p>
                      </motion.div>
                    )}

                    {/* Text-led note */}
                    {saasFormatTrack === 'text_led' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-muted/60 border border-border/40"
                      >
                        <span className="text-base shrink-0">✍️</span>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Text-led formats are <span className="font-semibold text-foreground">purely typographic</span> — no dashboard image needed. Any uploaded product/dashboard images will be ignored for this format.
                        </p>
                      </motion.div>
                    )}

                    {saasFormatId === null && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Select a format above, or leave unselected for AI to choose.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {saasFormatTrack === null && (
                <p className="text-[10px] text-muted-foreground">
                  Select a track above, or leave unselected — AI will pick the best composition for your brief.
                </p>
              )}
            </section>
          )}

          {/* ─── Ad Template Picker (D2C image mode only — hidden for SaaS) ─── */}
          {mode === 'image' && !isSaasMode && (
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
                        No template selected — SyncSocio will choose the best layout for your brief.
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
                {mode === 'video' ? 'Product image' : 'Reference images'}{' '}
                <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
              </p>
              {mode !== 'video' && (
                <div className="flex gap-3">
                  <button onClick={pickRandom} className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
                    <Shuffle size={12} /> Pick Random
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {!(isSaasMode && saasFormatTrack === 'text_led') && (
                <button
                  onClick={() => setShowProductModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition">
                    <Plus size={16} />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">Add Product</span>
                </button>
              )}

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
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                    {p.isCustomUpload ? 'UPLOAD' : 'PRODUCT'}
                  </div>
                  <button
                    onClick={() => toggleProduct(p)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 backdrop-blur text-background opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    <X size={11} />
                  </button>
                </motion.div>
              ))}

              {/* Uploads */}
              {!(mode === 'video' && videoKind === 'img2video') && uploads.map((url, i) => (
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

          {mode === 'video' && videoKind === 'img2video' && (
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Or choose a motion effect
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MOTION_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedMotionPreset(selectedMotionPreset === p.id ? null : p.id)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition relative',
                      selectedMotionPreset === p.id
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30'
                        : 'border-border/60 bg-card hover:border-primary/40'
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{p.desc}</p>
                    {selectedMotionPreset === p.id && (
                      <div className="absolute top-3.5 right-4 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={9} className="text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {mode === 'video' && videoKind === 'ai-ugc' ? (
            <>
              <section className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Avatar description <span className="text-destructive">*</span>
                </p>
                <Input
                  value={avatarDescription}
                  onChange={(e) => setAvatarDescription(e.target.value)}
                  placeholder="e.g. A 25-year-old friendly female creator speaking in a bright modern kitchen."
                  className="rounded-2xl border-border/60 bg-card h-12 text-sm text-foreground focus-visible:ring-primary"
                />
              </section>

              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Video script <span className="text-destructive">*</span>
                  </p>
                  <button
                    type="button"
                    onClick={generateAiScript}
                    disabled={isGeneratingScript}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border transition-all duration-200
                      bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-400/30 text-violet-600 dark:text-violet-400
                      hover:from-violet-500/20 hover:to-blue-500/20 hover:border-violet-400/60 hover:scale-105
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                      shadow-sm"
                  >
                    {isGeneratingScript ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Writing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={10} />
                        AI · 8s script
                      </>
                    )}
                  </button>
                </div>
                <Textarea
                  value={videoScript}
                  onChange={(e) => setVideoScript(e.target.value)}
                  placeholder="e.g. Hey guys! I just tried this new organic cream and it feels amazing..."
                  className="min-h-[120px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed text-foreground focus-visible:ring-primary"
                />
              </section>
            </>
          ) : (
            <IdeaBox
              idea={idea}
              setIdea={setIdea}
              placeholder={
                mode === 'video' && videoKind === 'img2video'
                  ? 'Describe how the product should animate in the video (e.g. dynamic zoom, product rotating, clean background motion)...'
                  : undefined
              }
              label={mode === 'video' && videoKind === 'img2video' ? 'Video instructions' : undefined}
            />
          )}
        </>
      )}

      {/* ─── E-COMM ─── */}
      {mode === 'ecomm' && (
        <>
          {profile?.location?.country?.toLowerCase() !== 'nepal' && (
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
          )}

          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {profile?.location?.country?.toLowerCase() !== 'nepal' ? '2' : '1'} · Image count
            </p>
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

          <LanguagePicker language={language} setLanguage={setLanguage} country={profile?.location?.country} />

          {/* Product images — with "From Products" */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Product images <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
              </p>
              <div className="flex gap-3">
                <button onClick={pickRandom} className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
                  <Shuffle size={12} /> Pick Random
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              <button
                onClick={() => setShowProductModal(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition">
                  <Plus size={16} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">Add Product</span>
              </button>
              {selectedProducts.map((p, i) => (
                <motion.div key={`prod-${p._id || i}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square rounded-xl overflow-hidden group bg-card border border-primary/40">
                  {p.imageBase64 ? <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-2 text-center"><Package size={16} className="text-muted-foreground mb-1" /><span className="text-[9px] font-medium leading-tight text-foreground line-clamp-2">{p.name}</span></div>}
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                    {p.isCustomUpload ? 'UPLOAD' : 'PRODUCT'}
                  </div>
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

      {/* ─── ALL IN ONE ─── */}
      {mode === 'all_in_one' && (
        <div className="space-y-6">
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Product catalog <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose a product from your catalog to generate the complete visual pack.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={pickRandom} className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5">
                  <Shuffle size={12} /> Pick Random
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              <button
                onClick={() => setShowProductModal(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition">
                  <Plus size={16} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">Add Product</span>
              </button>

              {/* Selected product */}
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
        </div>
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
            country: profile.location?.country,
          }}
          isSaas={isSaasMode}
          language={(language === 'hinglish' || language === 'hindi' ? language : 'english') as 'english' | 'hinglish' | 'hindi'}
          products={products}
          onGenerate={(data) => {
            setFestival(data.festival.id);
            setIdea(data.prompt);
            setCount(data.imageCount);
            setTone(data.postType);
            if (data.language) {
              setLanguage(data.language);
            }
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
              language: data.language,
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
                    Pick up to {mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count))} product{(mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count))) > 1 ? 's' : ''}. SyncSocio will anchor generations to these.
                  </p>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Upload from Computer Card */}
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="text-center relative p-3 rounded-2xl border border-dashed flex flex-col items-center justify-center min-h-[140px] transition bg-card hover:bg-muted/30 border-border hover:border-primary/40 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center mb-2 transition">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-bold text-foreground">Upload Photo</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">From computer</p>
                  </button>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleModalPhotoUpload}
                  />

                  {/* Custom Uploaded Items */}
                  {selectedProducts.filter((p) => p.isCustomUpload).map((p) => {
                    return (
                      <button
                        key={p._id}
                        onClick={() => toggleProduct(p)}
                        className="text-left relative p-3 rounded-2xl border border-primary bg-primary/5 shadow-md shadow-primary/10 transition overflow-hidden"
                      >
                        <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative">
                          <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-contain p-2" />
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm">
                            <CheckCircle2 size={12} />
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground leading-tight truncate">{p.name}</p>
                        <div className="absolute bottom-1 right-2 bg-primary/20 text-primary text-[8px] font-bold px-1 rounded">LOCAL</div>
                      </button>
                    );
                  })}

                  {products.map((p) => {
                    const selected = !!selectedProducts.find((x) => x._id === p._id);
                    const disabled = !selected && selectedProducts.length >= (mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count)));
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
                  <span className={cn(selectedProducts.length === (mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count))) ? 'text-primary' : 'text-foreground')}>
                    {selectedProducts.length}
                  </span> / {mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count))} selected
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
                    {fetchingCreatives && (
                      <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin ml-1 inline-block" />
                    )}
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
                {loadingCreatives || (fetchingCreatives && creativeLibrary.length === 0) ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading library...</p>
                  </div>
                ) : creativeLibrary.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mb-3">
                      <Heart size={20} className="text-rose-500 fill-rose-500" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No saved creatives yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">Heart creatives in the strategy stage to save them to your library.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative flex items-center justify-center">
                            {c.type === 'video' && c.videoUrl ? (
                              <video
                                src={`${c.videoUrl}#t=0.5`}
                                preload="metadata"
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : src ? (
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

      {/* ─── List Name Modal ─── */}
      <AnimatePresence>
        {showListNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowListNameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-foreground">Name your imported recipient list</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Provide a recognizable name for this contact list so you can reuse it later.</p>
              </div>

              <div className="space-y-2">
                <Input
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  placeholder="e.g. my fav customer"
                  className="rounded-xl border-border/80 bg-muted/20 h-11 text-sm font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveImportedList()}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowListNameModal(false)}
                  className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveImportedList}
                  disabled={!listNameInput.trim()}
                  className="rounded-xl px-6 h-10 text-xs font-bold"
                >
                  Save & Import
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Generate button ─── */}
      {mode !== 'festival' && (
        <div className="sticky bottom-4 lg:bottom-0 lg:static pt-2">
          <Button
            onClick={() => generate()}
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
            {mode === 'all_in_one' ? 'Generate All-in-One Pack' :
              mode === 'whatsapp' ? 'Generate WhatsApp message' :
                mode === 'email' ? 'Generate email campaign' :
                  mode === 'video' ? 'Generate 1 video' :
                    `Generate ${mode === 'ecomm' ? ecommTotal : count} ${mode === 'carousel' ? 'carousels' : 'posts'}`}
          </Button>
          {!canGenerate && mode !== 'ecomm' && mode !== 'all_in_one' && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Tell us your idea to start ✨
            </p>
          )}
        </div>
      )}

      {/* ─── Upgrade / Plan Expired Modal ─── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-[2rem] p-8 border border-border/50 shadow-2xl text-center relative"
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={14} />
              </button>

              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={30} />
              </div>

              <h2 className="text-xl font-bold mb-2">
                {upgradeModalReason === 'expired' ? 'Plan Expired' : 'Premium Feature Locked'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {upgradeModalReason === 'expired'
                  ? 'Your SyncSocio plan has expired. Please renew your plan to continue using our AI strategy tools.'
                  : 'This is an Elite feature. Upgrade to the Elite Plan to unlock UGC/Product Video generation, All-in-One Drops, WhatsApp/Email Campaigns, and E-commerce Listing templates.'}
              </p>

              <Button
                onClick={() => { setShowUpgradeModal(false); navigate('/dashboard/buy-credits'); }}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold"
              >
                {upgradeModalReason === 'expired' ? 'Renew Plan' : 'Upgrade to Elite'}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-blocks
// ─────────────────────────────────────────────────────────────────────────────

const IdeaBox = ({
  idea, setIdea, placeholder, label,
}: {
  idea: string;
  setIdea: (v: string) => void;
  placeholder?: string;
  label?: string;
}) => (
  <section className="mb-6">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
      {label || 'Explain your idea'} <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
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
  language, setLanguage, country, isAiUgc
}: {
  language: string;
  setLanguage: (v: string) => void;
  country?: string;
  isAiUgc?: boolean;
}) => {
  let availableLanguages = languages;

  if (isAiUgc) {
    availableLanguages = country?.toLowerCase() === 'nepal'
      ? [{ id: 'english', label: 'English', flag: '🇬🇧' }]
      : languages.filter(l => l.id === 'english' || l.id === 'hindi');
  } else if (country?.toLowerCase() === 'nepal') {
    availableLanguages = [
      { id: 'english', label: 'English', flag: '🇬🇧' },
      { id: 'nepali', label: 'Nepali (नेपाली)', flag: '🇳🇵' }
    ];
  }

  return (
    <section className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Caption language</p>
      <div className="flex flex-wrap gap-2">
        {availableLanguages.map((l) => (
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
};

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
  whatsappCountryCode: string;
  setWhatsappCountryCode: (v: string) => void;
  addRecipient: () => void;
  recipientsFileRef: React.RefObject<HTMLInputElement | null>;
  handleRecipientsFile: (f: FileList | null) => void;
  sendStatus: 'idle' | 'sending' | 'sent';
  sendCampaign: () => void;
  back: () => void;
  regenerate: () => void;
  saveHeroImage?: () => void;
  savedLists: any[];
  setSavedLists: React.Dispatch<React.SetStateAction<any[]>>;
  selectedListId: string;
  setSelectedListId: (v: string) => void;
  showListNameModal: boolean;
  setShowListNameModal: (v: boolean) => void;
  listNameInput: string;
  setListNameInput: (v: string) => void;
  handleSaveImportedList: () => Promise<void>;
}

const COUNTRY_CODES = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", name: "Nepal", flag: "🇳🇵" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "+93", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "+218", name: "Libya", flag: "🇱🇾" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+211", name: "South Sudan", flag: "🇸🇸" },
  { code: "+249", name: "Sudan", flag: "🇸🇩" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "+244", name: "Angola", flag: "🇦🇴" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "+264", name: "Namibia", flag: "🇳🇦" },
  { code: "+267", name: "Botswana", flag: "🇧🇼" },
  { code: "+230", name: "Mauritius", flag: "🇲🇺" },
  { code: "+248", name: "Seychelles", flag: "🇸🇨" },
  { code: "+356", name: "Malta", flag: "🇲🇹" },
  { code: "+357", name: "Cyprus", flag: "🇨🇾" },
  { code: "+354", name: "Iceland", flag: "🇮🇸" },
  { code: "+370", name: "Lithuania", flag: "🇱🇹" },
  { code: "+371", name: "Latvia", flag: "🇱🇻" },
  { code: "+372", name: "Estonia", flag: "🇪🇪" },
  { code: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "+381", name: "Serbia", flag: "🇷🇸" },
  { code: "+382", name: "Montenegro", flag: "🇲🇪" },
  { code: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "+421", name: "Slovakia", flag: "🇸🇰" },
  { code: "+373", name: "Moldova", flag: "🇲🇩" },
  { code: "+995", name: "Georgia", flag: "🇬🇪" },
  { code: "+994", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "+976", name: "Mongolia", flag: "🇲🇳" },
  { code: "+95", name: "Myanmar", flag: "🇲🇲" },
  { code: "+855", name: "Cambodia", flag: "🇰🇭" },
  { code: "+856", name: "Laos", flag: "🇱🇦" },
  { code: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+886", name: "Taiwan", flag: "🇹🇼" },
  { code: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "+51", name: "Peru", flag: "🇵🇪" },
  { code: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "+507", name: "Panama", flag: "🇵🇦" },
  { code: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "+503", name: "El Salvador", flag: "🇸🇻" },
  { code: "+504", name: "Honduras", flag: "🇭🇳" },
  { code: "+505", name: "Nicaragua", flag: "🇳🇮" },
  { code: "+597", name: "Suriname", flag: "🇸🇷" },
  { code: "+592", name: "Guyana", flag: "🇬🇾" },
  { code: "+509", name: "Haiti", flag: "🇭🇹" },
  { code: "+876", name: "Jamaica", flag: "🇯🇲" },
  { code: "+242", name: "Congo", flag: "🇨🇬" },
  { code: "+243", name: "DR Congo", flag: "🇨🇩" },
  { code: "+225", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "+221", name: "Senegal", flag: "🇸🇳" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "+261", name: "Madagascar", flag: "🇲🇬" },
  { code: "+679", name: "Fiji", flag: "🇫🇯" }
];

const CampaignResults: React.FC<CampaignResultsProps> = ({
  mode, brandName, image, subject, setSubject, body, setBody,
  recipients, setRecipients, newRecipient, setNewRecipient, whatsappCountryCode, setWhatsappCountryCode, addRecipient,
  recipientsFileRef, handleRecipientsFile, sendStatus, sendCampaign, back, regenerate, saveHeroImage,
  savedLists, setSavedLists, selectedListId, setSelectedListId,
  showListNameModal, setShowListNameModal, listNameInput, setListNameInput, handleSaveImportedList,
}) => {
  const isWA = mode === 'whatsapp';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { toast } = useToast();

  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
    const userId = profile.user || profile._id;
    if (!userId) {
      toast({ title: "User session not found", variant: "destructive" });
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch(`${AI_BASE}/refine-campaign-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          body,
          instruction: refineInstruction,
          layout: mode
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSubject(data.data.subject);
        setBody(data.data.body);
        setShowRefineModal(false);
        setRefineInstruction('');
        toast({ title: "Copy refined successfully! ✨" });
      } else {
        toast({ title: data.detail || "Failed to refine copy", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error refining copy", variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.code.includes(countrySearchQuery)
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <Button onClick={() => setShowRefineModal(true)} variant="outline" size="sm" className="rounded-xl gap-2">
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
            <div className="rounded-3xl overflow-hidden border-[6px] border-foreground/80 shadow-2xl max-w-[320px] mx-auto bg-[#e5ddd5]">
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
                <div className="ml-auto max-w-[88%] bg-white rounded-2xl rounded-tr-md shadow-sm overflow-hidden border border-black/5 flex flex-col">
                  {image && (
                    <img src={image} className="w-full object-cover aspect-[16/10]" />
                  )}
                  <div className="p-3.5 pb-2.5">
                    <h4 className="text-[13px] font-bold text-gray-900 leading-snug mb-1.5">
                      {subject || `${brandName} Exclusive Offer`}
                    </h4>
                    <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed mb-2.5">{body}</pre>
                    <p className="text-[9px] text-gray-400 font-medium">
                      T&C apply. Reply STOP to unsubscribe.
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-gray-400">
                      {time} <CheckCheck size={11} className="text-[#34B7F1]" />
                    </div>
                  </div>
                  <a
                    href="#"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-t border-gray-100 text-[11px] font-bold text-[#0066cc] hover:bg-gray-50 active:bg-gray-100 transition-colors w-full"
                    onClick={(e) => e.preventDefault()}
                  >
                    <ExternalLink size={11} className="text-[#0066cc]" />
                    <span>{brandName.toLowerCase()} now</span>
                  </a>
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
                    <textarea
                      className="text-[11px] text-muted-foreground bg-transparent border border-transparent hover:border-border focus:border-border outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -ml-1 w-full max-w-[280px] transition-all resize-none"
                      value={subject || ''}
                      onChange={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        setSubject(e.target.value);
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder="✨ New drop just landed (Email Subject)"
                      title="Click to edit email subject"
                      rows={1}
                      style={{ minHeight: '20px', overflow: 'hidden' }}
                    />
                  </div>
                </div>
                {image && (
                  <img src={image} className="w-full rounded-xl object-cover aspect-video" />
                )}
                {body.includes('<') && (body.includes('</') || body.includes('/>')) ? (
                  <div
                    className="text-xs text-foreground leading-relaxed email-html-preview outline-none focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setBody(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: body }}
                    title="Click to edit email body"
                  />
                ) : (
                  <pre
                    className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 rounded-xl transition-all p-2"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setBody(e.currentTarget.innerText)}
                    title="Click to edit email body"
                  >
                    {body}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* EDITOR + RECIPIENTS */}
        <div className="space-y-4">
          {/* Edit body */}
          {isWA && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Edit message
              </p>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="WhatsApp Heading (e.g., Flat ₹100 OFF for you!)"
                className="rounded-xl border-border/60 bg-card h-10 text-sm mb-2"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[160px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed"
              />
            </div>
          )}

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
                <FileSpreadsheet size={11} /> Import CSV/TXT/Excel
              </button>
              <input
                ref={recipientsFileRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleRecipientsFile(e.target.files)}
              />
            </div>

            {/* Saved lists selection dropdown */}
            {savedLists.length > 0 && (
              <div ref={dropdownRef} className="relative mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  type="button"
                  onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                  title={(() => {
                    const selectedList = savedLists.find(x => x._id === selectedListId);
                    if (!selectedList) return '';
                    const contacts = mode === 'whatsapp' ? selectedList.phones : selectedList.emails;
                    return contacts?.join('\n') || '';
                  })()}
                  className="flex items-center justify-between w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-xs font-semibold hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary transition-all text-left"
                >
                  <div className="flex items-center truncate">
                    {(() => {
                      const selectedList = savedLists.find(x => x._id === selectedListId);
                      if (selectedList) {
                        return (
                          <>
                            <Folder size={14} className="text-primary mr-2 shrink-0" />
                            <span className="truncate text-foreground font-black">{selectedList.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5 font-bold shrink-0">({(mode === 'whatsapp' ? selectedList.phones : selectedList.emails)?.length || 0} contacts)</span>
                          </>
                        );
                      }
                      return <span className="text-muted-foreground">-- Choose from saved recipient lists --</span>;
                    })()}
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
                      isListDropdownOpen && "transform rotate-180 text-foreground"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isListDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 mt-1 z-30 max-h-60 overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 space-y-0.5"
                    >
                      <div
                        onClick={() => {
                          setSelectedListId('');
                          setRecipients([]);
                          setIsListDropdownOpen(false);
                        }}
                        className={cn(
                          "flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          selectedListId === ''
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        -- Clear selection --
                      </div>

                      {savedLists.map((list) => {
                        const isSelected = list._id === selectedListId;
                        const contacts = mode === 'whatsapp' ? list.phones : list.emails;
                        const safeContacts = contacts || [];
                        const contactsPreview = safeContacts.slice(0, 3).join(', ') + (safeContacts.length > 3 ? '...' : '');
                        return (
                          <div
                            key={list._id}
                            onClick={() => {
                              setSelectedListId(list._id);
                              setRecipients(safeContacts);
                              setIsListDropdownOpen(false);
                            }}
                            title={safeContacts.join('\n')}
                            className={cn(
                              "flex flex-col px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center min-w-0">
                                <Folder size={14} className={cn("mr-2 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                                <span className="truncate">{list.name}</span>
                              </div>
                              <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2", isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                {safeContacts.length} contacts
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 font-medium truncate ml-5 mt-1 max-w-[320px]">
                              {contactsPreview}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="flex gap-2 mb-2">
              {isWA && (
                <div ref={countryDropdownRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="rounded-xl border border-border/60 bg-card h-10 px-3 text-sm focus:outline-none text-foreground flex items-center gap-1.5 font-semibold hover:bg-muted/30 transition-all"
                  >
                    <span>{COUNTRY_CODES.find(c => c.code === whatsappCountryCode)?.flag || '🌐'}</span>
                    <span>{whatsappCountryCode}</span>
                    <ChevronDown size={12} className={cn("text-muted-foreground transition-transform", isCountryDropdownOpen && "transform rotate-180")} />
                  </button>

                  {isCountryDropdownOpen && (
                    <div className="absolute left-0 mt-1 z-[60] w-64 bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-2xl p-2 flex flex-col gap-2">
                      <Input
                        type="text"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        placeholder="Search country or code..."
                        className="h-8 rounded-lg text-xs bg-muted/30 border-border/50"
                        autoFocus
                      />
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((c) => (
                            <button
                              key={c.name + c.code}
                              type="button"
                              onClick={() => {
                                setWhatsappCountryCode(c.code);
                                setIsCountryDropdownOpen(false);
                                setCountrySearchQuery('');
                              }}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 hover:bg-muted rounded-xl text-xs font-semibold cursor-pointer w-full text-left transition-colors",
                                whatsappCountryCode === c.code ? "bg-primary/10 text-primary" : "text-foreground"
                              )}
                            >
                              <span className="text-sm shrink-0">{c.flag}</span>
                              <span className="flex-1 truncate text-left">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono font-bold shrink-0">{c.code}</span>
                            </button>
                          ))
                        ) : (
                          <div className="text-[10px] text-muted-foreground text-center py-4 font-semibold">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                placeholder={isWA ? '98765 43210' : 'email@example.com'}
                className="rounded-xl border-border/60 bg-card h-10 text-sm flex-1"
              />
              <Button onClick={addRecipient} variant="outline" className="rounded-xl h-10 shrink-0">Add</Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto border border-border/40 rounded-xl p-3 bg-muted/20 mb-3">
                {recipients.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border/20 text-xs font-medium">
                    {r}
                    <button onClick={() => setRecipients((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={10} className="text-muted-foreground hover:text-foreground cursor-pointer" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Send button */}
          {(() => {
            const cachedProfile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
            const isEmailMode = mode === 'email';
            const isDomainVerified = !isEmailMode || cachedProfile?.email_domain_verified === true;

            if (isEmailMode && !isDomainVerified) {
              return (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                      <AlertTriangle size={15} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Email domain setup required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Before you can send campaigns, verify your sending domain so emails land in inboxes.
                      </p>
                    </div>
                  </div>
                  <a
                    href="/dashboard/settings"
                    className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 transition-all"
                  >
                    Go to Settings → Email Setup
                  </a>
                </div>
              );
            }

            return (
              <>
                {isEmailMode && cachedProfile?.email_from && (
                  <p className="text-center text-[11px] text-muted-foreground font-medium">
                    📨 Sending from: <span className="font-mono text-foreground">{cachedProfile.email_from}</span>
                  </p>
                )}
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
              </>
            );
          })()}

        </div>
      </div>

      {/* ─── List Name Modal ─── */}
      <AnimatePresence>
        {showListNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowListNameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-foreground">Name your imported recipient list</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Provide a recognizable name for this contact list so you can reuse it later.</p>
              </div>

              <div className="space-y-2">
                <Input
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  placeholder="e.g. my fav customer"
                  className="rounded-xl border-border/80 bg-muted/20 h-11 text-sm font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveImportedList()}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowListNameModal(false)}
                  className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveImportedList}
                  disabled={!listNameInput.trim()}
                  className="rounded-xl px-6 h-10 text-xs font-bold"
                >
                  Save & Import
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRefineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowRefineModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-foreground">Refine Copy with AI ✨</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Tell the AI how to rewrite the text. The layout and image will remain unchanged.</p>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="e.g. Translate this into Spanish, or make it sound more urgent..."
                  className="rounded-xl border-border/80 bg-muted/20 h-24 text-sm font-semibold resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRefineModal(false)}
                  disabled={isRefining}
                  className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRefine}
                  disabled={!refineInstruction.trim() || isRefining}
                  className="rounded-xl px-6 h-10 text-xs font-bold gap-2"
                >
                  {isRefining ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {isRefining ? 'Refining...' : 'Refine Copy'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardStrategy;
