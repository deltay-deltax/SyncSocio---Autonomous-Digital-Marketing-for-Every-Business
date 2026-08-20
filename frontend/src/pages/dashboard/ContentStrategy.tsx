import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Layers, Video, Plus, Shuffle, Sparkles, ArrowLeft, ArrowRight,
  Wand2, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, ShoppingBag,
  PartyPopper, Download, RefreshCw, Check, MessageSquare, Mail, Upload,
  Phone, AtSign, Paperclip, Smile, Mic, CheckCheck, AlertCircle, Library,
  Package, CheckCircle2, FileSpreadsheet, ChevronDown, Copy, Folder, ExternalLink, Edit3, Lock, AlertTriangle, Camera, Eye, Zap, Paintbrush, Info, Megaphone, Target, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn, safeSetItem } from '@/lib/utils';
import { useNavigate, useOutletContext, useLocation, useBlocker } from 'react-router-dom';
import FestivalCalendar, { FESTIVALS_2026 } from '@/components/FestivalCalendar';
import Masonry from 'react-masonry-css';
import WhatsAppTemplates from './WhatsAppTemplates';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';

import { getFriendlyErrorMessage } from '@/lib/errorHandler';

const breakpointColumnsObj = {
  default: 3,
  1024: 2,
  640: 1
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'ads' | 'sprint' | 'editor' | 'clone' | 'all_in_one' | 'image' | 'carousel' | 'video' | 'ecomm' | 'festival' | 'whatsapp' | 'email' | 'edit_media' | 'photoshoot';
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

interface GlobalAvatar {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  gender: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
const NODE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const ASSET_CACHE_KEY = 'syncsocio_strategy_assets';

const modes: { id: Mode; label: string; icon: any; desc: string; accent: string }[] = [
  { id: 'ads', label: 'Ads', icon: Megaphone, desc: 'Generate AI Ad Creatives', accent: 'from-blue-500 to-indigo-500' },
  { id: 'all_in_one', label: 'All In One', icon: Wand2, desc: 'Generate complete marketing pack', accent: 'from-indigo-500/20 via-purple-500/10 to-pink-500/5' },
  { id: 'image', label: 'Image', icon: ImageIcon, desc: 'Single static post', accent: 'from-sky-500/20 to-blue-500/10' },
  { id: 'carousel', label: 'Carousel', icon: Layers, desc: 'Multi-slide swipe', accent: 'from-fuchsia-500/20 to-rose-500/10' },
  { id: 'video', label: 'Video', icon: Video, desc: 'Reel / motion post', accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'ecomm', label: 'E-Comm Listing', icon: ShoppingBag, desc: 'Marketplace-ready creative', accent: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'festival', label: 'Festival', icon: PartyPopper, desc: 'Calendar-led campaigns', accent: 'from-violet-500/20 to-indigo-500/10' },
  { id: 'whatsapp', label: 'WhatsApp Campaign', icon: MessageSquare, desc: 'Broadcast to your list', accent: 'from-green-500/20 to-emerald-500/10' },
  { id: 'email', label: 'Email Campaign', icon: Mail, desc: 'Newsletter & promo blast', accent: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'photoshoot', label: 'Photoshoot', icon: Camera, desc: 'Pure product photoshoot', accent: 'from-fuchsia-500/20 to-purple-500/10' },
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
const ecommImageCounts = [6, 7, 8, 9];

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
  { id: 'nepali', label: 'Nepali (नेपाली)', flag: '🇳🇵' },
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
  description?: string;
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
  badge?: { label: string; tint: string };
};

const STUDIOS: Studio[] = [
  {
    id: "ads",
    title: "AI Ad Creatives",
    subtitle: "High-converting marketing ads",
    description: "Generate highly branded, conversion-optimized ad creatives using the 'Director' AI.",
    icon: Megaphone,
    iconTint: "text-blue-600",
    iconBg: "bg-blue-100",
    badge: { label: "New", tint: "bg-blue-600 text-white font-extrabold shadow-md" },
    tags: [
      { label: "Ads", tint: "bg-blue-50 text-blue-700 ring-blue-100" }
    ],
    cta: { label: "Generate Ads", tint: "text-blue-600" },
    to: "/dashboard?mode=ads",
    image: "/assets/Creatives_icon/Ads.png",
    featured: true,
    hoverBorder: "hover:border-blue-400 hover:ring-1 hover:ring-blue-400",
  },
  {
    id: "clone",
    title: "Clone Mode",
    subtitle: "Clone a winning template",
    description: "Instantly recreate successful ad templates with your own products using advanced AI.",
    icon: Copy,
    iconTint: "text-purple-600",
    iconBg: "bg-purple-100",
    badge: { label: "New", tint: "bg-purple-600 text-white font-extrabold shadow-md" },
    tags: [
      { label: "AI", tint: "bg-slate-50 text-slate-600 ring-slate-200" }
    ],
    cta: { label: "Start Cloning", tint: "text-purple-600" },
    to: "/dashboard/clone",
    image: "/assets/Creatives_icon/clone-mode-card.png",
    featured: true,
    hoverBorder: "hover:border-purple-400 hover:ring-1 hover:ring-purple-400",
  },
  {
    id: "sprint",
    title: "Sprint",
    subtitle: "A/B test winning creatives",
    description: "Automatically run A/B tests on multiple ad variations to find the best performing creative.",
    icon: Zap,
    iconTint: "text-amber-600",
    iconBg: "bg-amber-100",
    badge: { label: "Best", tint: "bg-[#FFC107] text-[#5C4000] font-extrabold shadow-md" },
    tags: [
      { label: "Ads", tint: "bg-slate-50 text-slate-600 ring-slate-200" }
    ],
    cta: { label: "Run Sprint", tint: "text-amber-600" },
    to: "/dashboard/autopilot",
    image: "/assets/Creatives_icon/studio-sprint.png",
    featured: true,
    hoverBorder: "hover:border-amber-400 hover:ring-1 hover:ring-amber-400",
  },
  {
    id: "all_in_one",
    title: "All In One",
    subtitle: "Generate a complete marketing pack",
    description: "Generate a full suite of marketing assets including static posts, videos, and carousel slides in one go.",
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
    description: "Create a polished, single-frame static image tailored for social media feeds.",
    icon: ImageIcon,
    iconTint: "text-blue-600",
    iconBg: "bg-blue-100",
    tags: [
      { label: "Product", tint: "bg-blue-50 text-blue-700 ring-blue-100" },
      { label: "Offer", tint: "bg-orange-50 text-orange-700 ring-orange-100" },
    ],
    cta: { label: "Start Creating", tint: "text-blue-600" },
    to: "/dashboard?mode=image",
    image: "/assets/Creatives_icon/Ads.png",
    hoverBorder: "hover:border-blue-400 hover:ring-1 hover:ring-blue-400",
  },
  {
    id: "carousel",
    title: "Carousel",
    subtitle: "Multi-slide swipe storytelling",
    description: "Design engaging multi-slide swipeable posts ideal for tips, guides, and storytelling.",
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
    description: "Generate dynamic motion posts and AI-driven UGC style reels for maximum engagement.",
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
    description: "Produce clean, professional marketplace-ready creatives optimized for e-commerce platforms.",
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
    description: "Quickly generate themed campaigns aligned with upcoming calendar events and holidays.",
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
  {
    id: "whatsapp",
    title: "WhatsApp Campaign",
    subtitle: "Broadcast messages to your list",
    description: "Design and broadcast promotional messages or reminders directly to your WhatsApp list.",
    icon: MessageSquare,
    iconTint: "text-emerald-600",
    iconBg: "bg-emerald-100",
    tags: [
      { label: "Promotion", tint: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
      { label: "Offer", tint: "bg-orange-50 text-orange-700 ring-orange-100" },

    ],
    cta: { label: "Create Campaign", tint: "text-emerald-600" },
    to: "/dashboard?mode=whatsapp",
    image: "/assets/Creatives_icon/studio-whatsapp.png",
    hoverBorder: "hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400",
  },
  {
    id: "email",
    title: "Email Campaign",
    subtitle: "Newsletter & promo blast",
    description: "Create visually appealing newsletters and promotional blasts for your email subscribers.",
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
  {
    id: "photoshoot",
    title: "Photoshoot",
    subtitle: "Pure product photography, no text",
    description: "Generate high-quality, pure product photography without any text overlays.",
    icon: Camera,
    iconTint: "text-fuchsia-600",
    iconBg: "bg-fuchsia-100",
    tags: [
      { label: "Product", tint: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100" },
      { label: "No Text", tint: "bg-slate-50 text-slate-600 ring-slate-200" },
    ],
    cta: { label: "Start Photoshoot", tint: "text-fuchsia-600" },
    to: "/dashboard?mode=photoshoot",
    image: "/assets/Creatives_icon/studio-photoshoot.png",
    hoverBorder: "hover:border-fuchsia-400 hover:ring-1 hover:ring-fuchsia-400",
  },
  {
    id: "editor",
    title: "AI Editor",
    subtitle: "Magic tools & photo retouch",
    description: "Access powerful magic tools to seamlessly retouch and enhance your existing photos.",
    icon: Paintbrush,
    iconTint: "text-cyan-600",
    iconBg: "bg-cyan-100",
    tags: [
      { label: "Magic", tint: "bg-cyan-50 text-cyan-700 ring-cyan-100" },
      { label: "Retouch", tint: "bg-purple-50 text-purple-700 ring-purple-100" }
    ],
    cta: { label: "Open Editor", tint: "text-cyan-600" },
    to: "/dashboard/editor",
    image: "/assets/Creatives_icon/studio-editor.png",
    hoverBorder: "hover:border-cyan-400 hover:ring-1 hover:ring-cyan-400",
  }
];

const StudioCard: React.FC<{ s: Studio; i: number; onPick: (id: Mode) => void; isLocked: boolean }> = ({ s, i, onPick, isLocked }) => {
  const Icon = s.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.04 }}
      className={cn("h-full", s.wide ? "md:col-span-2 lg:col-span-3" : "md:col-span-1 lg:col-span-2")}
    >
      <button
        onClick={() => onPick(s.id as Mode)}
        className={cn(
          "group relative flex flex-col w-full h-full min-h-[230px] text-left overflow-hidden rounded-3xl border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant",
          s.featured
            ? "border-transparent bg-gradient-to-br from-indigo-50/60 via-white to-white"
            : "border-transparent",
          s.hoverBorder
        )}
      >
        {s.badge ? (
          <div className={cn("absolute top-4 right-4 z-20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm", s.badge.tint)}>
            {s.badge.label}
          </div>
        ) : null}
        {/* Right image — absolutely positioned so it never affects left column height */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 w-[120px] sm:w-[140px] xl:w-[170px] flex items-center justify-center pointer-events-none",
          s.id === "photoshoot" && "p-3 sm:p-4"
        )}>
          <img
            src={s.image}
            alt={`${s.title} preview`}
            loading="lazy"
            className={cn(
              "h-full w-full transition-transform duration-500",
              s.id === "photoshoot" ? "object-cover rounded-2xl shadow-sm" : "object-contain",
              s.id === "video" && "rotate-3",
              isLocked && "opacity-75 grayscale-[30%]"
            )}
          />
        </div>

        {/* Left content — pr ensures it never overlaps the image */}
        <div className="flex flex-col flex-1 min-w-0 pr-[120px] sm:pr-[150px] xl:pr-[180px] relative z-10">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner shrink-0 relative",
              s.iconBg,
            )}
          >
            <Icon size={20} className={s.iconTint} />
            {isLocked && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Lock size={10} />
              </div>
            )}
          </div>
          <div className="mt-3 flex items-start gap-1.5 pr-2">
            <h3 className="font-display text-base font-black tracking-tight text-foreground leading-tight line-clamp-2">
              {s.title}
            </h3>
            <div title={s.description || s.subtitle} className="mt-[2px] shrink-0 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" onClick={(e) => e.stopPropagation()}>
              <Info size={14} />
            </div>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {s.subtitle}
          </p>

          {/* Pills — wrap gracefully */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
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
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-600">
                <Lock size={12} /> Unlock with Growth / Pro
              </span>
            ) : (
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
            )}
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
    profile: contextProfile,
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
    profile?: any;
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
  const profile = contextProfile || JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
  const userId = profile?.user || profile?._id || 'default';
  const brandId = profile?._id || 'default';
  const brandName = (profile?.brandName || 'yourbrand').toLowerCase().replace(/\s+/g, '');
  const { toast } = useToast();

  const planName = (profile.userPlan || profile.selectedPlan || profile.plan || '').toLowerCase();
  const isStarter = planName === 'starter' || (!planName.includes('growth') && !planName.includes('pro'));
  const isGrowthOrAbove = planName.includes('growth') || planName.includes('pro');

  const checkLocked = (sId: string) => {
    if (isStarter) {
      return ['ads', 'clone', 'sprint', 'video', 'all_in_one', 'whatsapp', 'email'].includes(sId);
    }
    return false;
  };

  const sortedStudios = React.useMemo(() => {
    return [...STUDIOS].sort((a, b) => {
      const aLocked = checkLocked(a.id);
      const bLocked = checkLocked(b.id);
      if (aLocked === bLocked) return 0;
      return aLocked ? 1 : -1;
    });
  }, [isStarter]);

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
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

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

      if (task.mode === 'edit_media' && posts.length > 0) {
        setPreviewPost(posts[0]);
        setPreviewIndex(0);
      }

      // Block Edit Media for queue/bulk generation modes
      if (task.mode === 'sprint' || task.mode === 'all_in_one') {
        setGenerated(posts.map((p: any) => ({ ...p, isEdited: true })));
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

      // Block Edit Media for queue/bulk generation modes
      if (viewingTask.mode === 'sprint' || viewingTask.mode === 'all_in_one') {
        setGenerated(posts.map((p: any) => ({ ...p, isEdited: true })));
      }

      if (viewingTask.mode === 'whatsapp' || viewingTask.mode === 'email') {
        const first = posts[0] || {};
        setCampaignImage(imgSrc(first.image) || '');
        setCampaignBody(first.caption || '');
        if (viewingTask.mode === 'email') setCampaignSubject(first.subject || '');
      }

      const timer = setTimeout(() => {
        if (clearViewingTask) clearViewingTask();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [viewingTask, clearViewingTask]);

  // Load draft email if draftId is in query params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const draftId = params.get('draftId');
    if (draftId && brandId) {
      const loadDraft = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${NODE_BASE}/strategy-assets`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const creatives = data.creatives || [];
            const draft = creatives.find((c: any) => c._id === draftId && c.status === 'draft');
            if (draft) {
              setMode('email');
              setStage('results');
              setCampaignImage(imgSrc(draft.thumbnailBase64) || '');
              setCurrentDraftId(draft._id);

              try {
                const parsed = JSON.parse(draft.caption);
                setCampaignSubject(parsed.subject || '');
                setCampaignBody(parsed.body || '');
              } catch (e) {
                setCampaignBody(draft.caption || '');
              }

              // Clear query parameters from URL without reloading
              navigate('/dashboard/strategy', { replace: true });
            }
          }
        } catch (e) {
          console.error('[Strategy] Failed to load draft:', e);
        }
      };
      loadDraft();
    }
  }, [location.search, brandId, navigate]);

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
    const c = profile?.location?.country?.toLowerCase();
    if (c === 'nepal') {
      if (language !== 'english' && language !== 'nepali') {
        setLanguage('english');
      }
    } else if (c === 'india') {
      if (language === 'nepali') {
        setLanguage('english');
      }
    } else {
      if (language !== 'english') {
        setLanguage('english');
      }
    }
  }, [profile?.location?.country, language]);

  const [videoKind, setVideoKind] = useState<string>('ai-ugc');
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [videoResolution, setVideoResolution] = useState<string>('1080p');
  const [selectedMotionPreset, setSelectedMotionPreset] = useState<string | null>(null);
  const [avatarDescription, setAvatarDescription] = useState<string>('');
  const [videoScript, setVideoScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);

  const generateAiScript = async () => {
    setIsGeneratingScript(true);
    try {
      // Basic placeholder until backend endpoint is available
      setVideoScript("Generated script will appear here...");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // ── E-comm
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<string>('Amazon');
  const [ecommImgCount, setEcommImgCount] = useState<number>(9);

  // ── Avatars
  const [avatars, setAvatars] = useState<GlobalAvatar[]>([]);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [newAvatarDesc, setNewAvatarDesc] = useState<string>('');
  const [newAvatarGender, setNewAvatarGender] = useState<'male' | 'female' | 'other'>('female');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState<boolean>(false);

  // ── DM Automation
  const [commentKeyword, setCommentKeyword] = useState<string>('');

  // ── Image ad template (null = auto, 1–10 = specific template, -1 = all 8 variants)
  const [adTemplate, setAdTemplate] = useState<number | null>(null);
  // ── Text density mode for image generation ("low" = one clean headline | "heavy" = model decides freely)

  // ── SaaS Format Track (only active when isSaasMode && mode === 'image')
  const [saasFormatId, setSaasFormatId] = useState<number | null>(null);
  const [saasFormatTrack, setSaasFormatTrack] = useState<SaasTrack | null>(null);

  // ── Festival
  const [festival, setFestival] = useState<string>('diwali');
  const [tone, setTone] = useState<string>('Festive sale');

  // ── WhatsApp / Email
  const [generateImage, setGenerateImage] = useState<boolean>(true);
  const [productPick, setProductPick] = useState<string>('');
  const [campaignGoal, setCampaignGoal] = useState<string>('discover');
  const [campaignAngle, setCampaignAngle] = useState<string>('auto');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState('syncsocio_v4_shop');
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [whatsappTemplatesLoading, setWhatsappTemplatesLoading] = useState(false);
  const [requestedTemplates, setRequestedTemplates] = useState<any[]>([]);
  const [isRequestingTemplate, setIsRequestingTemplate] = useState(false);
  const [whatsappUrlParam, setWhatsappUrlParam] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignVariables, setCampaignVariables] = useState<any>(null);
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
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRequestedTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${NODE_BASE}/campaigns/requested-templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRequestedTemplates(data);
        }
      } catch (err) {
        console.error('Failed to fetch requested templates', err);
      }
    };

    const fetchMetaTemplates = async () => {
      setWhatsappTemplatesLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${NODE_BASE}/whatsapp/templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // data.data contains the templates list from Meta Graph API
          if (data && data.data && Array.isArray(data.data)) {
            setWhatsappTemplates(data.data);
            // Default to first approved template if available
            const approved = data.data.filter((t: any) => t.status === 'APPROVED');
            if (approved.length > 0) {
              setWhatsappTemplateName(approved[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch Meta templates', err);
      } finally {
        setWhatsappTemplatesLoading(false);
      }
    };

    if (mode === 'whatsapp') {
      fetchRequestedTemplates();
      fetchMetaTemplates();
    }
  }, [mode]);
  const campaignFileInput = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // ── Products (from API)
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);

  React.useEffect(() => {
    const maxProducts = ['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count);
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
  const [upgradeModalReason, setUpgradeModalReason] = useState<string | null>(null);

  const isPlanExpired = profile?.userPlanExpiresAt ? new Date(profile.userPlanExpiresAt) < new Date() : false;

  const isGrowth = planName.includes('growth');
  const isPro = planName.includes('pro');
  const isAgency = planName.includes('agency');
  const isElite = planName.includes('elite');
  const hasGrowthOrPro = isGrowth || isPro || isElite || isAgency;
  const isSaasMode = SAAS_BRAND_CATEGORIES.includes(profile.businessCategory || '');

  React.useEffect(() => {
    if (mode) {
      if (isPlanExpired) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason('expired');
        setShowUpgradeModal(true);
      } else if (isSaasMode && (mode === 'ads' || mode === 'ecomm' || mode === 'all_in_one')) {
        setStage('pick');
        setMode(null);
      } else if (mode === 'ads' && !hasGrowthOrPro) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason('ads');
        setShowUpgradeModal(true);
      } else if (mode === 'video' && !hasGrowthOrPro) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason('video');
        setShowUpgradeModal(true);
      } else if (['all_in_one'].includes(mode) && !hasGrowthOrPro) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason(mode);
        setShowUpgradeModal(true);
      } else if (['whatsapp', 'email'].includes(mode) && !hasGrowthOrPro) {
        setStage('pick');
        setMode(null);
        setUpgradeModalReason(mode);
        setShowUpgradeModal(true);
      }
    }
  }, [mode, isPlanExpired, hasGrowthOrPro, isSaasMode]);

  const handleModeClick = (mId: Mode) => {
    if (checkLocked(mId)) {
      setUpgradeModalReason(mId);
      setShowUpgradeModal(true);
      return;
    }

    if (isPlanExpired) {
      setUpgradeModalReason('expired');
      setShowUpgradeModal(true);
      return;
    }

    if (mId === 'clone') {
      navigate('/dashboard/clone');
      return;
    }
    if (mId === 'sprint') {
      navigate('/dashboard/autopilot');
      return;
    }
    if (mId === 'editor') {
      navigate('/dashboard/editor');
      return;
    }

    setShowUpgradeModal(false);
    openMode(mId);
  };

  // Filter modes: SaaS brands don’t see E-Comm Listing, All In One, or AI Ad Creatives
  const visibleModes = isSaasMode
    ? modes.filter((m) => m.id !== 'ecomm' && m.id !== 'all_in_one' && m.id !== 'ads')
    : modes;

  const visibleVideoKinds = isSaasMode
    ? videoKinds.filter((v) => v.id !== 'img2video')
    : videoKinds;

  // ── Fetch Avatars
  const fetchAvatars = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NODE_BASE}/avatars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvatars(data);
      }
    } catch (e) {
      console.error('Failed to fetch avatars', e);
    }
  };

  React.useEffect(() => {
    if (mode === 'ecomm') {
      fetchAvatars();
    }
  }, [mode]);

  // ── Fetch products
  const handleGenerateAvatar = async () => {

    if (!newAvatarDesc.trim()) return;
    setIsGeneratingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NODE_BASE}/avatars/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          description: newAvatarDesc,
          gender: newAvatarGender
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        try {
          const errJson = JSON.parse(errText);
          throw new Error(errJson.detail || errJson.error || errText);
        } catch {
          throw new Error(errText);
        }
      }
      const newAvatar = await res.json();
      setAvatars([newAvatar, ...avatars]);
      setSelectedAvatarUrl(newAvatar.imageUrl);
      setShowAvatarModal(false);
      setNewAvatarDesc('');
      toast({ title: 'Avatar Generated!', description: 'Your custom virtual model is ready.', variant: 'default' });
    } catch (error: any) {
      toast({ title: 'Failed to generate avatar', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

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

    const limit = mode === 'ecomm' ? 1 : (mode === 'ads' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count));
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

  // Fetch creative library on mount or brand change
  React.useEffect(() => {
    if (brandId) {
      fetchCreativeLibrary();
    }
  }, [brandId]);

  // Sync savedIndices when generated posts change
  React.useEffect(() => {
    if (generated.length === 0) {
      setSavedIndices(new Set());
    }
  }, [generated]);

  const pickRandom = () => {
    const targetLimit = mode === 'ecomm' || mode === 'ads' ? 1 : count;
    if (products.length > 0) {
      const shuffled = [...products].sort(() => 0.5 - Math.random()).slice(0, Math.min(products.length, targetLimit));
      setSelectedProducts(shuffled);
      setUploads([]);
    } else {
      const shuffled = [...stockImages].sort(() => 0.5 - Math.random()).slice(0, mode === 'ads' ? 1 : 4);
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
        const limit = mode === 'all_in_one' ? 1 : (mode === 'ecomm' ? 1 : (mode === 'ads' ? 1 : (mode === 'video' && videoKind === 'img2video' ? 1 : count)));
        if (prev.length >= limit) return prev;
        return [...prev, p];
      }
    });
  };

  // ── Mode navigation
  const openMode = (m: Mode) => {
    setMode(m);
    setStage('builder');
    setCurrentDraftId(null);
    if (m === 'all_in_one') {
      setCount(1);
      setLanguage('english');
    }
    if (m === 'image') setCount(4);
    if (m === 'carousel') setCount(1);
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
    setCurrentDraftId(null);
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
      const hasProduct = selectedProducts.length > 0 || uploads.length > 0;
      const hasTitle = idea.trim().length > 0;
      const hasAvatar = avatarDescription.trim().length > 0;
      const hasScript = videoScript.trim().length > 0;
      return hasProduct && hasTitle && hasAvatar && hasScript;
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
    if (mode === 'email' && !profile?.use_generic_email_sender && !profile?.email_domain_verified) {
      toast({
        title: '⚠️ Email setup required',
        description: 'Verify your email domain in Settings → Email Setup before sending campaigns.',
        variant: 'destructive'
      });
      return;
    }

    // Client-side guard: check WhatsApp connection before sending
    if (mode === 'whatsapp' && !profile?.whatsappIsConnected) {
      toast({
        title: '⚠️ WhatsApp not connected',
        description: 'Connect your WhatsApp Business account in Settings → Connected Accounts before sending.',
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
        subject: campaignSubject || (isWhatsapp ? 'WhatsApp Campaign' : 'Email Campaign'),
        whatsappTemplateName: isWhatsapp ? whatsappTemplateName : undefined,
        whatsappUrlParam: isWhatsapp ? whatsappUrlParam : undefined,
        whatsappVariables: isWhatsapp ? campaignVariables : undefined
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

        // Automatically delete from drafts if sent successfully
        if (currentDraftId && mode === 'email') {
          try {
            const delRes = await fetch(`${NODE_BASE}/strategy-assets/${currentDraftId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (delRes.ok) {
              const newLib = creativeLibrary.filter(c => c._id !== currentDraftId);
              setCreativeLibrary(newLib);
              const cacheKey = `syncsocio_strategy_assets_${brandId}`;
              await setCache(cacheKey, newLib);
              setCurrentDraftId(null);
            }
          } catch (e) {
            console.error('Failed to delete draft after sending', e);
          }
        }
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
        if (errData.code === 'EMAIL_QUOTA_EXCEEDED') {
          toast({
            title: '🚫 Monthly email limit reached',
            description: errData.message || 'You have used all your email quota for this month. Upgrade your plan to send more.',
            variant: 'destructive'
          });
          setSendStatus('idle');
          return;
        }
        if (errData.code === 'NO_EMAIL_PLAN') {
          toast({
            title: '🔒 Plan required',
            description: 'Upgrade to a Growth or Pro plan to send email campaigns.',
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
        description: 'Failed to send campaign: ' + getFriendlyErrorMessage(err),
        variant: "destructive"
      });
      setSendStatus('idle');
    }
  };


  const generate = async (overrides?: { idea?: string; count?: number; products?: any[]; layout?: string; aspect?: string; language?: string }) => {
    setStage('generating');
    setGenError(null);

    try {
      const currentMode = overrides?.layout || mode;
      const currentProducts = overrides?.products !== undefined ? overrides.products : selectedProducts;
      const currentIdea = overrides?.idea !== undefined ? overrides.idea : idea;

      let currentCount = overrides?.count !== undefined ? overrides.count : count;
      let currentAspect = overrides?.aspect !== undefined ? overrides.aspect : (mode === 'festival' && tone === 'Story' ? '9:16' : aspect);
      let currentLanguage = overrides?.language !== undefined ? overrides.language : language;

      let refImages: string[] = [];
      if (currentMode === 'whatsapp' || currentMode === 'email') {
        if (activeCampaignImageSource === 'product' && (currentProducts[0]?.imageBase64 || (currentProducts[0]?.imageUrls && currentProducts[0].imageUrls[0]))) {
          refImages = [currentProducts[0].imageBase64 || currentProducts[0].imageUrls![0]];
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
          refImages = currentProducts.map((p) => p.imageBase64 || (p.imageUrls && p.imageUrls[0])).filter(Boolean) as string[];
        } else {
          refImages = await Promise.all(uploads.map((u) => toBase64(u)));
        }
      }

      // AI Ads appends the authoritative brand logo server-side so it is attached
      // exactly once to every creative in the batch. Other modes still receive it
      // from the client as before.
      if (currentMode !== 'ads' && profile?.logo && !refImages.includes(profile.logo)) {
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
        layout: currentMode,
        count: currentMode === 'ecomm' ? ecommTotal : currentCount,
        slideCount,
        aspectRatio: currentAspect,
        idea: finalIdea,
        refImages,
        products: (currentProducts.length > 0 && !hasCustomUpload) ? currentProducts : undefined,
        language: currentLanguage,
        whatsappTemplate: (currentMode === 'whatsapp') ? whatsappTemplateName : undefined,
        generateImage: (currentMode === 'whatsapp' || currentMode === 'email') ? false : generateImage,
        userPlan: planName,
        ...(currentMode === 'ecomm' && {
          platform,
          imageCount: ecommTotal,
          avatarUrl: selectedAvatarUrl,
        }),
        ...((currentMode === 'image' || currentMode === 'festival') && {
          // SaaS brands: use saasFormatId (101-106) when a format is selected
          // If a track is selected but no specific format, use 100 for generic Text-led, 110 for generic Image-led
          adTemplate: isSaasMode && currentMode === 'image'
            ? (saasFormatId ?? (saasFormatTrack === 'text_led' ? 100 : saasFormatTrack === 'image_led' ? 110 : null))
            : (currentCount === 8 ? -1 : adTemplate),

        }),
        ...(currentMode === 'ads' && {
          campaignGoal,
          campaignAngle
        }),
        videoKind: currentMode === 'video' ? videoKind : undefined,
        avatarDescription: (currentMode === 'video' && videoKind === 'ai-ugc') ? avatarDescription : undefined,
        videoScript: (currentMode === 'video' && videoKind === 'ai-ugc') ? videoScript : undefined,
        videoResolution: currentMode === 'video' ? videoResolution : undefined,
        videoDuration: currentMode === 'video' ? videoDuration : undefined,
        ...((currentMode === 'image' || currentMode === 'carousel') && {
          commentKeyword: commentKeyword.trim() ? commentKeyword.trim() : undefined,
        }),
      };

      // ── Credit cost — calculated upfront, deducted ONLY after success ──
      let creditCost = 0;
      const baseImageCost = profile?.selectedPlan?.toLowerCase().includes('pro') ? 8 : 5;

      if (currentMode === 'video') {
        if (videoKind === 'ai-ugc') {
          if (videoResolution === '720p') {
            creditCost = currentCount * (videoDuration === 8 ? 80 : videoDuration === 12 ? 120 : 150);
          } else {
            creditCost = currentCount * (videoDuration === 8 ? 100 : videoDuration === 12 ? 140 : 170);
          }
        } else {
          if (videoResolution === '720p') {
            creditCost = currentCount * (videoDuration === 5 ? 50 : 80);
          } else {
            creditCost = currentCount * (videoDuration === 5 ? 70 : 100);
          }
        }
      } else if (currentMode === 'carousel') {
        creditCost = currentCount * slideCount * baseImageCost;
      } else if (currentMode === 'ecomm') {
        creditCost = ecommTotal * baseImageCost;
      } else if (currentMode === 'whatsapp' || currentMode === 'email') {
        creditCost = 0;  // campaigns are free
      } else if (currentMode === 'ads') {
        creditCost = currentCount * (profile?.selectedPlan?.toLowerCase().includes('pro') ? 10 : 8);
      } else {
        creditCost = currentCount * baseImageCost;  // image / festival
      }
      const creditReason = `${currentMode} generation (${currentMode === 'ecomm' ? ecommTotal
        : currentMode === 'carousel' ? `${currentCount} × ${slideCount} slides`
          : currentCount
        } items)`;
      // ─────────────────────────────────────────────────────────────────

      if (currentMode === 'whatsapp' || currentMode === 'email') {
        try {
          const token = localStorage.getItem('token');
          let data = null;

          if (currentMode === 'whatsapp') {
            // Find the template body
            let templateBody = WHATSAPP_TEMPLATE_BODIES[whatsappTemplateName] || '';
            const dynamicTemplate = whatsappTemplates.find((t: any) => t.name === whatsappTemplateName);
            if (dynamicTemplate && dynamicTemplate.components) {
              const bodyComponent = dynamicTemplate.components.find((c: any) => c.type === 'BODY');
              if (bodyComponent && bodyComponent.text) templateBody = bodyComponent.text;
            }

            console.log("🔥 WhatsApp Campaign Payload sent to backend:", { idea: finalIdea, templateBody, templateName: whatsappTemplateName });
            const mapRes = await fetch(`${NODE_BASE}/whatsapp/map-variables`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ idea: finalIdea, templateBody, templateName: whatsappTemplateName }),
            });

            if (!mapRes.ok) throw new Error('Failed to map WhatsApp variables');
            const mapData = await mapRes.json();
            setCampaignVariables(mapData.variables);
            
            // Set subject from variable 1, body from the filled text
            setCampaignSubject(mapData.variables?.['1'] || finalIdea);
            setCampaignBody(mapData.filledText || mapData.variables?.['2'] || finalIdea);
            
            // Format result like what the UI expects for social generation
            data = {
              status: 'success',
              posts: [{ caption: mapData.filledText || mapData.variables?.['2'] || finalIdea, image: refImages[0] || '' }]
            };
          } else {
            // Email uses python backend
            const startRes = await fetch(`${NODE_BASE}/ai/start-generation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ endpoint: 'generate-strategy-images', payload }),
            });

            if (!startRes.ok) throw new Error('Failed to start generation');
            const { jobId } = await startRes.json();

            while (true) {
              await new Promise(r => setTimeout(r, 5000));
              const pollRes = await fetch(`${NODE_BASE}/ai/job/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const job = await pollRes.json();

              if (job.status === 'success') {
                data = job.data;
                break;
              } else if (job.status === 'error') {
                throw new Error(job.error || 'Generation failed');
              }
            }
          }

          if (data && data.status === 'success' && data.posts && data.posts.length > 0) {
            setGenerated(data.posts);
            const first = data.posts[0];
            setCampaignImage(imgSrc(first.image) || '');
            if (currentMode === 'email') setCampaignSubject(first.subject || '');
            setCampaignBody(first.caption || '');
            setStage('results');
          } else {
            setGenError(data?.detail || 'Generation failed. Try again.');
            setStage('builder');
          }
        } catch (err: any) {
          console.error('[Strategy] Generation error:', err);
          setGenError(getFriendlyErrorMessage(err));
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
      setGenError(getFriendlyErrorMessage(err));
      setStage('builder');
    }
  };

  const resetToBuilder = () => {
    setStage('builder');
    setGenerated([]);
    setGenError(null);
    setSendStatus('idle');
    setCurrentDraftId(null);
    setSavedIndices(new Set());
    setShowHeartPop({});
    setAvatarDescription('');
    setVideoScript('');
  };

  // ── Heart — save to DB + localStorage cache
  const handleHeart = async (post: GeneratedPost, index: number, customStatus?: string) => {
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
        status: customStatus,
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
          setCreativeLibrary(cached);
        } catch (e) {
          console.error('[Strategy] IndexedDB save error:', e);
        }

        // No localStorage fallback needed anymore since we use robust IndexedDB above.
        // This prevents QuotaExceededError crashes when the app tries to save profiles later.
        return data.creative._id;
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

  const downloadSingleFile = async (srcUrl: string, filename: string) => {
    try {
      if (srcUrl.startsWith('http') || srcUrl.startsWith('/') || srcUrl.startsWith('blob:') || srcUrl.startsWith('data:')) {
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
      console.error('Failed to download single file:', err);
      const link = document.createElement('a');
      link.href = srcUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownload = async (post: GeneratedPost, index: number) => {
    if (post.type === 'carousel' && post.slides && post.slides.length > 0) {
      try {
        const zip = new JSZip();
        toast({
          title: "Preparing Download",
          description: `Packaging ${post.slides.length} slides into a ZIP...`,
        });

        for (let i = 0; i < post.slides.length; i++) {
          const slide = post.slides[i];
          const slideSrc = imgSrc(slide.image);
          const response = await fetch(slideSrc);
          const blobData = await response.blob();

          let extension = 'jpg';
          if (blobData.type === 'image/png') extension = 'png';
          else if (blobData.type === 'image/webp') extension = 'webp';
          else if (blobData.type === 'image/gif') extension = 'gif';

          zip.file(`slide_${i + 1}.${extension}`, blobData);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `${brandName || 'syncsocio'}_carousel_${index + 1}.zip`;
        const blobUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast({
          title: "Download Started",
          description: "Your carousel ZIP has been downloaded successfully.",
        });
      } catch (err) {
        console.error('Failed to generate ZIP for carousel:', err);
        toast({
          title: "Download Failed",
          description: "Could not create ZIP. Downloading the first slide instead.",
          variant: "destructive"
        });
        const firstSrc = imgSrc(post.slides[0].image);
        await downloadSingleFile(firstSrc, `${brandName || 'syncsocio'}_creative_${index + 1}_slide_1.jpg`);
      }
      return;
    }

    const isVideo = post.type === 'video';
    const displaySrc = isVideo ? (post.url || post.thumbnail) : (post.type === 'carousel' ? post.slides?.[0]?.image : post.image);
    if (!displaySrc) return;

    const srcUrl = isVideo && post.url ? post.url : imgSrc(displaySrc);
    const filename = `${brandName || 'syncsocio'}_creative_${index + 1}.${isVideo && post.url ? 'mp4' : 'jpg'}`;

    await downloadSingleFile(srcUrl, filename);
  };

  const isHeroImageSaved = React.useMemo(() => {
    if (!campaignImage) return false;
    const isEmail = mode === 'email';
    return creativeLibrary.some(creative => {
      if (creative.type !== 'image') return false;

      // Email drafts must only match draft status.
      // WhatsApp/other hero images must only match non-draft status.
      if (isEmail && creative.status !== 'draft') return false;
      if (!isEmail && creative.status === 'draft') return false;

      let creativeBody = creative.caption;
      if (creative.status === 'draft') {
        try {
          const parsed = JSON.parse(creative.caption);
          creativeBody = parsed.body || creativeBody;
        } catch (e) { }
      }

      let isBodyMatch = false;
      if (campaignBody && creativeBody) {
        const cleanBody = campaignBody.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanCreative = creativeBody.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        isBodyMatch = (cleanBody === cleanCreative);
      } else if (!campaignBody && !creativeBody) {
        isBodyMatch = true;
      }

      const isImageMatch = (creative.thumbnailBase64 === campaignImage);

      if (isEmail) {
        return isImageMatch && isBodyMatch;
      } else {
        return isImageMatch || isBodyMatch;
      }
    });
  }, [campaignImage, creativeLibrary, campaignBody, mode]);

  const handleSaveCampaignImage = async () => {
    if (!campaignImage) return;
    const isEmail = mode === 'email';

    const existingCreative = creativeLibrary.find(creative => {
      if (creative.type !== 'image') return false;

      if (isEmail && creative.status !== 'draft') return false;
      if (!isEmail && creative.status === 'draft') return false;

      let creativeBody = creative.caption;
      if (creative.status === 'draft') {
        try {
          const parsed = JSON.parse(creative.caption);
          creativeBody = parsed.body || creativeBody;
        } catch (e) { }
      }

      let isBodyMatch = false;
      if (campaignBody && creativeBody) {
        const cleanBody = campaignBody.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanCreative = creativeBody.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        isBodyMatch = (cleanBody === cleanCreative);
      } else if (!campaignBody && !creativeBody) {
        isBodyMatch = true;
      }

      const isImageMatch = (creative.thumbnailBase64 === campaignImage);

      if (isEmail) {
        return isImageMatch && isBodyMatch;
      } else {
        return isImageMatch || isBodyMatch;
      }
    });

    if (existingCreative) {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${NODE_BASE}/strategy-assets/${existingCreative._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const updatedLibrary = creativeLibrary.filter(c => c._id !== existingCreative._id);
          setCreativeLibrary(updatedLibrary);

          const cacheKey = `syncsocio_strategy_assets_${brandId}`;
          await setCache(cacheKey, updatedLibrary);

          if (currentDraftId === existingCreative._id) {
            setCurrentDraftId(null);
          }

          toast({
            title: mode === 'email' ? "Draft Removed" : "Campaign Image Removed",
            description: mode === 'email' ? "This email draft has been removed from your assets." : "This campaign image has been removed from your assets.",
          });
        } else {
          throw new Error('Failed to delete draft');
        }
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Failed to remove draft.",
          variant: "destructive"
        });
      }
      return;
    }

    if (currentDraftId && mode === 'email') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${NODE_BASE}/strategy-assets/${currentDraftId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const newLib = creativeLibrary.filter(c => c._id !== currentDraftId);
          setCreativeLibrary(newLib);
          const cacheKey = `syncsocio_strategy_assets_${brandId}`;
          await setCache(cacheKey, newLib);
        }
      } catch (err) {
        console.error('Failed to delete previous draft', err);
      }
    }

    const post: GeneratedPost = {
      type: 'image',
      image: campaignImage,
      caption: mode === 'email'
        ? JSON.stringify({ subject: campaignSubject, body: campaignBody })
        : campaignBody || `Campaign Creative: ${campaignSubject || idea || 'WhatsApp/Email Campaign'}`,
      sectionType: 'image'
    };

    const newDraftId = await handleHeart(post, 9999, mode === 'email' ? 'draft' : undefined);
    if (newDraftId && mode === 'email') {
      setCurrentDraftId(newDraftId);
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
                setStage('pick');
                setMode(null);
                navigate(window.location.pathname, { replace: true });
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
                : 'Run in background'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULTS — WhatsApp / Email campaign preview
  // ─────────────────────────────────────────────────────────────────────────────
  if (isRequestingTemplate) {
    const editDraftId = whatsappTemplateName.startsWith('draft_') ? whatsappTemplateName.split('_')[1] : null;
    const initialTpl = editDraftId ? requestedTemplates.find(t => t._id === editDraftId) : null;
    return <WhatsAppTemplates onBack={() => {
      setIsRequestingTemplate(false);
      setWhatsappTemplateName('custom_campaign_image');
    }} initialTemplate={initialTpl} onDraftSaved={(saved) => {
      // Refresh the requestedTemplates list so the new draft appears in dropdown immediately
      setRequestedTemplates(prev => {
        const exists = prev.find(t => t._id === saved._id);
        if (exists) {
          return prev.map(t => t._id === saved._id ? saved : t);
        }
        return [...prev, saved];
      });
    }} onDeleted={(deletedId) => {
      // Remove deleted template from dropdown immediately
      setRequestedTemplates(prev => prev.filter(t => t._id !== deletedId));
      setIsRequestingTemplate(false);
      setWhatsappTemplateName('custom_campaign_image');
    }} />;
  }

  if (stage === 'results' && (mode === 'whatsapp' || mode === 'email')) {
    return (
      <CampaignResults
        profile={profile}
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
        whatsappTemplateName={whatsappTemplateName}
        whatsappTemplates={whatsappTemplates}
        savedLists={savedLists}
        setSavedLists={setSavedLists}
        selectedListId={selectedListId}
        setSelectedListId={setSelectedListId}
        showListNameModal={showListNameModal}
        setShowListNameModal={setShowListNameModal}
        listNameInput={listNameInput}
        setListNameInput={setListNameInput}
        handleSaveImportedList={handleSaveImportedList}
        saveHeroImage={handleSaveCampaignImage}
        isHeroImageSaved={isHeroImageSaved}
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
          className="break-inside-avoid rounded-3xl overflow-hidden bg-card border border-border/50 shadow-md hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div
            onClick={() => handleImageClick(post, i, displaySrc || '')}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!savedIndices.has(i)) handleHeart(post, i);
            }}
            className="relative w-full overflow-hidden cursor-pointer select-none"
          >
            {(mode === 'video' || post.type === 'video') && post.url ? (
              <video
                src={`${post.url}#t=0.5`}
                preload="metadata"
                muted
                playsInline
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : displaySrc ? (
              <img
                src={displaySrc}
                alt=""
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full aspect-square bg-muted flex items-center justify-center">
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

            {/* Hover actions */}
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(post, i); }}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 hover:scale-105 transition flex items-center justify-center shadow-lg"
                title="Download"
              >
                <Download size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!savedIndices.has(i)) handleHeart(post, i);
                }}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 hover:scale-105 transition flex items-center justify-center shadow-lg"
                title={savedIndices.has(i) ? 'Saved' : 'Save'}
              >
                <Heart size={14} className={cn(savedIndices.has(i) && "fill-rose-500 text-rose-500")} />
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
      <div className="relative max-w-6xl mx-auto pt-8 px-6 pb-20">
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
                Double-click a creative to heart (save) and protect it across all platforms
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
                style={{ width: 'fit-content' }}
                className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[95vh] rounded-[2rem] overflow-hidden border border-border shadow-2xl relative bg-card flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top panel: Media */}
                <div className="relative flex items-center justify-center bg-transparent w-full">
                  {previewPost.type === 'video' && previewPost.url ? (
                    <video
                      src={previewPost.url}
                      controls
                      autoPlay
                      className="w-auto h-auto max-w-full max-h-[55vh] object-contain block"
                    />
                  ) : previewPost.type === 'carousel' && previewPost.slides && previewPost.slides.length > 0 ? (
                    <div className="relative flex flex-col items-center justify-center w-full">
                      <img
                        src={imgSrc(previewPost.slides[previewSlide]?.image)}
                        alt={`Slide ${previewSlide + 1}`}
                        className="w-auto h-auto max-w-full max-h-[55vh] object-contain block"
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
                      className="w-auto h-auto max-w-full max-h-[55vh] object-contain block"
                    />
                  )}
                </div>

                {/* Bottom panel: Caption & Hashtags */}
                <div className="w-0 min-w-full flex flex-col bg-card overflow-y-auto shrink-0 border-t border-border/50">
                  {!['ecomm', 'photoshoot', 'video'].includes(mode || '') && (
                    <>
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

                      <div className="flex-1 overflow-y-auto p-4 select-text custom-scrollbar max-h-[25vh]">
                        <p className="text-[11px] sm:text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {previewPost.caption || "No caption generated."}
                        </p>
                      </div>
                    </>
                  )}

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
                        {mode !== 'edit_media' && !(previewPost as any).isEdited && ['image', 'carousel', 'video', 'ecomm'].includes(previewPost.type || previewPost.sectionType || '') ? (
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

  const renderUpgradeModal = () => (
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
              {upgradeModalReason === 'expired'
                ? 'Plan Expired'
                : upgradeModalReason === 'ads'
                  ? 'AI Ad Creatives Locked 🔒'
                  : upgradeModalReason === 'video'
                    ? 'Video Generation Locked 🔒'
                    : upgradeModalReason === 'whatsapp'
                      ? 'WhatsApp Campaign Locked 🔒'
                      : upgradeModalReason === 'email'
                        ? 'Email Campaign Locked 🔒'
                        : 'Premium Feature Locked 🔒'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {upgradeModalReason === 'expired'
                ? 'Your SyncSocio plan has expired. Please renew your plan to continue using our AI strategy tools.'
                : upgradeModalReason === 'ads'
                  ? 'AI Ad Creatives (Director AI Engine) is included in Growth and Pro plans. Please upgrade your plan to unlock high-converting AI ad generation.'
                  : upgradeModalReason === 'video'
                    ? 'AI Video Generation (UGC & Product Videos) is included in Growth and Pro plans. Please upgrade your plan to unlock AI video generation.'
                    : upgradeModalReason === 'whatsapp'
                      ? 'WhatsApp Campaigns & Broadcasts are included in Growth and Pro plans. Please upgrade your plan to unlock WhatsApp campaigns.'
                      : upgradeModalReason === 'email'
                        ? 'Email Campaigns & Newsletters are included in Growth and Pro plans. Please upgrade your plan to unlock email campaigns.'
                        : `This feature is included in Growth and Pro plans. Upgrade your plan to unlock the ${STUDIOS.find(s => s.id === upgradeModalReason)?.title || 'premium'} feature.`}
            </p>

            <Button
              onClick={() => { setShowUpgradeModal(false); navigate('/dashboard/settings?tab=Plan%20%26%20Billing'); }}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg"
            >
              {upgradeModalReason === 'expired' ? 'Renew Plan' : 'Upgrade Plan'}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PICK (landing) — mode selection grid
  // ─────────────────────────────────────────────────────────────────────────────
  if (stage === 'pick') {
    return (
      <>
        <div className="relative min-h-screen bg-gradient-hero">
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />

          <div className="relative mx-auto max-w-6xl px-6 pt-8 pb-20">
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
                Pick a format — SyncSocio opens a tailored brief for it.
              </p>
            </motion.div>

            {/* Studio grid — 6-col so wide cards can span 3 */}
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6 md:auto-rows-[250px]">
              {sortedStudios.filter(s => {
                if (isSaasMode && (s.id === 'ecomm' || s.id === 'all_in_one' || s.id === 'ads')) return false;
                return true;
              }).map((s, i) => (
                <StudioCard key={s.id} s={s} i={i} onPick={handleModeClick} isLocked={checkLocked(s.id)} />
              ))}
            </div>
          </div>
        </div>
        {renderUpgradeModal()}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUILDER — per-mode form
  // ─────────────────────────────────────────────────────────────────────────────
  const isStandard = mode === 'image' || mode === 'carousel' || mode === 'video' || mode === 'photoshoot' || mode === 'ads';
  const standardCounts = (mode === 'image' || mode === 'photoshoot' || mode === 'ads') ? imageCounts : mode === 'carousel' ? carouselCounts : videoCounts;
  const currentMode = modes.find((m) => m.id === mode)!;

  return (
    <div className="max-w-4xl mx-auto pt-8 px-6 pb-20">
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
                    onClick={() => {
                      setVideoKind(v.id);
                      setVideoDuration(v.id === 'ai-ugc' ? 8 : 5);
                    }}
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

          {/* Video duration picker */}
          {mode === 'video' && (
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Video Duration
              </p>
              <div className="flex flex-wrap gap-3">
                {(videoKind === 'ai-ugc' ? [8, 12, 15] : [5, 8]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setVideoDuration(dur)}
                    className={cn(
                      'px-5 h-10 rounded-xl text-sm font-bold transition-all border flex items-center justify-center',
                      videoDuration === dur
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {dur} sec
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Video quality & resolution picker */}
          {mode === 'video' && (
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Video Resolution
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 720p Option */}
                <button
                  type="button"
                  onClick={() => setVideoResolution('720p')}
                  className={cn(
                    'p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between group',
                    videoResolution === '720p'
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-foreground tracking-tight">
                      720p HD
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-400/30 text-emerald-600 dark:text-emerald-400 shadow-sm">
                      <Sparkles size={11} className="text-emerald-500" />
                      <span>
                        {videoKind === 'ai-ugc'
                          ? (videoDuration === 8 ? 80 : videoDuration === 12 ? 120 : 150)
                          : (videoDuration === 5 ? 50 : 80)} Credits
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Standard HD quality. Faster generation time.
                  </p>
                </button>

                {/* 1080p Option */}
                <button
                  type="button"
                  onClick={() => setVideoResolution('1080p')}
                  className={cn(
                    'p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between group',
                    videoResolution === '1080p'
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground tracking-tight">
                        1080p Full HD
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                        Recommended
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-blue-500/10 border-violet-400/30 text-violet-600 dark:text-violet-400 shadow-sm">
                      <Sparkles size={11} className="text-violet-500" />
                      <span>
                        {videoKind === 'ai-ugc'
                          ? (videoDuration === 8 ? 100 : videoDuration === 12 ? 140 : 170)
                          : (videoDuration === 5 ? 70 : 100)} Credits
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Crisp Full HD output. Best for professional social media posts & ads.
                  </p>
                </button>
              </div>
            </section>
          )}

          {/* Count + Aspect */}
          {mode !== 'video' && (
            <section className="mb-6">
              <div className="p-5 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/30 space-y-5">
                {mode !== 'carousel' && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                      {mode === 'photoshoot' ? 'Images' : (mode === 'image' || mode === 'ads') ? 'Post count' : 'Videos'}
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
                )}

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

                {mode !== 'photoshoot' && (
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
                )}
              </div>
            </section>
          )}

          {mode !== 'photoshoot' && (mode !== 'video' || videoKind === 'ai-ugc') && (
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




          {/* ─── ADS MODE ─── */}
          {mode === 'ads' && (
            <section className="mb-6 space-y-6">
              <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-6 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-foreground">What should this campaign do?</h3>
                  <p className="text-[13px] text-muted-foreground mt-1 mb-5">Pick the job for Generic campaign. It shapes the creatives we build.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => setCampaignGoal('discover')}
                      className={cn(
                        'flex flex-col items-start text-left p-5 rounded-2xl border transition-all duration-200',
                        campaignGoal === 'discover'
                          ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-sm'
                          : 'border-border/60 bg-card hover:border-indigo-500/30 hover:bg-indigo-500/5'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                        <Target size={16} className="text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1.5">Brand Awareness</h4>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">Introduce your brand to net-new audiences.</p>
                    </button>

                    <button
                      onClick={() => setCampaignGoal('compare')}
                      className={cn(
                        'flex flex-col items-start text-left p-5 rounded-2xl border transition-all duration-200',
                        campaignGoal === 'compare'
                          ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-sm'
                          : 'border-border/60 bg-card hover:border-indigo-500/30 hover:bg-indigo-500/5'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                        <Scale size={16} className="text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1.5">Consideration & Trust</h4>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">Position yourself as the superior choice.</p>
                    </button>

                    <button
                      onClick={() => setCampaignGoal('purchases')}
                      className={cn(
                        'flex flex-col items-start text-left p-5 rounded-2xl border transition-all duration-200',
                        campaignGoal === 'purchases'
                          ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-sm'
                          : 'border-border/60 bg-card hover:border-indigo-500/30 hover:bg-indigo-500/5'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                        <Zap size={16} className="text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1.5">Direct Conversion</h4>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">Turn high-intent prospects into paying customers.</p>
                    </button>
                  </div>
                </div>
                
                <div className="pt-2">
                  <IdeaBox
                    idea={idea}
                    setIdea={setIdea}
                    placeholder="Any specific focus? (e.g. Highlight our new summer discount...)"
                    label="Additional Campaign Context (Optional)"
                  />
                </div>
              </div>
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
                  {p.imageBase64 || (p.imageUrls && p.imageUrls[0]) ? (
                    <img src={imgSrc(p.imageBase64 || p.imageUrls![0])} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" />
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
            mode !== 'photoshoot' && (
              <>
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

                {(mode === 'image' || mode === 'carousel') && (
                  <section className="mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Comment Keyword <span className="font-normal text-muted-foreground/60 normal-case">(optional DM automation)</span>
                    </p>
                    <Input
                      value={commentKeyword}
                      onChange={(e) => setCommentKeyword(e.target.value)}
                      placeholder="e.g. LINK, PRICE, or GUIDE"
                      className="rounded-2xl border-border/60 bg-card h-12 text-sm text-foreground focus-visible:ring-primary"
                    />
                  </section>
                )}
              </>
            )
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {profile?.location?.country?.toLowerCase() !== 'nepal' ? '2' : '1'} · Virtual Model (Avatar)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Clicked Custom Avatar!');
                  setShowAvatarModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border transition-all duration-200 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:scale-105"
              >
                <Plus size={12} />
                Custom Avatar
              </button>
            </div>
            {avatars.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
                {avatars.map((av) => (
                  <div
                    key={av._id}
                    onClick={() => setSelectedAvatarUrl(selectedAvatarUrl === av.imageUrl ? null : av.imageUrl)}
                    className={cn(
                      "relative shrink-0 w-24 h-24 rounded-2xl cursor-pointer overflow-hidden border-2 transition-all group",
                      selectedAvatarUrl === av.imageUrl ? "border-primary shadow-md shadow-primary/30 scale-105" : "border-transparent opacity-80 hover:opacity-100"
                    )}
                  >
                    <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAvatarUrl(av.imageUrl);
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Eye size={16} />
                    </button>

                    {selectedAvatarUrl === av.imageUrl && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow z-10">
                        <Check size={12} />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                      <p className="text-[9px] font-medium text-white truncate">{av.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No avatars available in the library yet.</p>
            )}
          </section>

          <AnimatePresence>
            {previewAvatarUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
                onClick={() => setPreviewAvatarUrl(null)}
              >
                <motion.img
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  src={previewAvatarUrl}
                  className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain cursor-default"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setPreviewAvatarUrl(null)}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-white hover:text-black transition-colors"
                >
                  <X size={24} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAvatarModal && (
              <motion.div
                key="avatar-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && !isGeneratingAvatar && setShowAvatarModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-5"
                >
                  <div>
                    <h3 className="text-base font-black text-foreground">Create Virtual Model ✨</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Describe your ideal model (age, ethnicity, hairstyle, vibe). A realistic AI avatar will be generated for your e-comm listings.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {['female', 'male'].map(g => (
                        <button
                          key={g}
                          onClick={() => setNewAvatarGender(g as any)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border",
                            newAvatarGender === g ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-transparent hover:bg-muted"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={newAvatarDesc}
                      onChange={(e) => setNewAvatarDesc(e.target.value)}
                      placeholder="e.g. 24-year-old Indian female, short wavy hair, sharp jawline, olive skin..."
                      className="rounded-xl border-border/80 bg-muted/20 h-24 text-sm font-semibold resize-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAvatarModal(false)}
                      disabled={isGeneratingAvatar}
                      className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateAvatar}
                      disabled={!newAvatarDesc.trim() || isGeneratingAvatar}
                      className="rounded-xl px-6 h-10 text-xs font-bold gap-2"
                    >
                      {isGeneratingAvatar ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      {isGeneratingAvatar ? 'Generating...' : 'Generate Avatar'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {profile?.location?.country?.toLowerCase() !== 'nepal' ? '3' : '2'} · Image count
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
                  {p.imageBase64 || (p.imageUrls && p.imageUrls[0]) ? <img src={imgSrc(p.imageBase64 || p.imageUrls![0])} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-2 text-center"><Package size={16} className="text-muted-foreground mb-1" /><span className="text-[9px] font-medium leading-tight text-foreground line-clamp-2">{p.name}</span></div>}
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
                  {p.imageBase64 || (p.imageUrls && p.imageUrls[0]) ? (
                    <img src={imgSrc(p.imageBase64 || p.imageUrls![0])} alt={p.name} className="w-full h-full object-cover p-1 rounded-xl" />
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

          {/* Language Selection */}
          <LanguagePicker
            language={language}
            setLanguage={setLanguage}
            country={profile?.location?.country}
            isAiUgc={false}
          />

          {/* Carousel Title / Creative Theme */}
          <section className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Carousel Title / Campaign Theme <span className="text-destructive">*</span>
            </p>
            <Input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. Summer Collection Launch, Pastel Colors, 20% discount"
              className="rounded-2xl border-border/60 bg-card h-12 text-sm text-foreground focus-visible:ring-primary"
            />
          </section>

          {/* Avatar Description */}
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

          {/* Video Script */}
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
                    <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>
            <Textarea
              value={videoScript}
              onChange={(e) => setVideoScript(e.target.value)}
              placeholder="Write or generate a short 8-second script for the avatar to speak..."
              className="min-h-[100px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed focus-visible:ring-primary"
            />
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
                    {selectedProducts[0].imageBase64 || (selectedProducts[0].imageUrls && selectedProducts[0].imageUrls[0]) ? (
                      <img
                        src={imgSrc(selectedProducts[0].imageBase64 || selectedProducts[0].imageUrls![0])}
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

          {mode === 'whatsapp' && (
            <section className="mb-6 mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                WhatsApp Template Settings
              </p>

              <div className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-bold block mb-1">Meta Billing Requirement</span>
                  Meta requires a valid Credit/Debit card on file in your WhatsApp Business Manager to send campaigns, even for free tiers. If no card is added, your messages will silently fail to deliver.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Call-to-Action Template</label>
                  <select
                    value={whatsappTemplateName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWhatsappTemplateName(val);
                      if (val === 'request_template' || val.startsWith('draft_')) {
                        setIsRequestingTemplate(true);
                      }
                    }}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="request_template" className="font-bold text-primary">+ Request a Template</option>

                    {requestedTemplates.length > 0 && (
                      <optgroup label="My Templates">
                        {requestedTemplates.map(t => (
                          <option key={t._id} value={t.status === 'DRAFT' ? `draft_${t._id}` : `custom_${t._id}`}>
                            {t.templateName} ({t.status.charAt(0) + t.status.slice(1).toLowerCase()})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Meta Approved Templates">
                      {whatsappTemplatesLoading ? (
                        <option disabled>Loading templates...</option>
                      ) : whatsappTemplates.length > 0 ? (
                        whatsappTemplates.map((t: any) => (
                          <option
                            key={t.name}
                            value={t.name}
                            disabled={t.status !== 'APPROVED'}
                          >
                            {TEMPLATE_DISPLAY_NAMES[t.name] || t.name.replace(/_/g, ' ').replace(/syncsocio v[23] /i, '')} {t.status !== 'APPROVED' ? `(${t.status})` : '✓'}
                          </option>
                        ))
                      ) : (
                        <option disabled>No templates found. Resync settings.</option>
                      )}
                    </optgroup>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">URL Suffix Parameter</label>
                  <input
                    type="text"
                    value={whatsappUrlParam}
                    onChange={(e) => setWhatsappUrlParam(e.target.value)}
                    placeholder="e.g. diwali-sale"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Appended to your website URL (e.g. yoursite.com/<b>{whatsappUrlParam || '...'}</b>)</p>
                </div>
              </div>
            </section>
          )}
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
                    {mode === 'ads'
                      ? 'Pick 1 product. SyncSocio will anchor every ad creative to it.'
                      : <>Pick up to {['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count)} product{(['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count)) > 1 ? 's' : ''}. SyncSocio will anchor generations to these.</>}
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
                    const disabled = !selected && selectedProducts.length >= (['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count));
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
                          {p.imageBase64 || (p.imageUrls && p.imageUrls[0]) ? (
                            <img src={imgSrc(p.imageBase64 || p.imageUrls![0])} alt={p.name} className="w-full h-full object-contain p-2" />
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
                  <span className={cn(selectedProducts.length === (['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count)) ? 'text-primary' : 'text-foreground')}>
                    {selectedProducts.length}
                  </span> / {['all_in_one', 'ecomm', 'ads', 'image', 'photoshoot'].includes(mode || '') || (mode === 'video' && videoKind === 'img2video') ? 1 : (mode === 'sprint' ? Math.max(1, Math.floor(count / 2)) : count)} selected
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
      {mode !== 'festival' && (() => {
        const isEmailMode = mode === 'email';
        const isEmailSetupDone = !isEmailMode || profile?.use_generic_email_sender === true || profile?.email_domain_verified === true;

        if (isEmailMode && !isEmailSetupDone) {
          return (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-3 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={15} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Email domain setup required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Before you can send campaigns, verify your sending domain or use SyncSocio Network so emails land in inboxes.
                  </p>
                </div>
              </div>
              <a
                href="/dashboard/settings?tab=Email Setup"
                className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 transition-all text-center animate-pulse"
              >
                Go to Settings → Email Setup
              </a>
            </div>
          );
        }

        return (
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
        );
      })()}

      {renderUpgradeModal()}
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
    if (country?.toLowerCase() === 'nepal') {
      availableLanguages = [{ id: 'english', label: 'English', flag: '🇬🇧' }];
    } else if (country?.toLowerCase() === 'india') {
      availableLanguages = languages.filter(l => l.id === 'english' || l.id === 'hindi');
    } else {
      availableLanguages = languages.filter(l => l.id === 'english');
    }
  } else {
    if (country?.toLowerCase() === 'nepal') {
      availableLanguages = languages.filter(l => l.id === 'english' || l.id === 'nepali');
    } else if (country?.toLowerCase() === 'india') {
      availableLanguages = languages.filter(l => l.id !== 'nepali');
    } else {
      // For all other new countries, strictly lock to English
      availableLanguages = languages.filter(l => l.id === 'english');
    }
  }

  return (
    <section className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Caption language</p>
      <div className="relative max-w-sm">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full appearance-none bg-card border border-border text-foreground text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
        >
          {availableLanguages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
          <ChevronDown size={14} />
        </div>
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
  isHeroImageSaved?: boolean;
  savedLists: any[];
  setSavedLists: React.Dispatch<React.SetStateAction<any[]>>;
  selectedListId: string;
  setSelectedListId: (v: string) => void;
  showListNameModal: boolean;
  setShowListNameModal: (v: boolean) => void;
  listNameInput: string;
  setListNameInput: (v: string) => void;
  handleSaveImportedList: () => Promise<void>;
  profile: any;
  whatsappTemplateName?: string;
  whatsappTemplates?: any[];
}

const WHATSAPP_BUTTON_LABELS: Record<string, string> = {
  syncsocio_v4_shop: "Shop Now",
  syncsocio_v4_offer: "Claim Offer",
  syncsocio_v4_visit: "Visit Website",
  syncsocio_v4_announce: "Learn More",
  syncsocio_promo_shop: "Shop Now",
  syncsocio_promo_claim: "Claim Offer",
  syncsocio_promo_visit: "Visit Website",
  syncsocio_promo_book: "Book Now",
  syncsocio_promo_order: "Order Now",
  syncsocio_promo_learn: "Learn More",
  syncsocio_promo_get: "Get It Free",
  syncsocio_festival: "Celebrate Now",
  syncsocio_promo_text: "View Details",
  syncsocio_order_confirmed_v2: "View Order",
  syncsocio_order_shipped_v2: "Track Order",
  syncsocio_payment_reminder_v2: "Pay Now",
  syncsocio_appointment_reminder_v3: "Confirm",
  syncsocio_interactive_poll: "Swish Now!",
};

// Professional display names for the template selector dropdown
const TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  syncsocio_v4_shop: 'Product Promotion — Shop Now',
  syncsocio_v4_offer: 'Exclusive Offer — Claim Offer',
  syncsocio_v4_visit: 'Brand Promotion — Visit Website',
  syncsocio_v4_announce: 'Announcement — Learn More',
  custom_campaign_image: 'Custom Image Campaign',
  custom_campaign_text: 'Custom Text Campaign',
};

// Real template body text — exactly what the recipient sees on their WhatsApp.
// v3 templates: {{1}}=headline, {{2}}-{{5}}=flexible content blocks
const WHATSAPP_TEMPLATE_BODIES: Record<string, string> = {
  // ── v3 Templates (New, Flexible, No Branding) ──
  syncsocio_v4_shop: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nTap the button below to shop now.',
  syncsocio_v4_offer: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nTap the button below to claim your offer.',
  syncsocio_v4_visit: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nWe look forward to seeing you.',
  syncsocio_v4_announce: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nThank you for your continued support.',
  // ── Legacy Templates (kept for backward compatibility) ──
  syncsocio_festival: '🎉 *{{1}}*\nThis festive season, we have something special for you:\n{{2}}\nOffer valid for a limited time.',
  syncsocio_promo_image: '🛍️ *{{1}}*\n{{2}}\nGrab it before it runs out.',
  syncsocio_promo_generic: '🔥 *{{1}}*\n{{2}}\nAct fast — limited availability.',
  syncsocio_promo_text: '💬 *{{1}}*\n{{2}}\nTap below to find out more.',
  syncsocio_promo_shop: '🛒 *{{1}}*\n{{2}}\nShop now before stocks run out.',
  syncsocio_promo_claim: '🎁 *{{1}}*\n{{2}}\nClaim it before it expires.',
  syncsocio_promo_visit: '📍 *{{1}}*\n{{2}}\nCome visit us — we would love to see you.',
  syncsocio_promo_book: '📅 *{{1}}*\n{{2}}\nSecure your spot now — slots are filling fast.',
  syncsocio_promo_order: '📦 *{{1}}*\n{{2}}\nThank you for shopping with us.',
  syncsocio_promo_learn: '📚 *{{1}}*\n{{2}}\nStart today and grow your skills.',
  syncsocio_promo_get: '⚡ *{{1}}*\n{{2}}\nDownload now — available for a limited time only.',
  syncsocio_promo_lead: '📋 *{{1}}*\n{{2}}\nFill the form and get your exclusive benefit.',
  syncsocio_interactive_poll: '🗳️ *{{1}}*\n{{2}}\nYour feedback helps us serve you better. Thank you!',
  custom_campaign_image: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nTap the button below for more details.',
  custom_campaign_text: 'Hello!\n\n*{{1}}*\n\n{{2}}\n\n{{3}}\n\nTap the link below for more details.',
};

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
  profile, mode, brandName, image, subject, setSubject, body, setBody,
  recipients, setRecipients, newRecipient, setNewRecipient, whatsappCountryCode, setWhatsappCountryCode, addRecipient,
  recipientsFileRef, handleRecipientsFile, sendStatus, sendCampaign, back, regenerate, saveHeroImage, isHeroImageSaved,
  savedLists, setSavedLists, selectedListId, setSelectedListId,
  showListNameModal, setShowListNameModal, listNameInput, setListNameInput, handleSaveImportedList,
  whatsappTemplateName,
  whatsappTemplates = [],
}) => {
  const isWA = mode === 'whatsapp';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { toast } = useToast();

  // ── Email Quota State ──────────────────────────────────────────────────────
  const [emailQuota, setEmailQuota] = useState<{ used: number; limit: number; remaining: number; resetAt: string } | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'email') return;
    const fetchQuota = async () => {
      setQuotaLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${NODE_BASE}/campaigns/email-quota`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmailQuota(data);
        }
      } catch (e) {
        console.error('[EmailQuota] Failed to fetch quota', e);
      } finally {
        setQuotaLoading(false);
      }
    };
    fetchQuota();
  }, [mode]);
  // ──────────────────────────────────────────────────────────────────────────

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

  // ── Quota bar helpers ──────────────────────────────────────────────────────
  const quotaPct = emailQuota && emailQuota.limit > 0 ? Math.min(100, Math.round((emailQuota.used / emailQuota.limit) * 100)) : 0;
  const quotaColor = quotaPct >= 100 ? '#ef4444' : quotaPct >= 80 ? '#f59e0b' : '#22c55e';
  const quotaLabel = emailQuota
    ? `${emailQuota.used.toLocaleString()} / ${emailQuota.limit.toLocaleString()} emails sent this month`
    : '';
  const quotaResetLabel = emailQuota
    ? `Resets ${new Date(emailQuota.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  const isQuotaFull = emailQuota ? emailQuota.remaining <= 0 : false;
  // ──────────────────────────────────────────────────────────────────────────

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
    <div className="max-w-6xl mx-auto pt-8 px-6 pb-20">
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
            <Button
              onClick={saveHeroImage}
              disabled={isHeroImageSaved}
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl gap-2 transition",
                isHeroImageSaved
                  ? "text-rose-500 border-rose-500/20 bg-rose-500/10 cursor-not-allowed"
                  : "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
              )}
            >
              <Heart size={14} className={cn(isHeroImageSaved && "fill-rose-500")} />
              {isHeroImageSaved
                ? (mode === 'email' ? 'Draft Saved' : 'Saved')
                : (mode === 'email' ? 'Save as Draft' : 'Save hero image')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PREVIEW */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Live preview</p>
          {isWA ? (
            /* WhatsApp iPhone Mockup */
            <div className="rounded-[40px] overflow-hidden border-[8px] border-[#1f2022] shadow-2xl max-w-[320px] mx-auto bg-[#e5ddd5] relative ring-1 ring-black/10">
              {/* iPhone Status Bar & Dynamic Island */}
              <div className="bg-white px-5 pt-3 pb-1 flex justify-between items-center text-[10px] font-semibold text-black relative z-10">
                <span>9:41</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[85px] h-[24px] bg-black rounded-full z-20"></div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 9V6H2.5V9H1ZM4 9V4.5H5.5V9H4ZM7 9V2.5H8.5V9H7ZM10 9V0H11.5V9H10Z" fill="black" />
                  </svg>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="1.5" width="14" height="7" rx="2" stroke="black" />
                    <rect x="2" y="3" width="11" height="4" rx="1" fill="black" />
                    <path d="M15.5 4C16.3284 4 17 4.67157 17 5.5C17 6.32843 16.3284 7 15.5 7V4Z" fill="black" />
                  </svg>
                </div>
              </div>

              {/* WhatsApp iOS Header */}
              <div className="bg-white text-black px-3 py-2 border-b border-gray-200 flex items-center gap-3">
                <ArrowLeft size={18} className="text-[#007AFF]" />
                <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-sm font-bold text-white">
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold leading-tight">{brandName}</p>
                  <p className="text-[11px] text-gray-500">online</p>
                </div>
                <Phone size={18} className="text-[#007AFF]" />
                <MoreHorizontal size={18} className="text-[#007AFF]" />
              </div>

              {/* Chat Body */}
              <div
                className="p-3 min-h-[550px] space-y-2 relative"
                style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
              >
                {/* Date Badge */}
                <div className="flex justify-center mb-4 mt-2">
                  <span className="bg-[#E4EAEB] text-gray-600 text-[10px] font-medium px-3 py-1 rounded-lg">
                    Today
                  </span>
                </div>

                {/* Left-Aligned Message Bubble */}
                <div className="mr-auto max-w-[85%] bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-black/5 flex flex-col">
                  {image && (
                    <img src={image} className="w-full object-cover aspect-[16/10]" />
                  )}
                  <div className="p-3.5 pb-2.5">
                    {/* Show the REAL template text with variables filled in */}
                    {(() => {
                      let tplBody = WHATSAPP_TEMPLATE_BODIES[whatsappTemplateName || ''];
                      let buttonLabel = WHATSAPP_BUTTON_LABELS[whatsappTemplateName || ''] || `${brandName.toLowerCase()} now`;

                      // Use dynamic template data if available
                      const dynamicTemplate = whatsappTemplates.find((t: any) => t.name === whatsappTemplateName);
                      if (dynamicTemplate && dynamicTemplate.components) {
                        const bodyComponent = dynamicTemplate.components.find((c: any) => c.type === 'BODY');
                        if (bodyComponent && bodyComponent.text) {
                          tplBody = bodyComponent.text;
                        }
                        const buttonComponent = dynamicTemplate.components.find((c: any) => c.type === 'BUTTONS');
                        if (buttonComponent && buttonComponent.buttons && buttonComponent.buttons.length > 0) {
                          buttonLabel = buttonComponent.buttons[0].text;
                        }
                      }

                      // The backend already perfectly maps all variables into `body` (which is mapData.filledText)
                      let filled = body || `${subject}\n\n${body}`;
                      // Clean up empty lines from unused variables
                      filled = filled.replace(/\n{3,}/g, '\n\n').trim();
                      // Render bold *text* as <strong>
                      const parts = filled.split(/(\*[^*]+\*)/g);
                      return (
                        <>
                          <pre className="text-[12px] text-[#111111] whitespace-pre-wrap font-sans leading-relaxed mb-2.5">
                            {parts.map((part: string, i: number) =>
                              part.startsWith('*') && part.endsWith('*')
                                ? <strong key={i}>{part.slice(1, -1)}</strong>
                                : part
                            )}
                          </pre>
                          <p className="text-[10px] text-gray-400 font-medium">
                            T&C apply. Reply STOP to unsubscribe.
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-400">
                            {time}
                          </div>
                          <a
                            href="#"
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-t border-gray-100 text-[12px] font-bold text-[#007AFF] hover:bg-gray-50 active:bg-gray-100 transition-colors w-full"
                            onClick={(e) => e.preventDefault()}
                          >
                            <ExternalLink size={12} className="text-[#007AFF]" />
                            <span>{buttonLabel}</span>
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* iOS WhatsApp Input Bar */}
                <div className="bg-[#F6F6F6] px-3 py-2 flex items-center gap-2 border-t border-gray-200">
                  <Smile size={20} className="text-gray-500" />
                  <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-[13px] text-gray-400 flex items-center justify-between">
                    <span>Message</span>
                    <div className="flex items-center gap-2">
                      <Paperclip size={16} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white shrink-0">
                    <Mic size={15} />
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="bg-[#F6F6F6] pb-2 pt-1 flex justify-center">
                  <div className="w-1/3 h-1 bg-black rounded-full opacity-80"></div>
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

          {/* Email Quota Bar + Send button */}
          {(() => {
            const isEmailMode = mode === 'email';

            return (
              <>
                {/* ─── Email Quota Usage Bar ─── */}
                {isEmailMode && (
                  <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                        <span>📧</span> Monthly Email Usage
                      </span>
                      {quotaLoading ? (
                        <span className="text-[11px] text-muted-foreground animate-pulse">Loading…</span>
                      ) : emailQuota ? (
                        <span className="text-[11px] font-mono" style={{ color: quotaColor }}>
                          {emailQuota.remaining.toLocaleString()} remaining
                        </span>
                      ) : null}
                    </div>

                    {/* Progress bar */}
                    {emailQuota && (
                      <>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${quotaPct}%`, backgroundColor: quotaColor }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{quotaLabel}</span>
                          <span className="text-[10px] text-muted-foreground/70">{quotaResetLabel}</span>
                        </div>
                        {isQuotaFull && (
                          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
                            <span className="text-red-400 text-sm">🚫</span>
                            <p className="text-[11px] text-red-400 font-medium">
                              Monthly limit reached. Upgrade your plan or wait for next month's reset.
                            </p>
                          </div>
                        )}
                        {!isQuotaFull && recipients.length > 0 && recipients.length > (emailQuota?.remaining ?? Infinity) && (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                            <span className="text-amber-400 text-sm">⚠️</span>
                            <p className="text-[11px] text-amber-400 font-medium">
                              You have {emailQuota?.remaining} emails left but selected {recipients.length} recipients. Reduce your list to proceed.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isEmailMode && (profile?.use_generic_email_sender ? 'creatives@syncsocio.com' : profile?.email_from) && (
                  <p className="text-center text-[11px] text-muted-foreground font-medium">
                    📨 Sending from: <span className="font-mono text-foreground">{profile.use_generic_email_sender ? 'creatives@syncsocio.com' : profile.email_from}</span>
                  </p>
                )}
                <Button
                  onClick={sendCampaign}
                  disabled={!recipients.length || sendStatus !== 'idle' || isQuotaFull || (isEmailMode && emailQuota != null && recipients.length > emailQuota.remaining)}
                  size="lg"
                  className={cn(
                    'w-full h-12 rounded-2xl font-bold gap-2',
                    isQuotaFull && isEmailMode
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : sendStatus === 'sent'
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
                  ) : isQuotaFull && isEmailMode ? (
                    <>🚫 Monthly limit reached</>
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
