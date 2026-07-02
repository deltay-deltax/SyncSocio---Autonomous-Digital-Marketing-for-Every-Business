import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ChevronLeft, ShieldCheck, DollarSign, Building2, ChevronRight,
  Camera, MapPin, FileText, ArrowRight, Check, Globe, Rocket, Users, Compass, Trophy,
  BarChart3, MessageSquare, Zap, Star, Target, Utensils, Dumbbell,
  Shirt, Cpu, GraduationCap, Sparkle, Layers, Repeat, AtSign, Heart, Box, Palette, Diamond,
  Clock, TrendingUp, Loader2
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LogoProps {
  active: boolean;
}

const InstagramLogo = ({ active }: LogoProps) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'fill-[#E1306C]' : 'fill-slate-300'}`} viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608C4.604 2.527 5.871 2.257 7.237 2.195 8.503 2.137 8.883 2.125 12.087 2.125zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.272 2.69.072 7.048.014 8.329 0 8.737 0 11.996s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

const FacebookLogo = ({ active }: LogoProps) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'fill-[#1877F2]' : 'fill-slate-300'}`} viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const XLogo = ({ active }: LogoProps) => (
  <svg className={`w-5 h-5 transition-all duration-300 ${active ? 'fill-slate-900' : 'fill-slate-300'}`} viewBox="0 0 24 24">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const LinkedInLogo = ({ active }: LogoProps) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'fill-[#0A66C2]' : 'fill-slate-300'}`} viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.064 2.064 0 1 1 0-4.128 2.064 2.064 0 0 1 0 4.128zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

interface FormData {
  brandName: string;
  socialHandle: string;
  businessCategory: string;
  otherCategory: string;
  mainGoal: string;
  website: string;
  location: { country: string; city: string };
  usp: string;
  competitors: string[];
  targetAudiences: string[];

  ageRange: string;
  genderFocus: string;
  painPoint: string;
  brandTone: string;
  visualVibe: string;
  brandKeywords: string;
  contentTypes: string[];
  postingFrequency: string;
  socialPlatforms: string[];
  analytics: { followers: string; reach: string; engagement: string };
  contentMix: { education: number; promotion: number };
  primaryCTA: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  typography: string;
}

interface LeftPanelContent {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const Onboarding = () => {
  const location = useLocation();
  const [step, setStep] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    return stepParam ? parseInt(stepParam, 10) : 0;
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stepParam = searchParams.get('step');
    if (stepParam !== null) {
      setStep(parseInt(stepParam, 10));
    }
  }, [location.search]);
  const totalSteps = 11;
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [extractedProducts, setExtractedProducts] = useState<any[]>([]);
  const [scanUrl, setScanUrl] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScanWebsite = async () => {
    if (!scanUrl.trim()) {
      setScanError('Please enter a website URL');
      return;
    }
    
    setScanLoading(true);
    setScanError('');
    setScanSuccess(false);
    
    const statuses = [
      'Initializing scan...',
      'Connecting to website host...',
      'Visiting pages and downloading HTML structure...',
      'Parsing metadata and layout structure...',
      'Running GPT Brand Intelligence extraction...',
      'Rephrasing brand core and messaging...',
      'Cataloging product offerings...'
    ];
    
    let statusIndex = 0;
    setScanStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      if (statusIndex < statuses.length - 1) {
        statusIndex++;
        setScanStatus(statuses[statusIndex]);
      }
    }, 2000);
    
    try {
      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
      const response = await fetch(`${AGENT_API_URL}/scrape-brand-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scanUrl })
      });
      
      clearInterval(statusInterval);
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to extract website details');
      }
      
      const data = await response.json();
      
      let comps = data.competitors || [];
      while (comps.length < 2) {
        comps.push('');
      }
      
      setFormData(prev => ({
        ...prev,
        brandName: data.brandName || prev.brandName,
        website: data.website || scanUrl,
        businessCategory: data.businessCategory || prev.businessCategory,
        mainGoal: data.mainGoal || prev.mainGoal,
        location: {
          country: data.location?.country || prev.location.country,
          city: data.location?.city || prev.location.city
        },
        usp: data.usp || prev.usp,
        competitors: comps.slice(0, 2),
        targetAudiences: data.targetAudiences || prev.targetAudiences,
        ageRange: data.ageRange || prev.ageRange,
        genderFocus: data.genderFocus || prev.genderFocus,
        painPoint: data.painPoint || prev.painPoint,
        brandTone: data.brandTone || prev.brandTone,
        visualVibe: data.visualVibe || prev.visualVibe,
        brandKeywords: data.brandKeywords || prev.brandKeywords,
        primaryColor: data.primaryColor || prev.primaryColor,
        secondaryColor: data.secondaryColor || prev.secondaryColor,
        logo: data.logo || prev.logo,
        typography: data.typography || prev.typography
      }));
      
      if (data.products && Array.isArray(data.products)) {
        setExtractedProducts(data.products);
      }
      
      setScanSuccess(true);
      setScanStatus('Scan complete! Brand DNA synthesized.');
    } catch (err: any) {
      clearInterval(statusInterval);
      console.error(err);
      setScanError(err.message || 'Scrape connection timed out. You can skip and setup manually.');
    } finally {
      setScanLoading(false);
    }
  };


  const [formData, setFormData] = useState<FormData>({
    brandName: '',
    socialHandle: '',
    businessCategory: '',
    otherCategory: '',
    mainGoal: '',
    website: '',
    location: { country: 'India', city: '' },
    usp: '',
    competitors: ['', ''],
    targetAudiences: [],
    ageRange: '',
    genderFocus: 'All',

    painPoint: '',
    brandTone: '',
    visualVibe: '',
    brandKeywords: '',
    contentTypes: [],
    postingFrequency: '',
    socialPlatforms: ['Instagram', 'Facebook'],
    analytics: { followers: '', reach: '', engagement: '' },
    contentMix: { education: 80, promotion: 20 },
    primaryCTA: '',
    primaryColor: '#2563EB',
    secondaryColor: '#60A5FA',
    logo: '',
    typography: ''
  });

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    if (step === 11) {
      setAnalyzingProgress(0);
      const interval = setInterval(() => {
        setAnalyzingProgress(prev => {
          if (prev >= 5) {
            clearInterval(interval);
            return 5;
          }
          return prev + 1;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [step]);

  const getLeftPanelContent = (): LeftPanelContent => {
    const contents: Record<number, LeftPanelContent> = {
      0: { icon: <Globe size={80} strokeWidth={0.5} className="text-primary" />, title: "Website Scan", desc: "Instantly scan your website to auto-build your brand DNA." },
      1: { icon: <Rocket size={80} strokeWidth={0.5} className="text-primary" />, title: "Brand Core", desc: "Setting the foundation of your digital entity." },
      2: { icon: <Target size={80} strokeWidth={0.5} className="text-primary" />, title: "The Vision", desc: "Defining what success looks like for your brand." },
      3: { icon: <Globe size={80} strokeWidth={0.5} className="text-primary" />, title: "Local Presence", desc: "Pinpointing where your brand lives on the global map." },
      4: { icon: <Trophy size={80} strokeWidth={0.5} className="text-primary" />, title: "The Edge", desc: "Identifying your unique market advantages." },
      5: { icon: <Users size={80} strokeWidth={0.5} className="text-primary" />, title: "Audience DNA", desc: "Understanding the people behind the profiles." },
      6: { icon: <Compass size={80} strokeWidth={0.5} className="text-primary" />, title: "Psychology", desc: "Solving the real pain points of your customers." },
      7: { icon: <Star size={80} strokeWidth={0.5} className="text-primary" />, title: "Personality", desc: "Crafting a voice that resonates and connects." },
      8: { icon: <Layers size={80} strokeWidth={0.5} className="text-primary" />, title: "Visual Vibe", desc: "Establishing an aesthetic that turns heads." },
      9: { icon: <Repeat size={80} strokeWidth={0.5} className="text-primary" />, title: "Format Strategy", desc: "Choosing the best vehicles for your message." },
      10: { icon: <BarChart3 size={80} strokeWidth={0.5} className="text-primary" />, title: "Content Logistics", desc: "Setting the rhythm for your creative pipeline." },
      11: { icon: <Zap size={80} strokeWidth={0.5} className="text-primary" />, title: "Agent DNA", desc: "Synthesizing your 12-month creative strategy." }
    };
    return contents[step] || contents[1];
  };

  const leftContent = getLeftPanelContent();
  const progressPercent = (step / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 transition-colors duration-500 overflow-hidden relative scrollbar-hide">
      {/* Ambient background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />

      <div className="bg-card rounded-[2rem] shadow-[0_25px_80px_-20px_hsl(221_83%_53%/0.1),0_0_0_1px_hsl(220_15%_90%/0.8)] w-full max-w-[1080px] flex flex-col md:flex-row overflow-hidden min-h-[660px] max-h-[92vh] relative z-10 transition-all duration-500">
        
        {/* Left Panel */}
        <div className="w-full md:w-5/12 hidden md:flex flex-col justify-between overflow-hidden relative" style={{ background: 'linear-gradient(180deg, hsl(214 100% 97%) 0%, hsl(221 83% 53% / 0.06) 100%)' }}>
          {/* Dot grid pattern */}
          <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, hsl(221 83% 53% / 0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          {/* Decorative ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-primary/[0.06] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-dashed border-primary/[0.04] pointer-events-none" />

          <div className="flex items-center space-x-2.5 p-10 pb-0 relative z-10">
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Zap size={18} fill="currentColor" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">SyncSocio</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-grow text-center px-8 relative z-10 transition-all duration-700">
            <div className={`mb-8 p-5 rounded-3xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-lg shadow-primary/[0.04] ${step === 11 ? 'animate-pulse' : ''}`}>
              {leftContent.icon}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">{leftContent.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[220px] font-medium">
              {leftContent.desc}
            </p>
            
            <div className="flex items-center space-x-1.5 mt-10">
              {[...Array(totalSteps - 1)].map((_, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-full transition-all duration-500 ${
                    step === idx + 1 ? 'w-7 h-2 gradient-bg shadow-md shadow-primary/30' : idx + 1 < step ? 'w-2 h-2 bg-primary/30' : 'w-2 h-2 bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center text-[10px] text-muted-foreground/40 font-bold space-x-2 uppercase tracking-[0.25em] p-10 pt-0 relative z-10">
            <ShieldCheck size={13} className="text-primary/40" />
            <span>Agentic Network v2.1</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-7/12 flex flex-col relative bg-card border-l border-border/50">
          
          {step < 11 && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-muted/60 overflow-hidden z-20 rounded-full">
              <div className="h-full gradient-bg transition-all duration-700 ease-out rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          <div className="flex justify-between items-center px-8 md:px-12 pt-8 md:pt-10 pb-0 z-10">
            {step > 0 && step < 11 ? (
              <button onClick={handleBack} className="flex items-center text-[11px] font-black text-muted-foreground hover:text-primary transition-all uppercase tracking-[0.2em] group hover:gap-1">
                <ChevronLeft size={14} className="mr-1 group-hover:-translate-x-0.5 transition-transform" /> BACK
              </button>
            ) : (
              <Link to="/" className="md:hidden flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground">
                <img src="/SyncSocioLogo.png" alt="SyncSocio Logo" className="w-6 h-6 object-contain shrink-0" />
                <span>SyncSocio</span>
              </Link>
            )}
            
            <div className="hidden md:block"></div>
            
            {step < 11 && (
              <div className="flex items-center text-[11px] font-black text-primary px-3.5 py-1.5 rounded-full uppercase tracking-widest bg-primary/[0.07] border border-primary/10">
                <Sparkles size={11} className="mr-1.5" /> {step === 0 ? "Auto Scan" : `Step ${step}`}
                {step > 0 && <span className="text-muted-foreground/50 ml-1">/ {totalSteps - 1}</span>}
              </div>
            )}
          </div>

          <div className="flex-grow overflow-y-auto px-8 md:px-12 pb-16">
            <div className="max-w-[420px] mx-auto w-full flex flex-col mt-6">
              
              {/* Step 0: Website Scan */}
              {step === 0 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Auto-Setup</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic leading-relaxed">
                    Instantly import your brand. Drop your link and our AI agent will extract your brand details, tone, and products.
                  </p>
                  
                  {!scanLoading && !scanSuccess && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Website URL</label>
                        <div className="relative">
                          <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                          <input 
                            type="text" 
                            placeholder="e.g. www.yourbrand.com" 
                            value={scanUrl}
                            onChange={(e) => setScanUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScanWebsite()}
                            className="w-full bg-background text-foreground text-sm font-semibold rounded-xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-primary/15 transition-all border border-border/80 focus:border-primary/40 shadow-sm placeholder:text-muted-foreground/40 placeholder:font-normal" 
                          />
                        </div>
                        {scanError && (
                          <p className="text-destructive text-xs font-semibold mt-2.5 px-1">{scanError}</p>
                        )}
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <button 
                          onClick={handleScanWebsite}
                          className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center group uppercase tracking-[0.1em] active:scale-[0.98] hover:shadow-xl hover:shadow-primary/25 hover:brightness-110"
                        >
                          Auto-Scan Website <Sparkles size={14} className="ml-1.5 animate-pulse" />
                        </button>
                        
                        <button 
                          onClick={() => setStep(1)}
                          className="w-full bg-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground border border-border rounded-xl py-4 text-sm font-bold transition-all flex items-center justify-center group uppercase tracking-[0.1em] active:scale-[0.98]"
                        >
                          Skip & Manual Setup <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  )}

                  {scanLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                      <div className="relative mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
                          <Globe size={28} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="absolute -inset-2 border border-dashed border-primary/30 rounded-3xl animate-spin" style={{ animationDuration: '10s' }}></div>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">Scanning Brand Identity</h3>
                      <p className="text-xs text-muted-foreground/80 font-semibold uppercase tracking-wider h-6 animate-pulse">
                        {scanStatus}
                      </p>
                    </div>
                  )}

                  {scanSuccess && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-500">
                      <div className="bg-primary/[0.03] border border-primary/15 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <Check size={18} strokeWidth={3} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-foreground leading-tight">Extraction Successful!</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Found at {formData.website}</p>
                          </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        <div className="space-y-2.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Brand Name:</span>
                            <span className="text-xs font-bold text-foreground">{formData.brandName || 'Not Found'}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Category:</span>
                            <span className="text-xs font-bold text-foreground">{formData.businessCategory || 'Not Found'}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Brand Tone:</span>
                            <span className="text-xs font-bold text-foreground">{formData.brandTone || 'Not Found'}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Visual Vibe:</span>
                            <span className="text-xs font-bold text-foreground">{formData.visualVibe || 'Not Found'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Brand Colors:</span>
                            <div className="flex gap-1.5">
                              <div className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: formData.primaryColor }} />
                              <div className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: formData.secondaryColor }} />
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Products Cataloged:</span>
                            <span className="text-xs font-bold text-foreground">{extractedProducts.length} items</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <button 
                          onClick={() => setStep(1)}
                          className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center uppercase tracking-widest active:scale-[0.98] hover:brightness-110"
                        >
                          Review Brand Identity <ChevronRight size={14} className="ml-1" />
                        </button>
                        
                        <button 
                          onClick={() => {
                            setScanSuccess(false);
                            setScanUrl('');
                          }}
                          className="w-full bg-transparent text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest py-2"
                        >
                          Re-Scan Website
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Identity */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Identity</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic leading-relaxed">Let's start with your brand's digital entity.</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Brand Name</label>
                        <input type="text" placeholder="e.g. Nexus Digital" value={formData.brandName}
                          onChange={(e) => setFormData({...formData, brandName: e.target.value})}
                          className="w-full bg-background text-foreground text-sm font-semibold rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-primary/15 transition-all border border-border/80 focus:border-primary/40 shadow-sm placeholder:text-muted-foreground/40 placeholder:font-normal" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Primary Social Handle</label>
                        <div className="relative">
                          <AtSign className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
                          <input type="text" placeholder="@yourbrand" value={formData.socialHandle}
                            onChange={(e) => setFormData({...formData, socialHandle: e.target.value})}
                            className="w-full bg-background text-foreground text-sm font-semibold rounded-xl pl-11 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-primary/15 transition-all border border-border/80 focus:border-primary/40 shadow-sm placeholder:text-muted-foreground/40 placeholder:font-normal" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Business Category</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {[
                          { id: 'Baby & Kids', icon: Heart },
                          { id: 'Food & Beverage', icon: Utensils },
                          { id: 'Home & Living', icon: Building2 },
                          { id: 'Education & Training', icon: GraduationCap },
                          { id: 'Real Estate & Property', icon: Building2 },
                          { id: 'Travel & Hospitality', icon: Globe },
                          { id: 'Mobile Apps', icon: Cpu },
                          { id: 'IT & Technical Tools', icon: Cpu },
                          { id: 'Gaming & Entertainment', icon: Sparkles },
                          { id: 'Fashion & Apparel', icon: Shirt },
                          { id: 'Jewellery', icon: Diamond },
                          { id: 'Beauty & Personal Care', icon: Sparkles },

                          { id: 'Health & Wellness', icon: Dumbbell },
                          { id: 'Coaching & Consulting', icon: Users },
                          { id: 'Architecture', icon: Building2 },
                          { id: 'Financial Services', icon: DollarSign },
                          { id: 'Newsletters', icon: FileText },
                          { id: 'Online Marketplaces', icon: Globe },
                          { id: 'Digital Products', icon: Box },
                          { id: 'E-Commerce', icon: ShieldCheck },
                          { id: 'Services', icon: Star },
                          { id: 'SaaS & Digital', icon: Cpu }
                        ].map(cat => (
                          <div key={cat.id} onClick={() => setFormData({...formData, businessCategory: cat.id})}
                            className={`px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center group hover:shadow-sm ${
                              formData.businessCategory === cat.id ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30 shadow-sm shadow-primary/[0.05]' : 'border-border/70 bg-card hover:border-primary/20 hover:bg-primary/[0.02]'
                            }`}>
                            <cat.icon className={`mr-2 shrink-0 transition-colors ${formData.businessCategory === cat.id ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-primary/40'}`} size={14} />
                            <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${formData.businessCategory === cat.id ? 'text-foreground' : 'text-muted-foreground font-medium'}`}>{cat.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 shrink-0">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center group uppercase tracking-[0.1em] active:scale-[0.98] hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      START MISSION <ChevronRight size={14} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Vision */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">The Vision</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">What is our primary directive?</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Social Media Goal</label>
                      <div className="space-y-2">
                        {[
                          { id: 'Grow followers', icon: Users },
                          { id: 'Sell products / get orders', icon: DollarSign },
                          { id: 'Build brand awareness', icon: Sparkles },
                          { id: 'Get leads / enquiries', icon: MessageSquare }
                        ].map(goal => (
                          <div key={goal.id} onClick={() => setFormData({...formData, mainGoal: goal.id})}
                            className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                              formData.mainGoal === goal.id ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30 shadow-sm shadow-primary/[0.05]' : 'border-border/70 bg-card hover:border-primary/20 hover:bg-primary/[0.02]'
                            }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 shrink-0 ${formData.mainGoal === goal.id ? 'bg-primary/20' : 'bg-card shadow-sm'}`}>
                              <goal.icon size={14} className={formData.mainGoal === goal.id ? 'text-primary' : 'text-muted-foreground/50'} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-tight truncate ${formData.mainGoal === goal.id ? 'text-foreground' : 'text-muted-foreground'}`}>{goal.id}</span>
                            {formData.mainGoal === goal.id && <Check size={14} className="ml-auto text-primary shrink-0 stroke-[3]" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Domain URL</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
                        <input type="text" placeholder="e.g. www.yourwebsite.com" value={formData.website}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          className="w-full bg-background text-foreground text-xs font-semibold rounded-xl pl-12 pr-5 py-4 outline-none border border-border/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 shadow-sm placeholder:text-muted-foreground/40 placeholder:font-normal" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all shadow-lg shadow-primary/20 tracking-widest uppercase active:scale-[0.98] hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      SYNC OBJECTIVES
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Market */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Market</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">Geographic target points.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Target Country</label>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        {['India', 'Nepal'].map(country => (
                          <button
                            key={country}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              location: { ...formData.location, country }
                            })}
                            className={`py-3.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                              formData.location.country === country
                                ? 'gradient-bg text-white border-primary shadow-md'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/20'
                            }`}
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Target City</label>
                      <div className="relative">
                        <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={16} />
                        <input type="text" placeholder="e.g. London" value={formData.location.city}
                          onChange={(e) => setFormData({...formData, location: {...formData.location, city: e.target.value}})}
                          className="w-full bg-background text-foreground text-xs font-semibold rounded-xl pl-12 pr-5 py-4 outline-none border border-border/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 shadow-sm placeholder:text-muted-foreground/40 placeholder:font-normal" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all shadow-lg shadow-primary/20 tracking-widest uppercase hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      LOCK COORDINATES
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: The Edge */}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">The Edge</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">Your "Unfair Advantage" in the market.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Unique Selling Point</label>
                      <textarea rows={3} placeholder="e.g. We use sustainable materials that last for a decade." value={formData.usp}
                        onChange={(e) => setFormData({...formData, usp: e.target.value})}
                        className="w-full bg-background text-foreground text-xs font-semibold rounded-xl px-5 py-4 outline-none border border-border/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 shadow-sm resize-none leading-relaxed placeholder:text-muted-foreground/40 placeholder:font-normal" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Competitor Social Handles (@)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={14} />
                          <input type="text" placeholder="@rival_one" 
                            value={formData.competitors[0] || ''}
                            onChange={(e) => {
                              const newCompetitors = [...formData.competitors];
                              newCompetitors[0] = e.target.value;
                              setFormData({...formData, competitors: newCompetitors});
                            }}
                            className="w-full bg-muted/30 text-foreground text-xs font-bold rounded-xl pl-10 pr-4 py-3 outline-none border border-border" />
                        </div>
                        <div className="relative">
                          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={14} />
                          <input type="text" placeholder="@rival_two" 
                            value={formData.competitors[1] || ''}
                            onChange={(e) => {
                              const newCompetitors = [...formData.competitors];
                              newCompetitors[1] = e.target.value;
                              setFormData({...formData, competitors: newCompetitors});
                            }}
                            className="w-full bg-muted/30 text-foreground text-xs font-bold rounded-xl pl-10 pr-4 py-3 outline-none border border-border" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase transition-all shadow-lg shadow-primary/20 tracking-widest hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      INITIATE BENCHMARKING
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Demographics */}
              {step === 5 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-tight">Demographics</h2>
                  <p className="text-muted-foreground text-sm mb-6 font-medium italic">Target persona mapping.</p>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 px-1">Audience Type</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {['Students & Young Adults', 'Working Professionals', 'Parents & Families', 'Business Owners'].map(group => {
                          const isSelected = formData.targetAudiences.includes(group);
                          return (
                            <div key={group} onClick={() => {
                              const next = isSelected 
                                ? formData.targetAudiences.filter(a => a !== group)
                                : [...formData.targetAudiences, group];
                              setFormData({...formData, targetAudiences: next});
                            }}
                              className={`px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center ${
                                isSelected ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30 shadow-sm shadow-primary/[0.05]' : 'border-border/70 bg-card hover:border-primary/20 hover:bg-primary/[0.02]'
                              }`}>
                              <div className={`w-3.5 h-3.5 rounded-sm border-2 mr-3 flex items-center justify-center transition-all ${isSelected ? 'border-primary gradient-bg' : 'border-border'}`}>
                                {isSelected && <Check size={10} className="text-white" strokeWidth={5} />}
                              </div>
                              <span className={`text-xs font-black uppercase tracking-tighter ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{group}</span>
                            </div>
                          );
                        })}

                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Age Span</label>
                        <select value={formData.ageRange} onChange={(e) => setFormData({...formData, ageRange: e.target.value})}
                          className="w-full bg-muted/30 text-foreground text-xs font-bold rounded-xl px-4 py-3.5 outline-none border border-border appearance-none cursor-pointer">
                          <option value="">Select</option>
                          <option value="18-24">18 – 24</option>
                          <option value="25-34">25 – 34</option>
                          <option value="35-44">35 – 44</option>
                          <option value="45+">45+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Gender Focus</label>
                        <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                          {['All', 'Male', 'Female'].map(g => (
                            <button key={g} onClick={() => setFormData({...formData, genderFocus: g})}
                              className={`flex-grow py-2 rounded-lg text-xs font-black transition-all ${
                                formData.genderFocus === g ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted-foreground/50'
                              }`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase shadow-lg shadow-primary/20 tracking-widest hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      CALIBRATE REACH
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Psychology */}
              {step === 6 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Psychology</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">What is the problem we are solving?</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Customer Pain Point</label>
                      <textarea rows={6} placeholder="Describe the struggle your audience faces..." value={formData.painPoint}
                        onChange={(e) => setFormData({...formData, painPoint: e.target.value})}
                        className="w-full bg-background text-foreground text-xs font-semibold rounded-2xl px-6 py-5 outline-none border border-border/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 shadow-sm resize-none leading-relaxed placeholder:text-muted-foreground/40 placeholder:font-normal" />
                    </div>
                    <div className="flex items-center space-x-3 px-2">
                      <Sparkle size={14} className="text-primary" />
                      <p className="text-xs text-muted-foreground/80 font-bold leading-relaxed uppercase tracking-widest">AI Agent uses this for Empathy Mapping</p>
                    </div>
                  </div>

                  <div className="mt-10">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase shadow-lg shadow-primary/20 tracking-widest hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      GENERATE SOLUTIONS
                    </button>
                  </div>
                </div>
              )}

              {/* Step 7: Personality */}
              {step === 7 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Personality</h2>
                  <p className="text-muted-foreground text-base mb-6 font-medium italic">The brand's vocal signature.</p>
                  
                  <div className="space-y-2.5">
                    {[
                      { id: 'Warm & Friendly', sub: 'Kind and supportive.', icon: Heart },
                      { id: 'Professional & Clean', sub: 'Direct and efficient.', icon: ShieldCheck },
                      { id: 'Fun & Energetic', sub: 'Exciting and humorous.', icon: Zap },
                      { id: 'Inspirational', sub: 'Uplifting and powerful.', icon: Rocket },
                      { id: 'Luxury & Premium', sub: 'Sophisticated and exclusive.', icon: Star }
                    ].map(tone => (
                      <div key={tone.id} onClick={() => setFormData({...formData, brandTone: tone.id})}
                        className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all ${
                          formData.brandTone === tone.id ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30 shadow-sm shadow-primary/[0.05]' : 'border-border/70 bg-card hover:border-primary/20 hover:bg-primary/[0.02]'
                        }`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mr-4 transition-all ${formData.brandTone === tone.id ? 'gradient-bg text-white shadow-md' : 'bg-card shadow-sm text-muted-foreground/50'}`}>
                          <tone.icon size={16} />
                        </div>
                        <div>
                          <h4 className={`text-xs font-black uppercase tracking-tight ${formData.brandTone === tone.id ? 'text-foreground' : 'text-muted-foreground'}`}>{tone.id}</h4>
                          <p className="text-[11px] text-muted-foreground/80 font-medium">{tone.sub}</p>
                        </div>
                        {formData.brandTone === tone.id && <Check size={16} className="ml-auto text-primary stroke-[3] animate-in zoom-in duration-300" />}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase transition-all shadow-lg shadow-primary/20 tracking-widest hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      SAVE VOCAL SIGNATURE
                    </button>
                  </div>
                </div>
              )}

              {/* Step 8: Visual Vibe */}
              {step === 8 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Visual Vibe</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">Establishing the aesthetic DNA.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Select A Vibe</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'Minimalist', icon: Box },
                          { id: 'Vibrant', icon: Palette },
                          { id: 'Luxury', icon: Diamond },
                          { id: 'Edgy', icon: Zap }
                        ].map(vibe => (
                          <div key={vibe.id} onClick={() => setFormData({...formData, visualVibe: vibe.id})}
                            className={`py-6 rounded-xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center group ${
                              formData.visualVibe === vibe.id ? 'gradient-bg text-white border-primary shadow-lg' : 'bg-muted/40 text-muted-foreground border-border hover:border-border'
                            }`}>
                            <vibe.icon size={20} className={`mb-2 transition-colors ${formData.visualVibe === vibe.id ? 'text-white' : 'text-muted-foreground/50 group-hover:text-primary/40'}`} />
                            <span className="text-xs font-black uppercase tracking-widest">{vibe.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Brand Keywords</label>
                      <input type="text" placeholder="e.g. Sustainable, Authentic, Bold..." value={formData.brandKeywords}
                        onChange={(e) => setFormData({...formData, brandKeywords: e.target.value})}
                        className="w-full bg-muted/30 text-foreground text-xs font-bold rounded-xl px-5 py-4 outline-none border border-border transition-all" />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Brand Colors</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Primary Color</label>
                          <div className="flex items-center gap-3 p-2 bg-muted/20 rounded-xl border border-border/50 group hover:border-primary/30 transition-all">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50 shadow-inner shrink-0 shadow-black/10">
                              <input 
                                type="color" 
                                value={formData.primaryColor} 
                                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                                className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer bg-transparent border-0 p-0" 
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <input 
                                 type="text" 
                                 placeholder="#000000" 
                                 value={formData.primaryColor}
                                 onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                                 className="w-full bg-transparent text-foreground text-[10px] font-black outline-none uppercase tracking-widest" 
                               />
                               <span className="text-[7px] font-black text-muted-foreground uppercase opacity-50">Pick Color</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Secondary Color</label>
                          <div className="flex items-center gap-3 p-2 bg-muted/20 rounded-xl border border-border/50 group hover:border-primary/30 transition-all">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50 shadow-inner shrink-0 shadow-black/10">
                              <input 
                                type="color" 
                                value={formData.secondaryColor} 
                                onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                                className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer bg-transparent border-0 p-0" 
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <input 
                                 type="text" 
                                 placeholder="#000000" 
                                 value={formData.secondaryColor}
                                 onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                                 className="w-full bg-transparent text-foreground text-[10px] font-black outline-none uppercase tracking-widest" 
                               />
                               <span className="text-[7px] font-black text-muted-foreground uppercase opacity-50">Pick Color</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Brand Logo (Optional)</label>
                      <div className="border-2 border-dashed border-border/80 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group">
                        {formData.logo ? (
                          <div className="flex flex-col items-center">
                            <img src={formData.logo} alt="Brand Logo" className="max-h-16 object-contain mb-3" />
                            <p className="text-xs font-bold text-foreground">Change Logo</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                              <Camera size={18} className="text-muted-foreground/60 group-hover:text-primary" />
                            </div>
                            <p className="text-xs font-bold text-foreground">Upload Logo</p>
                            <p className="text-[10px] font-medium text-muted-foreground mt-1">SVG, PNG, or JPG (max 2MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold transition-all uppercase tracking-widest hover:opacity-90">
                      CONFIRM AESTHETIC
                    </button>
                  </div>
                </div>
              )}

              {/* Step 9: Format Strategy */}
              {step === 9 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Format Strategy</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">Content vehicles of choice (Multi-select).</p>
                  
                  <div className="space-y-3">
                    {[
                      { id: 'Reels', icon: Camera },
                      { id: 'Static Posts', icon: FileText },
                      { id: 'Carousels', icon: Layers },
                      { id: 'Story Polls', icon: MessageSquare }
                    ].map(type => (
                      <div key={type.id} onClick={() => {
                        const next = formData.contentTypes.includes(type.id) ? formData.contentTypes.filter(t => t !== type.id) : [...formData.contentTypes, type.id];
                        setFormData({...formData, contentTypes: next});
                      }}
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                          formData.contentTypes.includes(type.id) ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30 shadow-sm shadow-primary/[0.05]' : 'border-border/70 bg-card hover:border-primary/20 hover:bg-primary/[0.02]'
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 ${formData.contentTypes.includes(type.id) ? 'gradient-bg text-white' : 'bg-card shadow-sm text-muted-foreground/50'}`}>
                          <type.icon size={16} />
                        </div>
                        <span className={`text-xs font-black uppercase tracking-tight ${formData.contentTypes.includes(type.id) ? 'text-foreground' : 'text-muted-foreground'}`}>{type.id}</span>
                        <div className={`ml-auto w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                          formData.contentTypes.includes(type.id) ? 'gradient-bg border-primary' : 'border-border'
                        }`}>
                          {formData.contentTypes.includes(type.id) && <Check size={12} className="text-white" strokeWidth={5} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase transition-all shadow-lg shadow-primary/20 tracking-widest hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      FINALIZE VEHICLES
                    </button>
                  </div>
                </div>
              )}

              {/* Step 10: Growth Logistics */}
              {step === 10 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Growth Logistics</h2>
                  <p className="text-muted-foreground text-base mb-8 font-medium italic">Rhythm and analytics baseline.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Posting Frequency</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Daily', '3-4x / wk', 'Once / wk'].map(freq => (
                          <button key={freq} onClick={() => setFormData({...formData, postingFrequency: freq})}
                            className={`py-3.5 rounded-xl text-[11px] font-black uppercase transition-all border ${
                              formData.postingFrequency === freq ? 'gradient-bg text-white border-primary shadow-md' : 'bg-card text-muted-foreground border-border'
                            }`}>
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-muted/50 p-6 rounded-2xl border border-border">
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 text-center">Baseline Metrics</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Followers</span>
                          <input type="number" placeholder="0" value={formData.analytics.followers}
                            onChange={(e) => setFormData({...formData, analytics: {...formData.analytics, followers: e.target.value}})}
                            className="w-full bg-card text-foreground text-lg font-black outline-none px-4 py-2 rounded-xl shadow-sm border border-border" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Reach</span>
                          <input type="number" placeholder="0" value={formData.analytics.reach}
                            onChange={(e) => setFormData({...formData, analytics: {...formData.analytics, reach: e.target.value}})}
                            className="w-full bg-card text-foreground text-lg font-black outline-none px-4 py-2 rounded-xl shadow-sm border border-border" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button onClick={handleNext} className="w-full gradient-bg text-white rounded-xl py-4 text-sm font-bold uppercase transition-all shadow-lg shadow-primary/20 tracking-widest flex items-center justify-center hover:shadow-xl hover:shadow-primary/25 hover:brightness-110">
                      LAUNCH DNA SYNTHESIS <Sparkles size={14} className="ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 11: Synthesis */}
              {step === 11 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col h-full py-4">
                  {analyzingProgress < 5 ? (
                    <div className="flex flex-col items-center justify-center flex-grow py-8">
                      <div className="relative mb-10 scale-90 md:scale-100">
                        <div className="w-20 h-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center animate-pulse">
                          <Zap size={32} className="text-primary" fill="currentColor" />
                        </div>
                        <div className="absolute -inset-2 border-2 border-dashed border-primary/20 rounded-[2rem] animate-spin" style={{ animationDuration: '8s' }}></div>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">Synthesizing Profile</h2>
                      <p className="text-muted-foreground text-xs font-medium mb-10 italic">Mapping {formData.brandName || 'your brand'} context...</p>

                      <div className="w-full space-y-4 px-6 md:px-0">
                        {[
                          { t: 'Ingesting Context', s: `Calibrating ${formData.businessCategory || 'business'} parameters...` },
                          { t: 'Psychology Mapping', s: `Addressing focus: "${(formData.painPoint || 'customer needs').substring(0, 25)}..."` },
                          { t: 'Voice Signature', s: `Applying ${formData.brandTone || 'custom'} modulation...` },
                          { t: 'Strategic Loop', s: `${formData.postingFrequency || 'Scheduled'} publishing window active.` }
                        ].map((item, idx) => (
                          <div key={idx} className={`flex items-center space-x-4 transition-all duration-700 ${analyzingProgress >= idx ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${analyzingProgress > idx ? 'bg-emerald-500' : analyzingProgress === idx ? 'bg-primary animate-ping' : 'bg-muted'}`}></div>
                            <div>
                              <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">{item.t}</h4>
                              <p className="text-[11px] text-muted-foreground font-bold">{item.s}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full animate-in zoom-in-95 duration-500 py-2">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto text-primary shadow-lg border border-primary/20 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-primary/20 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full blur-xl" />
                           <Check size={32} strokeWidth={3} className="relative z-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground tracking-tight">System Optimized</h2>
                        <p className="text-muted-foreground text-[10px] font-black mt-1 uppercase tracking-[0.3em] opacity-60">Brand DNA Synthesis v1.0</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mb-6">
                        {/* Summary Card */}
                        <div className="bg-card rounded-[2.5rem] p-8 text-foreground relative border border-border/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                            <Zap size={140} />
                          </div>
                          
                          <div className="flex items-center gap-3 mb-6">
                            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                              Identity Verified
                            </div>
                            <div className="h-px flex-1 bg-border/50" />
                          </div>

                           <h3 className="text-2xl font-bold text-foreground leading-tight mb-6">
                            {formData.brandName || 'Untitled Brand'} is ready for <span className="text-primary italic">creative velocity</span>.
                          </h3>

                          <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                              { label: 'Archetype', value: formData.brandTone || 'Pro', icon: Heart },
                              { label: 'Aesthetic', value: formData.visualVibe || 'Clean', icon: Palette },
                              { label: 'Pace', value: formData.postingFrequency || 'Daily', icon: Clock }
                            ].map((stat, i) => (
                              <div key={i} className="bg-muted/30 rounded-2xl p-4 border border-border/50 transition-all hover:border-primary/30">
                                <stat.icon size={12} className="text-primary mb-2 opacity-60" />
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-xs font-bold text-foreground truncate">{stat.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="bg-primary/5 rounded-[1.5rem] p-6 border border-primary/15 relative">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Brand Blueprint Context</p>
                              <Target size={14} className="text-primary" />
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Target Audiences</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.targetAudiences.length > 0 ? formData.targetAudiences.map(ta => (
                                    <span key={ta} className="px-2 py-1 rounded-md bg-background border border-border text-[10px] font-bold text-foreground shadow-sm">{ta}</span>
                                  )) : <span className="text-[10px] font-bold text-muted-foreground">None selected</span>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Content Formats</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.contentTypes.length > 0 ? formData.contentTypes.map(ct => (
                                    <span key={ct} className="px-2 py-1 rounded-md bg-background border border-border text-[10px] font-bold text-foreground shadow-sm">{ct}</span>
                                  )) : <span className="text-[10px] font-bold text-muted-foreground">None selected</span>}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-primary/10">
                                <div>
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Baseline Followers</p>
                                  <p className="text-xs font-bold text-foreground">{formData.analytics.followers || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Brand Keywords</p>
                                  <p className="text-xs font-bold text-foreground truncate">{formData.brandKeywords || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 pt-8 border-t border-border/50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Engine Hot</span>
                            </div>
                            <button
                              disabled={isSubmitting}
                              onClick={async () => {
                                setIsSubmitting(true);
                                try {
                                  const searchParams = new URLSearchParams(window.location.search);
                                  const isNewBrand = searchParams.get('new_brand') === 'true';

                                  const token = localStorage.getItem('token');
                                  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
                                  const res = await fetch(`${BASE_URL}/profile`, {
                                    method: 'POST',
                                    headers: { 
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ ...formData, createNewBrand: isNewBrand })
                                  });
                                  if (!res.ok) throw new Error('Failed to save profile');

                                  // Sequentially register auto-extracted products from website scan if present
                                  if (extractedProducts && extractedProducts.length > 0) {
                                    for (const prod of extractedProducts) {
                                      try {
                                        await fetch(`${BASE_URL}/products`, {
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
                                        console.error('Failed to auto-save product during onboarding:', prodErr);
                                      }
                                    }
                                  }

                                  try {
                                    localStorage.setItem('syncsocio_profile', JSON.stringify({ ...formData, logo: '' }));
                                  } catch (storageErr) {
                                    console.warn('Could not save profile to localStorage:', storageErr);
                                  }
                                  window.location.href = isNewBrand ? "/dashboard" : "/setup";
                                } catch (err) {
                                  console.error(err);
                                  try {
                                    localStorage.setItem('syncsocio_profile', JSON.stringify({ ...formData, logo: '' }));
                                  } catch (storageErr) {
                                    console.warn('Could not save profile to localStorage:', storageErr);
                                  }
                                  const searchParams = new URLSearchParams(window.location.search);
                                  const isNewBrand = searchParams.get('new_brand') === 'true';
                                  window.location.href = isNewBrand ? "/dashboard" : "/setup";
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className={`gradient-bg text-white px-8 py-4 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" /> Launching...
                                </>
                              ) : (
                                <>
                                  Launch Dashboard <ArrowRight size={14} strokeWidth={3} />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
