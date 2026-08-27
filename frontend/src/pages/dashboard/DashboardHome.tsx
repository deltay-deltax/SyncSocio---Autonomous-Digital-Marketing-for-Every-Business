import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Eye, Heart, Activity, ArrowUpRight, Sparkles, Zap, X, Send, Package, BarChart2, Plus, Globe, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { FESTIVALS_2026 } from '@/components/FestivalCalendar';

const getNextFestival = (country?: string) => {
  const todayStr = new Date().toISOString().split('T')[0];
  let validFestivals = FESTIVALS_2026;
  
  if (country && country.toLowerCase() !== 'india' && country.toLowerCase() !== 'nepal') {
    validFestivals = FESTIVALS_2026.filter((f) => !['hindu', 'regional', 'national'].includes(f.type));
  }

  const sorted = [...validFestivals].sort((a, b) => a.date.localeCompare(b.date));
  let next = sorted.find(f => f.date >= todayStr);
  if (!next) next = sorted[0];
  return next;
};

interface IconProps {
  size?: number;
  className?: string;
}

const InstagramIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
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

const iconMap: Record<string, any> = {
  TrendingUp: TrendingUp,
  Eye: Eye,
  Heart: Heart,
  Activity: Activity,
};

const summaryCache: Record<string, any> = {};

