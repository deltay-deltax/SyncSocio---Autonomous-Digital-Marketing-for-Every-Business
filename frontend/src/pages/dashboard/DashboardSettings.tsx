import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Pause, Globe, MapPin, Target, Users, Megaphone, Palette, Layers, CheckCircle2, Zap, Clock, ShieldCheck, FileText, ExternalLink, Sparkles } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const settingsTabs = ['Brand Profile', 'Connected Accounts', 'Posting Preferences', 'Plan & Billing', 'Legal & Privacy', 'Danger Zone'];

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
  const [activeTab, setActiveTab] = useState('Brand Profile');
  const { profile, setProfile, setShowNotifications } = useOutletContext<{ 
    profile: any; 
    setProfile: (p: any) => void; 
    setShowNotifications?: (show: boolean) => void;
  }>();
  const [updating, setUpdating] = useState(false);
  const [rescraping, setRescraping] = useState(false);

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
      localStorage.removeItem('velocity_products');
      const uId = profile?.user || profile?._id || 'default';
      localStorage.removeItem(`velocity_products_${uId}`);
      try {
        const req = indexedDB.open('VelocityProductCache', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('products')) {
            const tx = db.transaction('products', 'readwrite');
            tx.objectStore('products').delete(`velocity_products_${uId}`);
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
      setFormData(updatedFormData);
      setProfile(updatedProfile);
      localStorage.setItem('velocity_profile', JSON.stringify(updatedProfile));

      alert(`✅ Website rescrape complete! Brand profile updated and ${scrapedProducts.length} products reloaded successfully.`);
    } catch (err: any) {
      alert('Rescrape Error: ' + err.message);
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
        localStorage.setItem('velocity_profile', JSON.stringify(updatedProfile));
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
    typography: profile?.typography || ''
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
        typography: profile.typography || ''
      });
    }
  }, [profile]);

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
      localStorage.setItem('velocity_profile', JSON.stringify(updatedProfile));
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

        {/* Content */}
        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === 'Brand Profile' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Brand Profile</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Configure your core brand settings and identity details.</p>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Name</Label>
                      <Input 
                        value={formData.brandName} 
                        onChange={e => updateField('brandName', e.target.value)}
                        className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industry</Label>
                      <Input 
                        value={formData.businessCategory} 
                        onChange={e => updateField('businessCategory', e.target.value)}
                        className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Website URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={formData.website} 
                          onChange={e => updateField('website', e.target.value)}
                          className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20 flex-1" 
                        />
                        <Button
                          type="button"
                          onClick={handleRescrape}
                          disabled={rescraping || !formData.website}
                          className="h-12 rounded-xl px-5 bg-primary text-primary-foreground text-xs font-bold gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/10"
                        >
                          {rescraping ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} className="animate-pulse" />
                          )}
                          {rescraping ? 'Rescraping...' : 'Rescrape'}
                        </Button>
                      </div>
                    </div>
                    {/* Brand Typography */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Typography</Label>
                      <Input 
                        value={formData.typography} 
                        onChange={e => updateField('typography', e.target.value)}
                        placeholder="e.g. Outfit, sans-serif"
                        className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                      />
                      {formData.typography && (
                        <div className="mt-1 px-4 py-2 bg-muted/10 border border-border/30 rounded-xl">
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Live Font Preview</span>
                          <p 
                            className="text-base font-bold transition-all truncate" 
                            style={{ fontFamily: formData.typography }}
                          >
                            The quick brown fox jumps over the lazy dog.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Identity */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={formData.city} 
                          onChange={e => updateField('city', e.target.value)}
                          placeholder="City" 
                          className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                        />
                        <Input 
                          value={formData.country} 
                          onChange={e => updateField('country', e.target.value)}
                          placeholder="Country" 
                          className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Voice / Tone</Label>
                      <Input 
                        value={formData.brandTone} 
                        onChange={e => updateField('brandTone', e.target.value)}
                        className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                      />
                    </div>
                    {/* Brand Colors */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Colors</Label>
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2 border border-border/50 bg-muted/20 rounded-xl px-3 py-2 flex-1">
                          <input 
                            type="color" 
                            value={formData.primaryColor} 
                            onChange={e => updateField('primaryColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent shrink-0" 
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Primary</span>
                            <input 
                              type="text" 
                              value={formData.primaryColor} 
                              onChange={e => updateField('primaryColor', e.target.value)}
                              className="text-xs font-bold bg-transparent outline-none w-20 text-foreground" 
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border border-border/50 bg-muted/20 rounded-xl px-3 py-2 flex-1">
                          <input 
                            type="color" 
                            value={formData.secondaryColor} 
                            onChange={e => updateField('secondaryColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent shrink-0" 
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Secondary</span>
                            <input 
                              type="text" 
                              value={formData.secondaryColor} 
                              onChange={e => updateField('secondaryColor', e.target.value)}
                              className="text-xs font-bold bg-transparent outline-none w-20 text-foreground" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Brand Logo */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Logo</Label>
                      <div className="flex gap-4 items-center">
                        {/* Preview Card */}
                        <div className="w-16 h-16 rounded-2xl border border-border/50 bg-muted/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                          {formData.logo ? (
                            <img 
                              src={formData.logo} 
                              alt="Brand Logo" 
                              className="w-full h-full object-contain p-2" 
                            />
                          ) : (
                            <div className="text-[9px] font-black text-muted-foreground/60 text-center uppercase tracking-tighter p-1">No Logo</div>
                          )}
                        </div>
                        
                        {/* Upload Actions */}
                        <div className="flex flex-row items-center gap-2 flex-1">
                          <Label 
                            htmlFor="logo-upload" 
                            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-border/50 bg-muted/25 text-xs font-bold text-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                          >
                            Upload Image
                          </Label>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    updateField('logo', event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          {formData.logo && (
                            <button 
                              type="button" 
                              onClick={() => updateField('logo', '')}
                              className="p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              title="Remove logo"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">Supports PNG, SVG, JPG, WebP.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Unique Selling Point (USP)</Label>
                  <Input 
                    value={formData.usp} 
                    onChange={e => updateField('usp', e.target.value)}
                    className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Main Growth Goal</Label>
                    <Input 
                      value={formData.mainGoal} 
                      onChange={e => updateField('mainGoal', e.target.value)}
                      className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Competitor Handles</Label>
                    <Input 
                      value={formData.competitors} 
                      onChange={e => updateField('competitors', e.target.value)}
                      placeholder="@rival1, @rival2" 
                      className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Audience</Label>
                    <Input 
                      value={formData.targetAudiences} 
                      onChange={e => updateField('targetAudiences', e.target.value)}
                      className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Addressing Pain Point</Label>
                    <Input 
                      value={formData.painPoint} 
                      onChange={e => updateField('painPoint', e.target.value)}
                      className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age Range</Label>
                    <Input defaultValue={profile.ageRange || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10 text-center" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender Focus</Label>
                    <Input defaultValue={profile.genderFocus || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10 text-center" />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Keywords</Label>
                    <Input defaultValue={profile.brandKeywords || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30">
                  <Button 
                    onClick={handleUpdate}
                    disabled={updating}
                    className="gradient-bg text-primary-foreground border-0 text-[10px] font-black uppercase tracking-widest h-12 px-10 rounded-xl shadow-lg shadow-primary/20"
                  >
                    {updating ? 'Updating...' : 'Update Brand Identity'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground font-medium italic mt-3">Changes here will trigger a retraining cycle for your AI Posting Agent.</p>
                </div>
              </CardContent>
            </Card>
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
                        onClick={() => window.location.href='/setup'}
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
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white relative overflow-hidden shadow-xl shadow-primary/20">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none">
                    <Zap size={120} fill="currentColor" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2 opacity-70">Active Strategy Plan</p>
                  <h3 className="text-3xl font-black tracking-tighter mb-4">VelocityDM {profile.selectedPlan || 'Pro'}</h3>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Status</p>
                      <p className="text-xs font-black">ACTIVE</p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Next Bill</p>
                      <p className="text-xs font-black">MAY 14, 2026</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 ml-1">Automated Billing Record</p>
                  {['Apr 2026', 'Mar 2026', 'Feb 2026'].map((month, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CheckCircle2 size={18} /></div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground">{month} Statement</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Processed</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-muted-foreground">₹499.00</span>
                    </div>
                  ))}
                </div>
                
                <Button disabled className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground border-border/50 cursor-not-allowed">
                  Subscription Managed via Onboarding Flow
                </Button>
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
                      localStorage.removeItem('velocity_profile');
                      localStorage.removeItem('velocity_setup_done');
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
    </div>
  );
};

export default DashboardSettings;
