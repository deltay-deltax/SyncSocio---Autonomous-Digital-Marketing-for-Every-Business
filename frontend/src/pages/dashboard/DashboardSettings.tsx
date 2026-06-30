import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Pause, Globe, MapPin, Target, Users, Megaphone, Palette, Layers, CheckCircle2, Zap, Clock, ShieldCheck, FileText, ExternalLink, Sparkles, Languages, Building2, AtSign, Heart, Type, Hash, Check, X, Camera, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkout } from '@/components/Checkout';
import { useOutletContext, Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useRazorpay } from '../../hooks/useRazorpay';

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

const GoogleIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

const settingsTabs = ['Brand Profile', 'Connected Accounts', 'Posting Preferences', 'Plan & Billing', 'Legal & Privacy', 'Danger Zone'];

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
  'SaaS & Digital'
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
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Brand Profile');
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

  const { profile, setProfile, setShowNotifications } = useOutletContext<{
    profile: any;
    setProfile: (p: any) => void;
    setShowNotifications?: (show: boolean) => void;
  }>();
  const [updating, setUpdating] = useState(false);
  const [rescraping, setRescraping] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const { toast } = useToast();

  const handlePlanAction = async (actionType: 'renew' | 'upgrade', currentPlan: string) => {
    let amount = 0;
    let planStr = '';
    let creditsAdded = 0;
    let typeStr = '';

    const isGrowthOrElite = currentPlan.toLowerCase().includes('growth') || currentPlan.toLowerCase().includes('elite') || currentPlan.toLowerCase().includes('pro');

    if (actionType === 'renew') {
       amount = isGrowthOrElite ? 1899 : 599;
       planStr = currentPlan;
       creditsAdded = isGrowthOrElite ? 700 : 200;
       typeStr = 'plan_renewal';
    } else if (actionType === 'upgrade') {
      amount = 1899; // Full Elite Plan price
      planStr = currentPlan.toLowerCase().includes('starter') || currentPlan.toLowerCase().includes('brand') ? 'Elite' : 'Growth';
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
      alert('Please enter a website URL to rescrape.');
      return;
    }

    if (!confirm(`This will scrape ${formData.website} for new details and import newer products. Do you want to proceed?`)) {
      return;
    }

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
        typography: scraped.typography || formData.typography
      };

      // 4. Save newly scraped products sequentially
      const scrapedProducts = scraped.products || [];
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
        const req = indexedDB.open('SyncSocioProductCache', 1);
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
      toast({ title: 'Rescrape failed', description: err.message, variant: 'destructive' });
    } finally {
      setRescraping(false);
    }
  };


  const handleConnectGmail = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Google Auth Success:', tokenResponse);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch Google user info');
        const userInfo = await res.json();
        const email = userInfo.email;

        // Save to backend using VITE_API_URL/profile
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const profileRes = await fetch(`${apiBase}/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            gmailEmail: email,
            gmailIsConnected: true
          })
        });

        if (!profileRes.ok) throw new Error('Failed to update brand profile with connected Gmail');
        const updatedProfile = await profileRes.json();
        setProfile(updatedProfile);
        localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
        if (setShowNotifications) {
          setShowNotifications(true);
        }
      } catch (err: any) {
        console.error('Error connecting Gmail:', err);
        alert('Error: ' + err.message);
      }
    },
    onError: (error) => {
      console.error('Google Auth Failed:', error);
      alert('Google authentication failed.');
    }
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    brandName: profile?.brandName || '',
    businessCategory: profile?.businessCategory || '',
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
      alert('✅ Brand Identity updated successfully! The AI Agent has been notified.');
    } catch (err: any) {
      alert('Error: ' + err.message);
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
                      <option key={b._id} value={b._id}>
                        {b.brandName || 'Untitled Brand'} (@{b.instagramUsername || b.socialHandle || 'no-handle'})
                      </option>
                    ))}
                  </select>

                  {((() => {
                    const hasStarter = brands.length > 0 && brands.every(b => {
                      const plan = (b.selectedPlan || '').toLowerCase();
                      return plan.includes('starter') || plan.includes('brand');
                    });
                    const maxBrands = hasStarter ? 1 : 2; // Elite allows 2 brands, Starter allows 1
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
                    <Input value={formData.country} onChange={e => updateField('country', e.target.value)} placeholder="India" className="text-sm" />
                  </Field>
                  <Field label="Industry" className="md:col-span-2">
                    <ChipGroup options={industries} value={formData.businessCategory} onChange={v => updateField('businessCategory', v)} />
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
              <div className="h-20" />

              {/* Fixed save */}
              <div className="fixed bottom-[73px] lg:bottom-0 left-0 lg:left-64 right-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
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
                  className="bg-primary text-primary-foreground border-0 text-xs shrink-0 font-black uppercase tracking-widest h-10 px-5 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
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
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
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
                        <p className="text-base font-black text-foreground">@{profile.instagramUsername}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Connection</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
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
                        <RefreshCw size={14} className="mr-2" /> Reconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/10 border border-dashed border-border/70 hover:bg-muted/20 transition-all">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden bg-muted-foreground/10">
                        <InstagramIcon size={28} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground">Instagram Business Account</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Not Connected</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="gradient-bg text-white text-[10px] h-10 rounded-xl font-black uppercase tracking-widest px-6"
                        onClick={() => window.location.href = '/setup'}
                      >
                        Connect
                      </Button>
                    </div>
                  )}

                  {/* Gmail Connection */}
                  {profile.gmailIsConnected ? (
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-muted/25 border border-border/30">
                        <GoogleIcon size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground">{profile.gmailEmail}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Connection</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
                        onClick={() => handleConnectGmail()}
                      >
                        <RefreshCw size={14} className="mr-2" /> Reconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/10 border border-dashed border-border/70 hover:bg-muted/20 transition-all">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden bg-muted-foreground/10">
                        <GoogleIcon size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground">Gmail / Email Connection</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Not Connected</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="gradient-bg text-white text-[10px] h-10 rounded-xl font-black uppercase tracking-widest px-6"
                        onClick={() => handleConnectGmail()}
                      >
                        Connect
                      </Button>
                    </div>
                  )}

                  {/* WhatsApp Connection */}
                  {profile.whatsappIsConnected ? (
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-tr from-[#128C7E] to-[#25D366] border border-green-500/30">
                        <WhatsAppIcon size={28} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground">{profile.whatsappNumber || 'Connected'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Connection</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5"
                        onClick={async () => {
                          const num = prompt("Step 1/3: Enter your WhatsApp Business Number to reconnect:", profile.whatsappNumber || '');
                          if (num) {
                            const phoneId = prompt("Step 2/3: Enter your Meta WhatsApp Phone ID:", profile.whatsappPhoneId || '');
                            if (phoneId !== null) {
                              const accessToken = prompt("Step 3/3: Enter your Meta Permanent Access Token:", profile.whatsappAccessToken || '');
                              if (accessToken !== null) {
                                try {
                                  const token = localStorage.getItem('token');
                                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
                                  const profileRes = await fetch(`${apiBase}/profile`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                      whatsappIsConnected: true,
                                      whatsappNumber: num,
                                      whatsappPhoneId: phoneId,
                                      whatsappAccessToken: accessToken
                                    })
                                  });
                                  if (!profileRes.ok) throw new Error('Failed to reconnect WhatsApp');
                                  const updatedProfile = await profileRes.json();
                                  setProfile(updatedProfile);
                                  localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
                                  alert('WhatsApp account reconnected successfully.');
                                } catch (err: any) {
                                  alert('Error: ' + err.message);
                                }
                              }
                            }
                          }
                        }}
                      >
                        <RefreshCw size={14} className="mr-2" /> Reconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/10 border border-dashed border-border/70 hover:bg-muted/20 transition-all">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden bg-muted-foreground/10">
                        <WhatsAppIcon size={28} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-foreground">WhatsApp Business API</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Not Connected</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-10 rounded-xl font-black uppercase tracking-widest px-6"
                        onClick={async () => {
                          const num = prompt("Step 1/3: Enter your WhatsApp Business Number to connect:");
                          if (num) {
                            const phoneId = prompt("Step 2/3: Enter your Meta WhatsApp Phone ID:");
                            if (phoneId !== null) {
                              const accessToken = prompt("Step 3/3: Enter your Meta Permanent Access Token:");
                              if (accessToken !== null) {
                                try {
                                  const token = localStorage.getItem('token');
                                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
                                  const profileRes = await fetch(`${apiBase}/profile`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                      whatsappIsConnected: true,
                                      whatsappNumber: num,
                                      whatsappPhoneId: phoneId,
                                      whatsappAccessToken: accessToken
                                    })
                                  });
                                  if (!profileRes.ok) throw new Error('Failed to connect WhatsApp');
                                  const updatedProfile = await profileRes.json();
                                  setProfile(updatedProfile);
                                  localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
                                  alert('WhatsApp account connected successfully.');
                                  if (setShowNotifications) {
                                    setShowNotifications(true);
                                  }
                                } catch (err: any) {
                                  alert('Error: ' + err.message);
                                }
                              }
                            }
                          }
                        }}
                      >
                        Connect
                      </Button>
                    </div>
                  )}
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
                       {tx.creditsAdded > 0 && <span className="block text-[10px] font-bold text-emerald-600">+{tx.creditsAdded} credits</span>}
                    </div>
                  </div>
                ))}
              </div>

              {(() => {
                const plan = (profile.userPlan || profile.selectedPlan || '').toLowerCase();
                const isStarterOrBrand = plan.includes('starter') || plan.includes('brand');
                
                const planName = isStarterOrBrand ? 'Starter' : 'Elite';
                const planPrice = isStarterOrBrand ? '₹599/month' : '₹1899/month';
                const planCredits = isStarterOrBrand ? '200 credits/month' : '700 credits/month';
                 const planFeatures = isStarterOrBrand 
                  ? [
                      '200 credits/month',
                      '1 active brand profile',
                      'All image generation types',
                      'Festival calendar',
                      'Hinglish + 5 languages',
                      'Caption & hashtag generation',
                      'Schedule up to 30 posts/month',
                      'Analytics dashboard',
                      'Email support'
                    ]
                  : [
                      '700 credits/month',
                      '1 active brand profile',
                      'All image generation types',
                      'Festival calendar & suggestions',
                      'Hinglish + 5 languages',
                      'Caption & hashtag generation',
                      'Unlimited post scheduling',
                      'Reels + Video + UGC support',
                      'DM automation & lead capture',
                      'Best time to post analysis',
                      'Analytics dashboard',
                      'Priority 24/7 support'
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
                const isStarterOrBrand = plan.includes('starter') || plan.includes('brand');
                const isGrowthOrEliteOrPro = plan.includes('growth') || plan.includes('elite') || plan.includes('pro');

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

                if (isStarterOrBrand) {
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
                          Renew Plan (₹599)
                        </Button>
                        <Button 
                          onClick={() => handlePlanAction('upgrade', profile.userPlan || profile.selectedPlan || 'Starter')} 
                          className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white border-0 cursor-pointer shadow-lg hover:bg-emerald-500"
                        >
                          Upgrade to Elite (₹1899)
                        </Button>
                      </div>
                    </div>
                  );
                } else if (isGrowthOrEliteOrPro) {
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
                        onClick={() => handlePlanAction('renew', profile.userPlan || profile.selectedPlan || 'Elite')} 
                        disabled={!canRenew}
                        className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground border-0 cursor-pointer shadow-lg hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Renew Elite Plan (₹1899)
                      </Button>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Subscription Actions</p>
                      <Button disabled className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground border-border/50 cursor-not-allowed">
                        Subscription Managed via Onboarding Flow
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
                    if (confirm("⚠️ CRITICAL ACTION: This will permanently delete your account, your brand identity, and ALL metrics. This cannot be undone. Are you absolutely sure?")) {
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
                          alert("Failed to terminate account. Please try again.");
                        }
                      } catch (err) {
                        console.error("Termination failed:", err);
                      }
                    }
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
                  className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl border-border text-foreground hover:bg-muted"
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
      </div>
    </div>
    </div >
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

const ColorPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2 py-1.5">
    <div className="relative w-8 h-8 rounded-md overflow-hidden border border-border shrink-0" style={{ backgroundColor: value }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
    </div>
    <Input value={value} onChange={e => onChange(e.target.value)} className="border-0 h-8 px-1 text-sm font-mono focus-visible:ring-0" />
  </div>
);