const DashboardHome = () => {
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const navigate = useNavigate();
  const brandId = profile?._id || 'default';
  const [data, setData] = useState<any>(summaryCache[brandId] || null);
  const [loading, setLoading] = useState(!summaryCache[brandId]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset data when brand switches
    if (!summaryCache[brandId]) {
      setData(null);
      setLoading(true);
    } else {
      setData(summaryCache[brandId]);
      setLoading(false);
    }

    const fetchSummary = async () => {
      try {
        
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const res = await fetch(`${API_BASE}/dashboard/summary`, { credentials: 'include',
          headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
        });
        if (res.ok && isMounted) {
          const _rawJson66 = await res.json();
            const summaryData = _rawJson66 && _rawJson66.success !== undefined ? (_rawJson66.success ? _rawJson66.data : _rawJson66) : _rawJson66;
          summaryCache[brandId] = summaryData;
          setData(summaryData);
          setError(null);
        } else if (res.status === 401 && isMounted) {
          
          window.location.href = '/login';
        } else if (isMounted) {
          setError(`Server responded with ${res.status}`);
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
        if (!summaryCache[brandId] && isMounted) setError('Connection failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();

    // Background auto-polling every 60 seconds for live data
    const intervalId = setInterval(() => {
      fetchSummary();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [brandId]);


  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Workspace Operational Stats Skeleton */}
        <div>
          <div className="w-48 h-4 bg-muted rounded mb-3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[120px] rounded-xl bg-muted/60 border border-border/50"></div>
            ))}
          </div>
        </div>

        {/* Social Channel Metrics Skeleton */}
        <div>
          <div className="w-48 h-4 bg-muted rounded mb-3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[120px] rounded-xl bg-muted/60 border border-border/50"></div>
            ))}
          </div>
        </div>

        {/* Two columns Skeleton */}
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="lg:col-span-3 h-[400px] rounded-xl bg-muted/60 border border-border/50"></div>
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="h-[200px] rounded-xl bg-muted/60 border border-border/50"></div>
            <div className="h-[200px] rounded-xl bg-muted/60 border border-border/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-border/50 shadow-sm animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
          <Zap size={32} />
        </div>
        <h3 className="text-lg font-bold mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm text-muted-foreground mb-6">{error || 'Something went wrong'}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl px-8 uppercase text-[10px] font-black tracking-widest">
          Retry Sync
        </Button>
      </div>
    );
  }

  const workspaceStats = data?.workspaceStats || { totalCreatives: 0, totalPosted: 0, totalProducts: 0, totalFlows: 0 };

  const workspaceMetrics = [
    {
      label: 'AI Creatives',
      value: workspaceStats.totalCreatives.toString(),
      desc: 'Saved & Draft assets',
      icon: Sparkles,
      gradient: 'from-violet-500/15 to-violet-500/5',
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    {
      label: 'Posted to Socials',
      value: workspaceStats.totalPosted.toString(),
      desc: 'Published campaigns',
      icon: Send,
      gradient: 'from-emerald-500/15 to-emerald-500/5',
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Total Products',
      value: workspaceStats.totalProducts.toString(),
      desc: 'Total registered products',
      icon: Package,
      gradient: 'from-teal-500/15 to-teal-500/5',
      iconColor: 'text-teal-500',
      bgColor: 'bg-teal-500/10'
    },
    {
      label: 'Scheduled Posts',
      value: workspaceStats.totalFlows?.toString() || '0',
      desc: 'Queued for publishing',
      icon: BarChart2,
      gradient: 'from-blue-500/15 to-blue-500/5',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Operational Stats */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 px-1">Workspace Operations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {workspaceMetrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover-lift cursor-default border-border/50 overflow-hidden relative bg-card">
                  <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <CardContent className="p-4 sm:p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105", m.bgColor)}>
                        <Icon size={16} className={m.iconColor} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-muted/60 px-2 py-0.5 rounded-md border border-border/30">
                        Operational
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{m.value}</p>
                    <p className="text-[11px] text-foreground font-semibold mt-1.5">{m.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-none opacity-80">{m.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Social Channel Metrics */}
      {profile?.instagramIsConnected && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 px-1">Social Channel Performance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {data.metrics?.map((m: any, i: number) => {
              const Icon = iconMap[m.icon] || TrendingUp;
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Card className="group hover-lift cursor-default border-border/50 overflow-hidden relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <CardContent className="p-4 sm:p-5 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-[1.05] transition-transform duration-500">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500/10">
                          {m.change} <ArrowUpRight size={10} />
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">{m.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Agent Activity */}
        <motion.div className="lg:col-span-3 h-fit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50 flex flex-col">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={14} />
                </div>
                <CardTitle className="text-base">Recent Agent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-1 overflow-y-auto pr-2 scrollbar-hide">
              {data.activities?.map((a: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-4 p-3.5 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="relative mt-1">
                    <span className={`block w-2.5 h-2.5 rounded-full ${a.status === 'done' ? 'bg-emerald-500' :
                      a.status === 'active' ? 'bg-primary' :
                        'bg-muted-foreground/20'
                      }`} />
                    {a.status === 'active' && <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-widest opacity-60">{a.time}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions & Platform Connections */}
        <motion.div className="lg:col-span-2 space-y-4 sm:space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {/* Workspace Status */}
          <Card className="border-border/50 overflow-hidden relative bg-card">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Globe size={14} />
                </div>
                <CardTitle className="text-base">Workspace Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              {/* Row 1: Connected Accounts */}
              <div
                onClick={() => navigate('/dashboard/settings?tab=Connected%20Accounts')}
                className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/40 hover-lift transition-all cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">Connected Channels</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Click to configure integrations</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Instagram Icon */}
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all",
                    profile?.instagramIsConnected
                      ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 shadow-md shadow-pink-500/25"
                      : "bg-slate-200 text-slate-400 grayscale opacity-800"
                  )}>
                    <InstagramIcon size={13} />
                  </div>


                  {/* WhatsApp Icon */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/dashboard/settings?tab=Connected%20Accounts');
                    }}
                    title="Configure WhatsApp Business"
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-[1.15] active:scale-95 cursor-pointer",
                      profile?.whatsappIsConnected
                        ? "bg-[#25D366] text-white shadow-sm shadow-green-500/25"
                        : "bg-slate-200 text-slate-400 grayscale opacity-60"
                    )}>
                    <WhatsAppIcon size={13} />
                  </div>

                  {/* Google Icon */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/dashboard/settings?tab=Email%20Setup');
                    }}
                    title="Configure Email Integrations"
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center bg-white border transition-all hover:scale-[1.15] active:scale-95",
                      (profile?.gmailIsConnected || profile?.use_generic_email_sender || profile?.email_domain_verified)
                        ? "border-border shadow-sm shadow-black/5"
                        : "grayscale opacity-60 bg-slate-100 border-slate-200"
                    )}>
                    <GoogleIcon size={13} />
                  </div>
                </div>
              </div>

              {/* Row 2: Number of credits used in last 7 days */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 cursor-default">
                <div>
                  <p className="text-xs font-bold text-foreground">Credits Consumed</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Used in the last 7 days</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-primary tracking-tight">
                    {data?.creditsUsedLast7Days ?? 0}
                  </span>
                  <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">
                    credits
                  </span>
                </div>
              </div>

              {/* Row 3: Coming up festival */}
              {(() => {
                const nextFest = getNextFestival(profile?.location?.country);
                return (
                  <div
                    onClick={() => navigate('/dashboard/strategy?mode=festival')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/40 hover-lift transition-all cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">Upcoming Festival</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Tap to generate festival campaigns</p>
                    </div>
                    {nextFest ? (
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
                        <span className="text-sm">{nextFest.emoji}</span>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary leading-tight">{nextFest.name}</p>
                          <p className="text-[8px] font-semibold text-muted-foreground leading-none mt-0.5">
                            {new Date(nextFest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">None scheduled</span>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
                return (!planName ||
                  planName.includes('starter') ||
                  planName.includes('brand') ||
                  planName.includes('free') ||
                  planName === '');
              })() && (
                  <Button
                    onClick={() => navigate('/dashboard/settings?tab=Plan%20%26%20Billing')}
                    className="w-full rounded-xl py-5 text-xs font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-md shadow-primary/25 border-0 transition-all hover:scale-[1.02]"
                  >
                    <Zap size={14} className="mr-2 fill-white" /> Upgrade Plan
                  </Button>
                )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 overflow-hidden relative">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={14} />
                </div>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 grid grid-cols-1 gap-2.5">
              <Button
                onClick={() => navigate('/dashboard/strategy')}
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/25 border-0"
              >
                <Plus size={14} className="mr-2" /> Create  Strategy Creative
              </Button>
              <Button
                onClick={() => navigate('/dashboard/history')}
                variant="outline"
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold border-border hover:bg-muted hover:text-black bg-card text-muted-foreground"
              >
                <BarChart2 size={14} className="mr-2 text-primary" /> View Post History
              </Button>
              <Button
                onClick={() => navigate('/dashboard/strategy')}
                variant="outline"
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold border-border hover:bg-muted hover:text-black bg-card text-muted-foreground"
              >
                <Send size={14} className="mr-2 text-primary" /> Manage Campaign Recipients
              </Button>
              <Button
                onClick={() => navigate('/dashboard/buy-credits')}
                variant="outline"
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 bg-card text-muted-foreground transition-all duration-200"
              >
                <Coins size={14} className="mr-2 text-primary" /> Buy More Credits
              </Button>
            </CardContent>
          </Card>

          {/* Top Post */}
          {data.topPost && (
            <Card className="border-border/50 overflow-hidden bg-card">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Top Post This Week</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div
                  onClick={() => {
                    if (data.topPost.image) setPreviewUrl(data.topPost.image);
                  }}
                  className={cn("rounded-2xl bg-gradient-to-br from-primary/10 to-transparent aspect-video flex items-center justify-center mb-3 overflow-hidden shadow-inner relative group", data.topPost.image && "cursor-zoom-in")}
                >
                  {data.topPost.image ? (
                    <img src={data.topPost.image} alt="Top Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <span className="text-4xl text-primary opacity-20">📸</span>
                  )}
                </div>
                <p className="text-xs text-foreground line-clamp-2 mb-2 font-medium">"{data.topPost.caption}"</p>
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{data.topPost.views} views</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{data.topPost.likes} likes</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{data.topPost.engagement}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

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
                alt="Top Post Preview"
                className="w-full h-auto max-h-[80vh] object-contain max-w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardHome;