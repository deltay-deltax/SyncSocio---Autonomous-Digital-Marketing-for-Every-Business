import { useState, useEffect, useRef, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker } from "react-colorful";
import { RefreshCw, Trash2, Pause, Globe, MapPin, Target, Users, Megaphone, Palette, Layers, CheckCircle2, Zap, Clock, ShieldCheck, FileText, ExternalLink, Sparkles, Languages, Building2, AtSign, Heart, Type, Hash, Check, X, Camera, TrendingUp, Mail, AlertTriangle, Copy, CheckCheck, ArrowRight, Shield, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkout } from '@/components/Checkout';
import { useOutletContext, Link, useLocation, useNavigate } from 'react-router-dom';

import { useRazorpay } from '../../hooks/useRazorpay';
import { getFriendlyErrorMessage } from '@/lib/errorHandler';

const InstagramIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);



const WhatsAppIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.004 2c-5.518 0-10 4.482-10 10 0 1.767.46 3.427 1.263 4.887L2 22l5.286-1.39A9.957 9.957 0 0 0 12.004 22c5.518 0 10-4.482 10-10s-4.482-10-10-10zm0 1.636c4.613 0 8.364 3.75 8.364 8.364 0 4.613-3.75 8.364-8.364 8.364a8.315 8.315 0 0 1-4.267-1.17l-.307-.183-3.167.832.846-3.087-.202-.32a8.32 8.32 0 0 1-1.269-4.436c0-4.613 3.75-8.364 8.364-8.364zm-3.52 3.393c-.198 0-.523.074-.796.371-.272.296-1.042 1.018-1.042 2.48 0 1.463 1.066 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.626.713.226 1.36.194 1.872.118.572-.085 1.603-.656 1.83-1.262.228-.605.228-1.123.16-1.233-.07-.11-.25-.181-.522-.317-.272-.136-1.61-.795-1.859-.885-.25-.09-.431-.136-.613.136-.182.273-.703.885-.862 1.068-.16.182-.318.204-.59.068-.272-.136-1.15-.424-2.19-1.353-.809-.722-1.355-1.616-1.514-1.888-.159-.272-.017-.42.12-.556.121-.122.27-.318.407-.477.136-.159.18-.273.272-.455.09-.182.045-.34-.023-.477-.07-.136-.613-1.477-.84-2.023-.223-.534-.488-.46-.67-.47l-.57-.01z" />
  </svg>
);

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const settingsTabs = ['Brand Profile', 'Connected Accounts', 'Email Setup', 'Posting Preferences', 'Plan & Billing', 'Legal & Privacy', 'Danger Zone'];

const industries = [
  'Baby & Kids',
  'Food & Beverage',
  'Home & Living',
  'Education & Training',
  'Real Estate & Property',
  'Travel & Hospitality',
  'Mobile Apps',
  'IT & Technical Tools',
  'Gaming & Entertainment',
  'Fashion & Apparel',
  'Jewellery',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Coaching & Consulting',
  'Architecture',
  'Financial Services',
  'Newsletters',
  'Online Marketplaces',
  'Digital Products',
  'E-Commerce',
  'Services',
  'SaaS & Digital',
  'Other'
];
const voiceTones = [
  'Warm & Friendly',
  'Professional & Clean',
  'Fun & Energetic',
  'Inspirational',
  'Luxury & Premium'
];
const typographyOptions = ['Sans Serif Modern', 'Serif Classic', 'Display Bold', 'Handwritten', 'Mono Tech'];
const growthGoals = [
  'Grow followers',
  'Sell products / get orders',
  'Build brand awareness',
  'Get leads / enquiries'
];
const ageRanges = ['18-24', '25-34', '35-44', '45+'];
const genders = ['All', 'Male', 'Female'];
const visualVibes = ['Minimalist', 'Vibrant', 'Luxury', 'Edgy'];

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | string[] }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/10 border border-border/30 hover:bg-muted/20 transition-all group">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
      <Icon size={18} className="text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {Array.isArray(value) ? value.join(', ') : (value || '—')}
      </p>
    </div>
  </div>
);

const DashboardSettings = () => {
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; title?: string; onConfirm: () => void } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title: string; type: 'success' | 'error' | 'info'; onClose?: () => void } | null>(null);

  const { profile, setProfile, setShowNotifications } = useOutletContext<{
    profile: any;
    setProfile: (p: any) => void;
    setShowNotifications?: (show: boolean) => void;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') || params.get('error')) {
      return 'Connected Accounts';
    }
    return 'Brand Profile';
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const razorpayLoaded = useRazorpay();

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
      }
    } catch (err) {
      console.error('Failed to fetch brands list:', err);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (activeTab === 'Plan & Billing') {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem('token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const res = await fetch(`${apiBase}/payment/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setPaymentHistory(data.transactions || []);
          }
        } catch (err) {
          console.error('Failed to fetch payment history', err);
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  const handleSwitchBrand = async (brandId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ brandId })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('syncsocio_profile', JSON.stringify(data.activeBrand));
        setProfile(data.activeBrand);

        toast({
          title: "Switched Brand",
          description: `Successfully switched context to ${data.activeBrand.brandName}.`,
        });

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to switch brand:', err);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && settingsTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);


  const [updating, setUpdating] = useState(false);
  const [rescraping, setRescraping] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const { toast } = useToast();

  const handlePlanAction = async (actionType: 'renew' | 'upgrade', currentPlan: string) => {
    let amount = 0;
    let planStr = '';
    let creditsAdded = 0;
    let typeStr = '';

    const isElite = currentPlan.toLowerCase().includes('elite');

    if (actionType === 'renew') {
       amount = isElite ? 3199 : 999;
       planStr = currentPlan;
       creditsAdded = isElite ? 700 : 200;
       typeStr = 'plan_renewal';
    } else if (actionType === 'upgrade') {
      amount = 3199; // Full Elite Plan price
      planStr = 'Elite';
      creditsAdded = 700; // Full Elite Plan credits
      typeStr = 'plan_upgrade';
    }

    setCheckoutData({
      baseAmount: amount,
      description: actionType === 'renew' ? `Renew ${planStr} Plan` : 'Upgrade to Elite Plan',
      type: typeStr,
      planName: planStr,
      creditsAdded: creditsAdded
    });
  };

  const handleRescrape = async () => {
    if (!formData.website.trim()) {
      setAlertModal({ isOpen: true, message: 'Please enter a website URL to rescrape.', title: 'Missing URL', type: 'error' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      message: `This will scrape ${formData.website} for new details and import newer products. Do you want to proceed?`,
      title: 'Scrape Website',
      onConfirm: executeRescrape
    });
  };

  const executeRescrape = async () => {
    setConfirmModal(null);
    setRescraping(true);
    try {
      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const token = localStorage.getItem('token');

      // 1. Scrape the website
      const scrapeRes = await fetch(`${AGENT_API_URL}/scrape-brand-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.website })
      });

      if (!scrapeRes.ok) {
        const errData = await scrapeRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Website scraping failed.');
      }

      const scraped = await scrapeRes.json();

      // 2. Prepare the updated profile payload
      let comps = scraped.competitors || [];
      while (comps.length < 2) {
        comps.push('');
      }

      const updatedFormData = {
        ...formData,
        brandName: scraped.brandName || formData.brandName,
        website: scraped.website || formData.website,
        businessCategory: scraped.businessCategory || formData.businessCategory,
        city: scraped.location?.city || formData.city,
        country: scraped.location?.country || formData.country,
        brandTone: scraped.brandTone || formData.brandTone,
        usp: scraped.usp || formData.usp,
        mainGoal: scraped.mainGoal || formData.mainGoal,
        competitors: comps.slice(0, 2).join(', '),
        targetAudiences: Array.isArray(scraped.targetAudiences) ? scraped.targetAudiences.join(', ') : formData.targetAudiences,
        painPoint: scraped.painPoint || formData.painPoint,
        primaryColor: scraped.primaryColor || formData.primaryColor,
        secondaryColor: scraped.secondaryColor || formData.secondaryColor,
        logo: scraped.logo || formData.logo,
        typography: scraped.typography || formData.typography,
        brandKeywords: Array.isArray(scraped.brandKeywords) ? scraped.brandKeywords.join(', ') : (scraped.brandKeywords || (Array.isArray(scraped.keywords) ? scraped.keywords.join(', ') : (scraped.keywords || formData.brandKeywords)))
      };

      // 3.5. Delete existing products before saving new ones
      await fetch(`${apiBase}/products`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 4. Save newly scraped products sequentially, respecting plan limits
      let scrapedProducts = scraped.products || [];
      const p = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
      const planName = (p.userPlan || p.selectedPlan || '').toLowerCase();
      const productLimit = planName.includes('elite') ? 100 : 50;
      
      if (scrapedProducts.length > productLimit) {
        scrapedProducts = scrapedProducts.slice(0, productLimit);
      }

      if (scrapedProducts.length > 0) {
        for (const prod of scrapedProducts) {
          try {
            await fetch(`${apiBase}/products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: prod.name,
                description: prod.description || '',
                price: prod.price || '',
                offerPrice: prod.offerPrice || '',
                keyBenefit: prod.keyBenefit || '',
                imageBase64: prod.imageBase64 || ''
              })
            });
          } catch (prodErr) {
            console.error('Failed to save scraped product:', prodErr);
          }
        }
      }

      // 5. Update local cache for products
      localStorage.removeItem('syncsocio_products');
      const uId = profile?.user || profile?._id || 'default';
      localStorage.removeItem(`syncsocio_products_${uId}`);
      try {
        const req = indexedDB.open('SyncSocioProductCache', 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('products')) {
            db.createObjectStore('products');
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('products')) {
            const tx = db.transaction('products', 'readwrite');
            tx.objectStore('products').delete(`syncsocio_products_${uId}`);
          }
        };
      } catch (e) {
        console.warn('Failed to clear IDB product cache:', e);
      }

      // 6. Save the updated profile to the DB
      const profilePayload = {
        ...updatedFormData,
        location: { city: updatedFormData.city, country: updatedFormData.country },
        competitors: updatedFormData.competitors.split(',').map((s: string) => s.trim()).filter(Boolean),
        targetAudiences: updatedFormData.targetAudiences.split(',').map((s: string) => s.trim()).filter(Boolean)
      };

      const profileRes = await fetch(`${apiBase}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profilePayload)
      });

      if (!profileRes.ok) throw new Error('Failed to save brand profile');
      const updatedProfile = await profileRes.json();

      // 7. Update UI state and local storage
      // Build a clean local profile from scraped data so the UI reflects new info immediately,
      // without depending on the DB round-trip response shape.
      const localProfile = {
        ...(updatedProfile || {}),
        brandName: updatedFormData.brandName,
        businessCategory: updatedFormData.businessCategory,
        website: updatedFormData.website,
        location: { city: updatedFormData.city, country: updatedFormData.country },
        brandTone: updatedFormData.brandTone,
        usp: updatedFormData.usp,
        mainGoal: updatedFormData.mainGoal,
        competitors: updatedFormData.competitors.split(',').map((s: string) => s.trim()).filter(Boolean),
        targetAudiences: updatedFormData.targetAudiences.split(',').map((s: string) => s.trim()).filter(Boolean),
        painPoint: updatedFormData.painPoint,
        primaryColor: updatedFormData.primaryColor,
        secondaryColor: updatedFormData.secondaryColor,
        logo: updatedFormData.logo,
        typography: updatedFormData.typography,
        ageRange: updatedFormData.ageRange,
        genderFocus: updatedFormData.genderFocus,
        brandKeywords: updatedFormData.brandKeywords,
        visualVibe: updatedFormData.visualVibe,
      };

      setFormData(updatedFormData);
      setProfile(localProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(localProfile));

      // Also sync keywords pill state
      const kwList = updatedFormData.brandKeywords
        ? updatedFormData.brandKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
        : [];
      setKeywords(kwList);

      toast({
        title: '✅ Rescrape complete!',
        description: `Brand profile updated · ${scrapedProducts.length} product(s) reloaded.`,
      });
    } catch (err: any) {
      toast({ title: 'Rescrape failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setRescraping(false);
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    brandName: profile?.brandName || '',
    businessCategory: profile?.businessCategory || '',
    otherCategory: profile?.otherCategory || '',
    website: profile?.website || '',
    city: profile?.location?.city || '',
    country: profile?.location?.country || '',
    brandTone: profile?.brandTone || '',
    usp: profile?.usp || '',
    mainGoal: profile?.mainGoal || '',
    competitors: profile?.competitors?.join(', ') || '',
    targetAudiences: Array.isArray(profile?.targetAudiences) ? profile.targetAudiences.join(', ') : profile?.targetAudiences || '',
    painPoint: profile?.painPoint || '',
    primaryColor: profile?.primaryColor || '#2563EB',
    secondaryColor: profile?.secondaryColor || '#60A5FA',
    logo: profile?.logo || '',
    typography: profile?.typography || '',
    ageRange: profile?.ageRange || '',
    genderFocus: profile?.genderFocus || '',
    brandKeywords: profile?.brandKeywords || '',
    visualVibe: profile?.visualVibe || ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        brandName: profile.brandName || '',
        businessCategory: profile.businessCategory || '',
        otherCategory: profile.otherCategory || '',
        website: profile.website || '',
        city: profile.location?.city || '',
        country: profile.location?.country || '',
        brandTone: profile.brandTone || '',
        usp: profile.usp || '',
        mainGoal: profile.mainGoal || '',
        competitors: profile.competitors?.join(', ') || '',
        targetAudiences: Array.isArray(profile.targetAudiences) ? profile.targetAudiences.join(', ') : profile.targetAudiences || '',
        painPoint: profile.painPoint || '',
        primaryColor: profile.primaryColor || '#2563EB',
        secondaryColor: profile.secondaryColor || '#60A5FA',
        logo: profile.logo || '',
        typography: profile.typography || '',
        ageRange: profile.ageRange || '',
        genderFocus: profile.genderFocus || '',
        brandKeywords: profile.brandKeywords || '',
        visualVibe: profile.visualVibe || ''
      });

      const kwList = profile.brandKeywords ? profile.brandKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
      setKeywords(kwList);
    }
  }, [profile]);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField('logo', reader.result as string);
    reader.readAsDataURL(file);
  };

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (!k || keywords.includes(k)) return;
    const newKeywords = [...keywords, k];
    setKeywords(newKeywords);
    updateField('brandKeywords', newKeywords.join(', '));
    setKeywordInput('');
  };

  const removeKeyword = (k: string) => {
    const newKeywords = keywords.filter(x => x !== k);
    setKeywords(newKeywords);
    updateField('brandKeywords', newKeywords.join(', '));
  };

  // Load Google Fonts stylesheet dynamically for live typography rendering
  useEffect(() => {
    if (formData.typography) {
      const primaryFont = formData.typography.split(',')[0].trim().replace(/['"]/g, '');
      if (primaryFont) {
        const linkId = `google-font-${primaryFont.toLowerCase().replace(/\s+/g, '-')}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(primaryFont)}:wght@400;700&display=swap`;
          document.head.appendChild(link);
        }
      }
    }
  }, [formData.typography]);

  const completeness = (() => {
    const fields = [
      formData.brandName, formData.city, formData.country, formData.businessCategory,
      formData.brandTone, formData.website, formData.typography, formData.logo,
      formData.usp, formData.mainGoal, formData.competitors,
      formData.targetAudiences, formData.painPoint, formData.ageRange, formData.genderFocus
    ];
    const filled = fields.filter(Boolean).length + (formData.brandKeywords ? 1 : 0);
    return Math.round((filled / (fields.length + 1)) * 100);
  })();

  if (!profile) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

      const payload = {
        ...formData,
        location: { city: formData.city, country: formData.country },
        competitors: formData.competitors.split(',').map((s: string) => s.trim()).filter(Boolean),
        targetAudiences: formData.targetAudiences.split(',').map((s: string) => s.trim()).filter(Boolean)
      };

      const res = await fetch(`${apiBase}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Update failed');
      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
      setAlertModal({
        isOpen: true,
        title: 'Brand Identity',
        message: 'Brand Identity updated successfully! The AI Agent has been notified.',
        type: 'success',
        onClose: () => window.location.reload()
      });
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: 'Error: ' + getFriendlyErrorMessage(err), title: 'Update Failed', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (checkoutData) {
    return (
      <div className="p-8">
        <Checkout
          baseAmount={checkoutData.baseAmount}
          description={checkoutData.description}
          type={checkoutData.type}
          planName={checkoutData.planName}
          creditsAdded={checkoutData.creditsAdded}
          onSuccess={() => {
             toast({ title: 'Success!', description: `Successfully processed your plan.` });
             setTimeout(() => window.location.reload(), 1500);
          }}
          onBack={() => setCheckoutData(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Settings</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sub nav */}
        <div className="lg:w-48 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {settingsTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-xs font-medium px-3 py-2.5 rounded-xl text-left whitespace-nowrap transition-colors',
                activeTab === tab ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === 'Brand Profile' && (
            <div className="space-y-5">
              {/* Brand Selector dropdown */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[2rem] border border-border/50 bg-card shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Active Brand Profile</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Select a brand to manage its creatives, products, settings, and campaigns.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={profile._id}
                    onChange={(e) => handleSwitchBrand(e.target.value)}
                    className="h-10 rounded-xl px-4 text-xs font-semibold border border-border/60 bg-background hover:border-primary transition-all cursor-pointer outline-none min-w-[180px]"
                  >
                    {brands.map((b) => (
                      <option key={b._id} value={b._id} disabled={b.isLocked}>
                        {b.brandName || 'Untitled Brand'} (@{b.instagramUsername || b.socialHandle || 'no-handle'}){b.isLocked ? ' 🔒 (Locked)' : ''}
                      </option>
                    ))}
                  </select>

                  {((() => {
                    const hasAgency = brands.some(b => (b.selectedPlan || '').toLowerCase().includes('agency'));
                    const hasElite = brands.some(b => (b.selectedPlan || '').toLowerCase().includes('elite'));
                    const maxBrands = hasAgency ? 8 : hasElite ? 2 : 1;
                    return brands.length < maxBrands;
                  })()) && (
                      <button
                        onClick={() => navigate('/onboarding?new_brand=true')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer text-base font-bold"
                        title="Add a new brand profile"
                      >
                        +
                      </button>
                    )}
                </div>
              </div>
              {/* Hero header */}
              <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/10 via-background to-purple-500/5 p-6 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-3xl -z-0" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group">
                    <div
                      className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-background flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors relative"
                      onClick={() => fileRef.current?.click()}
                    >
                      {formData.logo ? (
                        <img src={formData.logo} alt="Brand Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Camera size={22} className="text-muted-foreground group-hover:text-primary" />
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleLogo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Identity</p>
                    <h3 className="text-xl font-bold text-foreground truncate">{formData.brandName || 'Untitled Brand'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formData.businessCategory || 'Industry not set'} · {formData.city || 'City'}, {formData.country || 'Country'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 min-w-[140px]">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Profile</span>
                      <span className="text-xs font-bold text-primary ml-auto">{completeness}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completeness}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{completeness === 100 ? 'Fully tuned 🔥' : 'Complete it for sharper outputs'}</p>
                  </div>
                </div>
              </div>

              {/* Identity */}
              <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Building2 size={14} className="text-primary" /> Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Brand Name" required>
                    <Input value={formData.brandName} onChange={e => updateField('brandName', e.target.value)} placeholder="The Crumb Story" className="text-sm" />
                  </Field>
                  <Field label="Website URL" icon={<Globe size={11} />}>
                    <div className="flex gap-2">
                      <Input value={formData.website} onChange={e => updateField('website', e.target.value)} placeholder="https://..." className="text-sm flex-1" />
                      <Button
                        type="button"
                        onClick={handleRescrape}
                        disabled={rescraping || !formData.website}
                        className="h-10 rounded-xl px-5 bg-primary text-primary-foreground text-xs font-bold gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/10 shrink-0"
                      >
                        {rescraping ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} className="animate-pulse" />
                        )}
                        {rescraping ? 'Rescraping...' : 'Rescrape'}
                      </Button>
                    </div>
                  </Field>
                  <Field label="City" icon={<MapPin size={11} />}>
                    <Input value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="Mumbai" className="text-sm" />
                  </Field>
                  <Field label="Country">
                    <select
                      value={formData.country}
                      onChange={e => updateField('country', e.target.value)}
                      className="h-10 w-full rounded-xl px-4 text-xs font-semibold border border-border/60 bg-background hover:border-primary transition-all cursor-pointer outline-none"
                    >
                      <option value="India">India</option>
                      <option value="Nepal">Nepal</option>
                      <option value="International">International</option>
                    </select>
                  </Field>
                  <Field label="Industry" className="md:col-span-2">
                    <ChipGroup options={industries} value={formData.businessCategory} onChange={v => {
                      updateField('businessCategory', v);
                      if (v !== 'Other') updateField('otherCategory', '');
                    }} />
                    {formData.businessCategory === 'Other' && (
                      <div className="mt-4">
                        <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1 block">Custom Category</Label>
                        <Input value={formData.otherCategory} onChange={e => updateField('otherCategory', e.target.value)} placeholder="e.g. Pet Care, Logistics..." className="text-sm" />
                      </div>
                    )}
                  </Field>
                </CardContent>
              </Card>

              {/* Visual identity */}
              <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Palette size={14} className="text-primary" /> Visual Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Color">
                      <ColorPicker value={formData.primaryColor} onChange={v => updateField('primaryColor', v)} />
                    </Field>
                    <Field label="Secondary Color">
                      <ColorPicker value={formData.secondaryColor} onChange={v => updateField('secondaryColor', v)} />
                    </Field>
                  </div>
                  <div
                    className="h-14 rounded-xl border border-border flex items-center justify-center text-white text-xs font-bold tracking-wider"
                    style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                  >
                    LIVE BRAND GRADIENT PREVIEW
                  </div>
                  <Field label="Typography" icon={<Type size={11} />}>
                    <ChipGroup options={typographyOptions} value={formData.typography} onChange={v => updateField('typography', v)} />
                  </Field>
                  <Field label="Visual Vibe" icon={<Palette size={11} />}>
                    <ChipGroup options={visualVibes} value={formData.visualVibe} onChange={v => updateField('visualVibe', v)} />
                  </Field>
                </CardContent>
              </Card>

              {/* Voice & Positioning */}
              <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Megaphone size={14} className="text-primary" /> Voice & Positioning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Brand Voice / Tone" icon={<Languages size={11} />}>
                    <ChipGroup options={voiceTones} value={formData.brandTone} onChange={v => updateField('brandTone', v)} />
                  </Field>
                  <Field label="Unique Selling Point" icon={<Sparkles size={11} />}>
                    <Textarea value={formData.usp} onChange={e => updateField('usp', e.target.value)} placeholder="What makes you the only choice?" className="text-sm min-h-[70px]" />
                  </Field>
                  <Field label="Main Growth Goal" icon={<TrendingUp size={11} />}>
                    <ChipGroup options={growthGoals} value={formData.mainGoal} onChange={v => updateField('mainGoal', v)} />
                  </Field>
                  <Field label="Competitor Handles" icon={<AtSign size={11} />}>
                    <Input value={formData.competitors} onChange={e => updateField('competitors', e.target.value)} placeholder="@brand1, @brand2, @brand3" className="text-sm" />
                  </Field>
                </CardContent>
              </Card>

              {/* Audience */}
              <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Users size={14} className="text-primary" /> Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Who are they?" icon={<Target size={11} />}>
                    <Textarea value={formData.targetAudiences} onChange={e => updateField('targetAudiences', e.target.value)} placeholder="Urban millennials chasing premium-but-affordable experiences..." className="text-sm min-h-[70px]" />
                  </Field>
                  <Field label="Pain point you solve" icon={<Heart size={11} />}>
                    <Textarea value={formData.painPoint} onChange={e => updateField('painPoint', e.target.value)} placeholder="They struggle with..." className="text-sm min-h-[70px]" />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Age">
                      <ChipGroup options={ageRanges} value={formData.ageRange} onChange={v => updateField('ageRange', v)} small />
                    </Field>
                    <Field label="Gender">
                      <ChipGroup options={genders} value={formData.genderFocus} onChange={v => updateField('genderFocus', v)} small />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords */}
              <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Hash size={14} className="text-primary" /> Brand Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      placeholder="Type a keyword and press Enter"
                      className="text-sm"
                    />
                    <Button type="button" onClick={addKeyword} variant="outline" size="sm" className="text-xs shrink-0">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {keywords.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">No keywords yet — add a few to anchor your agent.</p>
                    )}
                    {keywords.map(k => (
                      <Badge key={k} variant="secondary" className="text-[11px] gap-1 pl-2 pr-1 py-0.5">
                        {k}
                        <button onClick={() => removeKeyword(k)} className="hover:bg-background/50 rounded p-0.5">
                          <X size={10} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Spacer to prevent content overlap */}
              <div className="h-28" />

              {/* Fixed save */}
              <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background/95 backdrop-blur-xl px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Ready to retrain your agent?</p>
                    <p className="text-[10px] text-muted-foreground truncate">Changes apply to all future generations</p>
                  </div>
                </div>
                <Button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="bg-primary text-primary-foreground border-0 text-xs shrink-0 font-black uppercase tracking-widest h-10 px-4 sm:px-5 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <Check size={12} className="mr-1" /> {updating ? 'Updating...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'Connected Accounts' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Connected Accounts</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Manage external social media platform connections.</p>
              </CardHeader>
              <CardContent className="p-8 space-y-5">
                <div className="space-y-4">
                  {/* Instagram Connection */}
                  {profile.instagramIsConnected ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                        <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
                          style={{
                            background: profile.instagramProfilePicture ? 'none' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)'
                          }}>
                          {profile.instagramProfilePicture ? (
                            <img src={profile.instagramProfilePicture} className="w-full h-full object-cover" />
                          ) : (
                            <InstagramIcon size={28} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-black text-foreground truncate">@{profile.instagramUsername}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">Active Connection</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto shrink-0 text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
                        onClick={async () => {
                          console.log('🔄 Relink Instagram clicked. Fetching auth URL...');
                          try {
                            const token = localStorage.getItem('token');
                            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
                            const res = await fetch(`${apiBase}/auth/instagram/auth?relink=true`, {
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await res.json();
                            console.log('🚀 Auth Response:', data);
                            if (data.url) {
                              console.log('➡️ Redirecting to:', data.url);
                              window.location.href = data.url;
                            } else {
                              console.error('❌ No URL returned in auth response');
                            }
                          } catch (err) {
                            console.error('❌ Failed to get auth URL:', err);
                          }
                        }}
                      >
                        <RefreshCw size={14} className="mr-2 shrink-0" /> Reconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-muted/10 border border-dashed border-border/70 hover:bg-muted/20 transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                        <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden bg-muted-foreground/10">
                          <InstagramIcon size={28} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-black text-foreground truncate">Instagram Business Account</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">Not Connected</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto shrink-0 gradient-bg text-white text-[10px] h-10 rounded-xl font-black uppercase tracking-widest px-6"
                        onClick={() => window.location.href = '/setup'}
                      >
                        Connect
                      </Button>
                    </div>
                  )}


                  {/* WhatsApp Business Connection */}
                  <WhatsAppConnectionCard profile={profile} setProfile={setProfile} />
              </div>
            </CardContent>
            </Card>
          )}

        {activeTab === 'Posting Preferences' && (
          <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600">Posting Preferences</CardTitle>
              <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-emerald-500/10 rounded-full w-fit">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider italic">Synchronized from Onboarding</span>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <InfoItem icon={Clock} label="Posting Frequency" value={profile.postingFrequency || 'Daily'} />
                <InfoItem icon={Layers} label="Content Formats" value={profile.contentTypes || []} />
                <InfoItem icon={Globe} label="Target Platforms" value={profile.socialPlatforms || ['Instagram', 'Facebook']} />
                <InfoItem icon={Target} label="Primary Call-to-Action" value={profile.primaryCTA || 'Visit Link'} />
              </div>

              <div className="p-5 rounded-2xl bg-muted/20 border border-border/40 mt-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Topic Constraints</p>
                <p className="text-sm font-bold text-foreground opacity-60">
                  {profile.painPoint ? `Addressing: ${profile.painPoint}` : 'No specific constraints set.'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-muted/30 border border-emerald-500/20 text-emerald-700/60 text-[11px] font-medium leading-relaxed italic">
                Note: These settings are locked based on your initial agent training. To modify your posting DNA, please contact support for a profile reset.
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'Plan & Billing' && (
          <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Membership Status</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 ml-1">Payment History</p>
                {paymentHistory.length === 0 && (
                   <p className="text-xs text-muted-foreground ml-1">No transactions found.</p>
                )}
                {paymentHistory.map((tx: any) => (
                  <div key={tx._id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                        {tx.status === 'completed' ? <CheckCircle2 size={18} /> : <X size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground">{tx.type === 'topup' ? 'Credit Top-up' : tx.type === 'plan_upgrade' ? 'Plan Upgrade' : tx.plan ? `${tx.plan} Plan` : 'Payment'}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {tx.status} • {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="block text-xs font-black text-foreground">₹{tx.amount}</span>
                       {tx.creditsAdded > 0 && (
                         <span className={cn(
                           "block text-[10px] font-bold",
                           tx.status === 'completed' ? "text-emerald-600" : 
                           tx.status === 'failed' ? "text-red-500/70 line-through" : 
                           "text-muted-foreground"
                         )}>
                           +{tx.creditsAdded} credits
                         </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              {(() => {
                const plan = (profile.userPlan || profile.selectedPlan || '').toLowerCase();
                const isAgency = plan.includes('agency');
                const isElite = plan.includes('elite');
                
                const planName = isAgency ? 'Agency' : isElite ? 'Elite' : 'Starter';
                const planPrice = isAgency ? '₹13333/month' : isElite ? '₹3199/month' : '₹999/month';
                const planCredits = isAgency ? '2,000 credits/month' : isElite ? '700 credits/month' : '200 credits/month';
                const planFeatures = isAgency
                  ? [
                      '2,000 credits/month',
                      'HD quality images',
                      '10,000 email campaigns/month',
                      '8 active brand profiles',
                      'Import or Add Up to 500 Products',
                      'All-in-One Drop feature',
                      'UGC & Product video generation',
                      'Dedicated Account Manager',
                      'Unlimited post scheduling',
                      'Analytics dashboard',
                      'Highest Priority generation',
                      '24/7 Priority support'
                    ]
                  : isElite
                  ? [
                      '700 credits/month',
                      'HD quality images',
                      '2,000 email campaigns/month',
                      '2 active brand profiles',
                      'Import or Add Up to 100 Products',
                      'UGC & Product video generation',
                      'All-in-One Drop feature',
                      'Festival calendar & suggestions',
                      'Caption & hashtag generation',
                      'Unlimited post scheduling',
                      'Reels + Video + UGC support',
                      'DM automation & lead capture',
                      'Best time to post analysis',
                      'Analytics dashboard',
                      'Priority 24/7 support'
                    ]
                  : [
                      '200 credits/month',
                      'Soft copy images',
                      '500 email campaigns/month',
                      '1 active brand profile',
                      'Import or Add Up to 50 Products',
                      'All image generation types',
                      'Festival calendar',
                      'Hinglish + 13 languages',
                      'Caption & hashtag generation',
                      'Schedule up to 30 posts/month',
                      'Analytics dashboard',
                      'Email support'
                    ];

                return (
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white relative overflow-hidden shadow-xl shadow-primary/20">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none">
                      <Zap size={120} fill="currentColor" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2 opacity-70">Active Strategy Plan</p>
                    <h3 className="text-3xl font-black tracking-tighter mb-4">SyncSocio {planName}</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="px-4 py-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                        <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Status</p>
                        <p className="text-xs font-black">ACTIVE</p>
                      </div>
                      <div className="px-4 py-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                        <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Price</p>
                        <p className="text-xs font-black">{planPrice}</p>
                      </div>
                      <div className="px-4 py-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                        <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Credits</p>
                        <p className="text-xs font-black">{planCredits}</p>
                      </div>
                      <div className="px-4 py-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                        <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Next Bill</p>
                        <p className="text-xs font-black">
                          {profile.userPlanExpiresAt 
                            ? new Date(profile.userPlanExpiresAt).toLocaleDateString() 
                            : profile.createdAt 
                              ? new Date(new Date(profile.createdAt).setDate(new Date(profile.createdAt).getDate() + 30)).toLocaleDateString()
                              : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-2.5 tracking-wider">Plan Features & DNA</p>
                      <ul className="grid sm:grid-cols-2 gap-2 text-xs font-semibold opacity-90">
                        {planFeatures.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const plan = (profile.userPlan || profile.selectedPlan || '').toLowerCase();
                const isElite = plan.includes('elite');
                const isAgency = plan.includes('agency');

                let expiryTime = 0;
                if (profile.userPlanExpiresAt) {
                  expiryTime = new Date(profile.userPlanExpiresAt).getTime();
                } else if (profile.createdAt) {
                  const created = new Date(profile.createdAt);
                  created.setDate(created.getDate() + 30);
                  expiryTime = created.getTime();
                }

                const diff = expiryTime - new Date().getTime();
                const oneDay = 24 * 60 * 60 * 1000;
                const canRenew = expiryTime === 0 || diff <= oneDay;

                if (!isElite && !isAgency) {
                  return (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <div className="flex justify-between items-center ml-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subscription Actions</p>
                        {!canRenew && (
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                            Renew available 1 day before expiry
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handlePlanAction('renew', profile.userPlan || profile.selectedPlan || 'Starter')} 
                          disabled={!canRenew}
                          className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground border-0 cursor-pointer shadow-lg hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                        >
                          Renew Plan (₹999)
                        </Button>
                        <Button 
                          onClick={() => handlePlanAction('upgrade', 'Starter')} 
                          className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white border-0 cursor-pointer shadow-lg hover:bg-emerald-500"
                        >
                          Upgrade to Elite (₹3199)
                        </Button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <div className="flex justify-between items-center ml-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subscription Actions</p>
                        {!canRenew && (
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                            Renew available 1 day before expiry
                          </span>
                        )}
                      </div>
                      <Button 
                        onClick={() => handlePlanAction('renew', profile.userPlan || profile.selectedPlan || (isAgency ? 'Agency' : 'Elite'))} 
                        disabled={!canRenew}
                        className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground border-0 cursor-pointer shadow-lg hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Renew {isAgency ? 'Agency' : 'Elite'} Plan ({isAgency ? '₹7999' : '₹3199'})
                      </Button>
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        )}

        {activeTab === 'Legal & Privacy' && (
          <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Legal & Privacy</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Review legal terms and data practices before using automations.</p>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  to="/terms"
                  state={{ from: 'settings' }}
                  className="block rounded-2xl border border-border/50 bg-muted/10 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">Terms of Use</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Service scope, rights, responsibilities, limits.</p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground" />
                  </div>
                </Link>

                <Link
                  to="/privacy"
                  state={{ from: 'settings' }}
                  className="block rounded-2xl border border-border/50 bg-muted/10 p-5 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">Privacy Policy</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Data collection, usage, retention, and rights.</p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliance Note</p>
                <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                  Automation features such as Instagram comment triggers, story mention replies, and DM responses rely on connected Meta permissions and platform policies.
                  Review these documents before enabling campaigns for production use.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'Danger Zone' && (
          <Card className="rounded-[2rem] border-destructive/20 overflow-hidden shadow-sm">
            <CardHeader className="p-8 pb-2"><CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-4">

              <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/[0.02] space-y-3">
                <div className="flex items-center gap-3">
                  <Trash2 size={18} className="text-destructive" />
                  <p className="text-sm font-black text-foreground">Terminate Account</p>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">Permanently erase your digital entity, synthesis weights, and all associated analytics. This action cannot be reversed.</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-destructive/20"
                  onClick={async () => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'CRITICAL ACTION',
                      message: 'This will permanently delete your account, your brand identity, and ALL metrics. This cannot be undone. Are you absolutely sure?',
                      onConfirm: async () => {
                        setConfirmModal(null);
                        try {
                          const token = localStorage.getItem('token');
                          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
                          const res = await fetch(`${apiBase}/profile/terminate`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            localStorage.clear();
                            window.location.href = '/';
                          } else {
                            setAlertModal({ isOpen: true, title: 'Termination Failed', message: 'Failed to terminate account. Please try again.', type: 'error' });
                          }
                        } catch (err) {
                          console.error("Termination failed:", err);
                        }
                      }
                    });
                  }}
                >
                  Erase My Entity
                </Button>
              </div>

              <div className="p-6 rounded-2xl border border-border space-y-3 group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <RefreshCw size={18} className="text-muted-foreground" />
                  <p className="text-sm font-black text-foreground">Sign Out</p>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                  Safely log out of your current session. You will need to re-authenticate to access Mission Control.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl border-border text-foreground hover:bg-black hover:text-white hover:border-black transition-colors"
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('syncsocio_profile');
                    localStorage.removeItem('syncsocio_setup_done');
                    window.location.href = '/login';
                  }}
                >
                  Secure Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── EMAIL SETUP TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Email Setup' && (
          <EmailSetupWizard profile={profile} setProfile={setProfile} />
        )}

      </div>
    </div>

    <AnimatePresence>
      {confirmModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmModal(null)}
            className="fixed inset-0 bg-background/40 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md bg-card border border-border/60 rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden"
          >
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10 text-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {confirmModal.title || 'Are you sure?'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest font-black">Confirmation Required</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-foreground leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-muted/30 flex gap-3 justify-end border-t border-border/40">
              <Button variant="outline" onClick={() => setConfirmModal(null)} className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-wider">Cancel</Button>
              <Button onClick={confirmModal.onConfirm} className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground">Proceed</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {alertModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (alertModal.onClose) alertModal.onClose();
              setAlertModal(null);
            }}
            className="fixed inset-0 bg-background/40 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md bg-card border border-border/60 rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden"
          >
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center",
                  alertModal.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {alertModal.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {alertModal.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest font-black">System Notification</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-foreground leading-relaxed">{alertModal.message}</p>
            </div>
            <div className="p-4 bg-muted/30 flex justify-end border-t border-border/40">
              <Button 
                onClick={() => {
                  if (alertModal.onClose) alertModal.onClose();
                  setAlertModal(null);
                }}
                className={cn(
                  "rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-wider text-white",
                  alertModal.type === 'success' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                Okay
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    </div >
  );
};

// \u2500\u2500 EmailSetupWizard Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const PERSONAL_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','yahoo.in','rediffmail.com','icloud.com','live.com','msn.com','aol.com'];

const EmailSetupWizard = ({ profile, setProfile }: { profile: any, setProfile?: (p: any) => void }) => {
  const { toast } = useToast();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fromEmail, setFromEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const [hasSelectedSender, setHasSelectedSender] = useState(profile?.has_selected_email_sender || false);
  const [useGeneric, setUseGeneric] = useState(profile?.use_generic_email_sender || false);

  useEffect(() => {
    if (profile) {
      setHasSelectedSender(profile.has_selected_email_sender || false);
      setUseGeneric(profile.use_generic_email_sender || false);
    }
  }, [profile]);

  const handleToggleGeneric = async (val: boolean) => {
    setUseGeneric(val);
    setHasSelectedSender(true);
    const updatedProfile = { ...profile, use_generic_email_sender: val, has_selected_email_sender: true };
    if (setProfile) {
      setProfile(updatedProfile);
    }
    localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
    const token = localStorage.getItem('token');
    try {
      await fetch(`${apiBase}/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ use_generic_email_sender: val, has_selected_email_sender: true })
      });
      toast({ title: 'Preferences saved', description: val ? 'Now sending via SyncSocio network' : 'Switched to custom domain mode' });
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiBase}/campaigns/email-setup/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.step) setStep(data.step);
          if (data.email_from) setFromEmail(data.email_from);
          if (data.domain) setDomain(data.domain);
          if (data.dns_records) setDnsRecords(data.dns_records);
          if (data.verified_at) setVerifiedAt(data.verified_at);
        }
      } catch (err) {
        console.error('Email setup status fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  // Auto-poll every 2 minutes when on Step 2
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiBase}/campaigns/email-setup/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.step >= 3 && data.verified) {
            setStep(3);
            if (data.verified_at) setVerifiedAt(data.verified_at);
            const updatedProfile = { ...profile, email_domain_verified: true, email_verified_at: data.verified_at || new Date().toISOString(), email_setup_step: 3 };
            if (setProfile) {
              setProfile(updatedProfile);
            }
            localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
            clearInterval(interval);
          }
          if (data.dns_records) setDnsRecords(data.dns_records);
        }
      } catch {}
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [step, profile, setProfile]);

  const handleStart = async () => {
    const emailDomain = fromEmail.split('@')[1]?.toLowerCase() || '';
    if (PERSONAL_DOMAINS.includes(emailDomain)) {
      toast({ title: 'Personal email not supported', description: 'Please use a business email like hello@yourbrand.com', variant: 'destructive' });
      return;
    }
    if (!fromEmail.includes('@') || !emailDomain.includes('.')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/campaigns/email-setup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ from_email: fromEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start setup');
      setDomain(data.domain);
      setDnsRecords(data.dns_records || []);
      setStep(2);
      toast({ title: '✅ DNS records generated!', description: 'Add these 3 records to your domain registrar.' });
    } catch (err: any) {
      toast({ title: 'Setup failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/campaigns/email-setup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      if (data.verified) {
        setStep(3);
        setVerifiedAt(new Date().toISOString());
        const updatedProfile = { ...profile, email_domain_verified: true, email_verified_at: new Date().toISOString(), email_setup_step: 3 };
        if (setProfile) {
          setProfile(updatedProfile);
        }
        localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
        toast({ title: '🎉 Domain verified!', description: `Campaigns will now send from ${fromEmail}` });
      } else {
        if (data.updated_dns) setDnsRecords(formatDnsDisplay(data.updated_dns));
        toast({
          title: 'Not verified yet',
          description: data.message || 'DNS records not detected. This can take up to 48 hours.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({ title: 'Verification failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const formatDnsDisplay = (raw: any) => {
    if (!raw) return [];
    const purposes = ['Mail server routing', 'Email authentication (DKIM 1)', 'Email authentication (DKIM 2)'];
    return ['mail_cname','dkim1','dkim2'].map((key, i) => ({
      type: 'CNAME',
      host: raw[key]?.host || '',
      value: raw[key]?.data || '',
      valid: raw[key]?.valid || false,
      purpose: purposes[i]
    }));
  };

  const copyRow = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRow(id);
      setTimeout(() => setCopiedRow(null), 2000);
    });
  };

  const copyAllCsv = () => {
    const csv = ['Type,Host,Value,Purpose', ...dnsRecords.map(r =>
      `${r.type},"${r.host}","${r.value}","${r.purpose}"`
    )].join('\n');
    navigator.clipboard.writeText(csv);
    toast({ title: 'Copied!', description: 'All DNS records copied as CSV.' });
  };

  const REGISTRAR_LINKS = [
    { name: 'GoDaddy', url: 'https://dcc.godaddy.com/manage' },
    { name: 'Namecheap', url: 'https://ap.www.namecheap.com/domains/list/' },
    { name: 'Cloudflare', url: 'https://dash.cloudflare.com/' },
    { name: 'Other ↗', url: 'https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication' },
  ];

  const stepLabels = ['Enter Email', 'Add DNS Records', 'Verified'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-blue-500/10 via-background to-indigo-500/5 p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-3xl -z-0" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Email Sender Setup</h3>
              <p className="text-xs text-muted-foreground">Send campaigns from your own domain</p>
            </div>
          </div>

          {/* Step progress */}
          {!useGeneric && (
            <div className="flex items-center gap-2 mt-4">
              {stepLabels.map((label, i) => {
                const sNum = i + 1;
                const isActive = step === sNum;
                const isDone = step > sNum;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all',
                      isDone ? 'bg-emerald-500/15 text-emerald-600' :
                      isActive ? 'bg-primary/15 text-primary' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isDone ? <CheckCheck size={12} /> : <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />}
                      {label}
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div className={cn('h-px w-6 rounded-full', step > sNum ? 'bg-emerald-400' : 'bg-border')} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sender Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button onClick={() => handleToggleGeneric(true)} className={`flex-1 p-5 rounded-[2rem] border transition-all text-left ${hasSelectedSender && useGeneric ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg' : 'border-border/50 bg-background hover:bg-muted/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasSelectedSender && useGeneric ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className={`text-sm font-black ${hasSelectedSender && useGeneric ? 'text-primary' : 'text-foreground'}`}>SyncSocio Network</h4>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">EASY & FAST</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">Send campaigns instantly from creatives@syncsocio.com. No DNS setup required.</p>
        </button>

        <button onClick={() => handleToggleGeneric(false)} className={`flex-1 p-5 rounded-[2rem] border transition-all text-left ${hasSelectedSender && !useGeneric ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg' : 'border-border/50 bg-background hover:bg-muted/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasSelectedSender && !useGeneric ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Globe size={18} />
            </div>
            <div>
              <h4 className={`text-sm font-black ${hasSelectedSender && !useGeneric ? 'text-primary' : 'text-foreground'}`}>Custom Domain</h4>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">PROFESSIONAL</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">Send campaigns from your own domain for full white-labeling and high deliverability.</p>
        </button>
      </div>


      {/* ─── STEP 1 ─────────────────────────────────────── */}
      {hasSelectedSender && !useGeneric && (
      <>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Inbox size={14} className="text-primary" /> Your Sending Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter the email address you want to send campaigns from. This must be a business email — your domain will be authenticated with SendGrid so emails land in inboxes, not spam.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Sending Email Address
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={e => setFromEmail(e.target.value.toLowerCase())}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                    placeholder="hello@yourbrand.com"
                    className="w-full h-11 rounded-xl border border-border/60 bg-background px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Warning banner */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Gmail and personal emails not supported</p>
                    <p className="text-[11px] text-amber-600/80 mt-0.5">
                      Use a business email like <span className="font-mono">hello@yourbrand.com</span>. 
                      Get one free at <a href="https://www.zoho.com/mail/" target="_blank" rel="noreferrer" className="underline">zoho.com/mail</a> or 
                      Google Workspace from ₹125/month.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={submitting || !fromEmail}
                  className={cn(
                    'w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] shadow-md shadow-primary/20',
                    (submitting || !fromEmail) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up...</>
                  ) : (
                    <>Continue <ArrowRight size={16} /></>
                  )}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* \u2500\u2500\u2500 STEP 2 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Shield size={14} className="text-primary" /> Add DNS Records
                  </CardTitle>
                  <button onClick={copyAllCsv} className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition">
                    <Copy size={11} /> Copy all as CSV
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Add these <strong>3 CNAME records</strong> to your domain registrar for{' '}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{domain}</code>:
                  </p>
                </div>

                {/* DNS Records Table */}
                <div className="rounded-2xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-4 py-2.5 border-b border-border/40">
                    <span>Type</span>
                    <span>Host</span>
                    <span>Value</span>
                    <span className="text-right">Status</span>
                  </div>
                  {dnsRecords.map((record: any, i: number) => (
                    <div key={i} className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 px-4 py-3 border-b border-border/30 last:border-b-0 items-center hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{record.type}</span>
                      </div>
                      
                      {/* Host with Copy */}
                      <div className="min-w-0 pr-2 group/host flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <code className="text-[11px] font-mono text-foreground/80 break-all leading-tight block">{record.host || '—'}</code>
                          <span className="text-[9px] text-muted-foreground/60">{record.purpose}</span>
                        </div>
                        <button
                          onClick={() => copyRow(record.host, `host-${i}`)}
                          className="w-6 h-6 rounded-lg hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition opacity-0 group-hover/host:opacity-100 shrink-0"
                          title="Copy Host"
                        >
                          {copiedRow === `host-${i}` ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                      
                      {/* Value with Copy */}
                      <div className="min-w-0 pr-2 group/val flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <code className="text-[11px] font-mono text-foreground/80 break-all leading-tight block">{record.value || '—'}</code>
                        </div>
                        <button
                          onClick={() => copyRow(record.value, `val-${i}`)}
                          className="w-6 h-6 rounded-lg hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition opacity-0 group-hover/val:opacity-100 shrink-0"
                          title="Copy Value"
                        >
                          {copiedRow === `val-${i}` ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                      
                      {/* Status */}
                      <div className="flex justify-end items-center pr-1">
                        {record.valid
                          ? <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center"><CheckCircle2 size={12} className="text-emerald-500" /></div>
                          : <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400" title="Pending verification" />
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status legend */}
                <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Verified</span>
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400" /> Pending</span>
                </div>

                {/* Registrar links */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Where to add these?</p>
                  <div className="flex flex-wrap gap-2">
                    {REGISTRAR_LINKS.map(r => (
                      <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-1">
                        {r.name} <ExternalLink size={10} className="opacity-50" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className={cn(
                      'w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                      'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] shadow-md shadow-primary/20',
                      verifying && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {verifying ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking records...</>
                    ) : (
                      <><CheckCircle2 size={16} /> I've added them — Verify now</>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    ⏱ Checking automatically every 10 min in background · DNS can take up to 48 hours
                  </p>
                  <button
                    onClick={() => { setStep(1); setDnsRecords([]); }}
                    className="w-full text-[11px] font-semibold text-muted-foreground hover:text-foreground transition text-center"
                  >
                    ← Change sending email
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* \u2500\u2500\u2500 STEP 3 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="rounded-[2rem] border-emerald-500/20 overflow-hidden shadow-sm">
              <CardContent className="p-8 space-y-6">
                {/* Success hero */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-foreground">Email domain verified!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your campaigns will now send from:</p>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
                    <Mail size={14} className="text-primary" />
                    <code className="text-sm font-bold text-primary font-mono">{fromEmail}</code>
                  </div>
                  {verifiedAt && (
                    <p className="text-[11px] text-muted-foreground/60 mt-2">
                      Verified {new Date(verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Status badges */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: CheckCircle2, label: 'Deliverability', value: 'Professional', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                    { icon: Shield, label: 'Spam protection', value: 'Active — DKIM + CNAME', color: 'text-blue-600', bg: 'bg-blue-500/10' },
                    { icon: Zap, label: 'DKIM signing', value: 'Enabled', color: 'text-violet-600', bg: 'bg-violet-500/10' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/10 border border-border/30">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.bg)}>
                        <item.icon size={16} className={item.color} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />
                    </div>
                  ))}
                </div>

                <a
                  href="/dashboard/strategy?mode=email"
                  className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] shadow-md shadow-primary/20 transition-all"
                >
                  Start sending campaigns <ArrowRight size={16} />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default DashboardSettings;

const Field = ({ label, icon, required, className, children }: { label: string; icon?: React.ReactNode; required?: boolean; className?: string; children: React.ReactNode }) => (
  <div className={cn('space-y-1.5', className)}>
    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {icon}
      {label}
      {required && <span className="text-primary">*</span>}
    </Label>
    {children}
  </div>
);

const ChipGroup = ({ options, value, onChange, small }: { options: string[]; value: string; onChange: (v: string) => void; small?: boolean }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={cn(
          'rounded-full border transition-all',
          small ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5',
          value === opt
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

// ── Professional Color Picker — centered modal, portal-rendered, never clipped ──
const getContrastColor = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? '#0f172a' : '#ffffff';
};

const ColorPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);        // uncommitted color while modal is open
  const [hexInput, setHexInput] = useState(value);  // raw hex string for the text field
  const textColor = getContrastColor(draft);

  // Sync draft ↔ external value when modal opens / value changes externally
  useEffect(() => {
    if (!isOpen) {
      setDraft(value);
      setHexInput(value);
    }
  }, [value, isOpen]);

  const handlePickerChange = (color: string) => {
    setDraft(color);
    setHexInput(color);
  };

  const commitHex = (raw: string) => {
    const v = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      setDraft(v);
      setHexInput(v);
    } else {
      setHexInput(draft); // reset to last valid
    }
  };

  const handleApply = () => {
    onChange(draft);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setHexInput(value);
    setIsOpen(false);
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, value]);

  return (
    <>
      {/* ── Trigger row — entire area is clickable ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-input bg-background px-3 py-2.5 hover:border-primary/50 hover:bg-muted/30 transition-all group cursor-pointer"
      >
        {/* Color swatch */}
        <span
          className="w-9 h-9 rounded-lg border-2 border-white/20 shadow-md shrink-0 ring-1 ring-border transition-transform group-hover:scale-105"
          style={{ backgroundColor: value }}
        />
        {/* Hex value */}
        <span className="flex-1 text-left text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
          {value}
        </span>
        {/* Edit icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {/* ── Modal — portal-rendered at body, always centered ── */}
      {isOpen && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'grid', placeItems: 'center',
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div
            className="relative rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
            style={{ width: '300px', animation: 'colorPickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* Header — live color preview */}
            <div
              className="h-16 w-full transition-colors duration-150 relative"
              style={{ backgroundColor: draft }}
            >
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <span 
                  className="text-xs font-black uppercase tracking-widest drop-shadow-sm transition-colors"
                  style={{ color: textColor }}
                >
                  Pick Color
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Hex input — big, obvious, always at top */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-border bg-muted/30 px-3 py-2.5 focus-within:border-primary focus-within:bg-background transition-all">
                <span className="text-base font-black text-muted-foreground select-none">#</span>
                <input
                  type="text"
                  value={hexInput.replace(/^#/, '')}
                  onChange={e => setHexInput('#' + e.target.value)}
                  onBlur={e => commitHex('#' + e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitHex('#' + (e.target as HTMLInputElement).value); }}
                  onFocus={e => e.target.select()}
                  autoFocus
                  className="flex-1 bg-transparent text-base font-mono font-bold text-foreground outline-none uppercase tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  spellCheck={false}
                />
                <span
                  className="w-6 h-6 rounded-md border border-border/50 shrink-0 shadow-sm transition-colors duration-150"
                  style={{ backgroundColor: draft }}
                />
              </div>

              {/* Color wheel */}
              <HexColorPicker
                color={draft}
                onChange={handlePickerChange}
                style={{ width: '100%', height: '180px' }}
              />

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: draft, color: textColor }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Keyframe animation */}
          <style>{`
            @keyframes colorPickerIn {
              from { opacity: 0; transform: scale(0.88) translateY(12px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );

};

// ── WhatsAppConnectionCard Component ──────────────────────────────────────────
// Handles Meta's standard OAuth redirect for WhatsApp.
// If automated ID resolution fails due to permissions, it displays a manual setup form.
const WhatsAppConnectionCard = ({ profile, setProfile }: { profile: any; setProfile: (p: any) => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [manualPhoneId, setManualPhoneId] = useState(profile.whatsappPhoneId === 'pending_setup' ? '' : profile.whatsappPhoneId || '');
  const [manualWabaId, setManualWabaId] = useState(profile.whatsappWABAId === 'pending_setup' ? '' : profile.whatsappWABAId || '');
  const [savingManual, setSavingManual] = useState(false);
  const [showManualForm, setShowManualForm] = useState(profile.whatsappPhoneId === 'pending_setup' || profile.whatsappWABAId === 'pending_setup');
  // Prevent the OAuth code exchange from firing more than once (StrictMode double-render guard)
  const oauthProcessed = useRef(false);
  
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
  const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || '1491990322515220';

  // Sync state if profile changes
  useEffect(() => {
    setManualPhoneId(profile.whatsappPhoneId === 'pending_setup' ? '' : profile.whatsappPhoneId || '');
    setManualWabaId(profile.whatsappWABAId === 'pending_setup' ? '' : profile.whatsappWABAId || '');
    if (profile.whatsappPhoneId === 'pending_setup' || profile.whatsappWABAId === 'pending_setup') {
      setShowManualForm(true);
    }
  }, [profile]);

  const handleSaveManual = async () => {
    if (!manualPhoneId || !manualWabaId) {
      toast({ title: 'Error', description: 'Please enter both Phone ID and WABA ID.', variant: 'destructive' });
      return;
    }
    setSavingManual(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/whatsapp/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isManualConfig: true,
          phoneNumberId: manualPhoneId,
          wabaId: manualWabaId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save configuration.');

      const updatedProfile = {
        ...profile,
        whatsappIsConnected: true,
        whatsappPhoneId: data.profile?.whatsappPhoneId,
        whatsappWABAId: data.profile?.whatsappWABAId,
      };
      setProfile(updatedProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
      setShowManualForm(false);
      toast({ title: 'Success', description: 'WhatsApp details saved successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingManual(false);
    }
  };

  useEffect(() => {
    // Check if we just returned from Facebook OAuth
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    // Guard against double-fire from React StrictMode or component re-mount
    if ((code || error) && oauthProcessed.current) return;
    if (code || error) oauthProcessed.current = true;

    if (error) {
      toast({ title: 'Connection Failed', description: params.get('error_description') || 'Facebook login was cancelled.', variant: 'destructive' });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      setLoading(true);
      // Exchange code for token
      const token = localStorage.getItem('token');
      const redirectUri = window.location.origin + window.location.pathname; // Should be http://localhost:5173/dashboard/settings

      fetch(`${apiBase}/whatsapp/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          isManualOAuth: true,
          redirectUri
        }),
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || 'Connection failed');
        
        const updatedProfile = {
          ...profile,
          whatsappIsConnected: true,
          whatsappPhoneId: data.profile?.whatsappPhoneId || 'pending_setup',
          whatsappWABAId: data.profile?.whatsappWABAId || 'pending_setup',
          whatsappNumber: data.profile?.whatsappNumber || profile.whatsappNumber || '',
        };
        setProfile(updatedProfile);
        localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));

        const displayNumber = data.profile?.whatsappNumber || data.profile?.whatsappPhoneId || 'your account';
        toast({ title: '✅ WhatsApp Connected!', description: `Connected: ${displayNumber}` });
      })
      .catch((err: any) => {
        toast({ title: 'Connection Failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
      })
      .finally(() => {
        setLoading(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  const launchEmbeddedSignup = () => {
    setLoading(true);

    const configId = '27762552940069627';
    const redirectUri = window.location.origin + window.location.pathname; // http://localhost:5173/dashboard/settings
    
    // We must pass the exact extras stringified
    const extras = JSON.stringify({
      feature: 'whatsapp_embedded_signup',
      version: 2,
      sessionInfoVersion: '3',
      setup: {}
    });

    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&config_id=${configId}&extras=${encodeURIComponent(extras)}&scope=whatsapp_business_management,whatsapp_business_messaging,business_management`;
    
    window.location.href = oauthUrl;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/whatsapp/disconnect`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');

      const updatedProfile = {
        ...profile,
        whatsappIsConnected: false,
        whatsappPhoneId: '',
        whatsappAccessToken: '',
        whatsappWABAId: '',
      };
      setProfile(updatedProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
      toast({ title: 'Disconnected', description: 'WhatsApp Business account has been unlinked.' });
    } catch (err: any) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (profile.whatsappIsConnected) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 rounded-2xl bg-muted/30 border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
            <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-tr from-[#128C7E] to-[#25D366] border border-green-500/30">
              <WhatsAppIcon size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-foreground truncate">
                {profile.whatsappNumber
                  ? profile.whatsappNumber
                  : profile.whatsappPhoneId
                    ? `Phone ID: ${profile.whatsappPhoneId}`
                    : 'WhatsApp Business'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">Active Connection</span>
              </div>
              {profile.whatsappPhoneId && (
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">Phone ID: {profile.whatsappPhoneId}</p>
              )}
              {profile.whatsappWABAId && (
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">WABA ID: {profile.whatsappWABAId}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
            <Button
              onClick={() => setShowManualForm(!showManualForm)}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
            >
              {showManualForm ? 'Hide Settings' : 'Configure Manually'}
            </Button>
            <Button
              onClick={launchEmbeddedSignup}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
            >
              {loading ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2 shrink-0" />}
              Reconnect
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-destructive/30 text-destructive hover:bg-destructive/10 px-5"
            >
              {disconnecting ? 'Unlinking...' : 'Disconnect'}
            </Button>
          </div>
        </div>

        {showManualForm && (
          <div className="mt-2 pt-4 border-t border-border/50 flex flex-col gap-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Manual API Configuration</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                If Meta failed to auto-detect your WhatsApp IDs (often due to Sandbox/App Review restrictions), copy and paste them from your Meta Developer Portal below:
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">WhatsApp Phone ID</label>
                <input
                  type="text"
                  placeholder="e.g. 104829381029381"
                  value={manualPhoneId}
                  onChange={(e) => setManualPhoneId(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">WABA ID (WhatsApp Business Account ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 883920193810293"
                  value={manualWabaId}
                  onChange={(e) => setManualWabaId(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveManual}
              disabled={savingManual}
              className="self-end h-11 rounded-xl text-xs font-black uppercase tracking-widest px-6 text-white shadow-md bg-green-600 hover:bg-green-700"
            >
              {savingManual ? <RefreshCw size={14} className="mr-2 animate-spin" /> : null}
              Save Configuration
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#128C7E]/5 to-[#25D366]/5 border border-dashed border-green-500/30 hover:border-green-500/50 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden bg-gradient-to-tr from-[#128C7E]/20 to-[#25D366]/20 border border-green-500/20">
          <WhatsAppIcon size={28} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-foreground truncate">WhatsApp Business API</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Not Connected</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Connect your WhatsApp Business number to send bulk campaign blasts, promotional messages, and automated replies directly from SyncSocio.
          </p>
        </div>
      </div>

      {/* Permissions list */}
      <div className="flex flex-col gap-1.5 pl-1">
        {[
          'Send WhatsApp campaign blasts to your contacts',
          'Upload and attach creative images to messages',
          'Manage message templates via WABA',
        ].map((perm, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={13} className="text-green-500 shrink-0" />
            {perm}
          </div>
        ))}
      </div>

      <Button
        onClick={launchEmbeddedSignup}
        disabled={loading}
        className="w-full sm:w-auto h-11 rounded-xl text-xs font-black uppercase tracking-widest px-6 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)' }}
      >
        {loading ? (
          <RefreshCw size={15} className="mr-2 animate-spin" />
        ) : (
          <WhatsAppIcon size={16} className="mr-2" />
        )}
        {loading ? 'Connecting...' : 'Connect WhatsApp Business'}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        A secure Meta popup will appear. Select your WhatsApp Business number and grant permissions.
      </p>
    </div>
  );
};
