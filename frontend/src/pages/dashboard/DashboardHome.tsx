import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Eye, Heart, Activity, ArrowUpRight, Sparkles, Zap, X, Send, Package, MessageSquare, Plus, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';

interface IconProps {
  size?: number;
  className?: string;
}

const InstagramIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const iconMap: Record<string, any> = {
  TrendingUp: TrendingUp,
  Eye: Eye,
  Heart: Heart,
  Activity: Activity,
};

let cachedSummaryData: any = null;

const DashboardHome = () => {
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const navigate = useNavigate();
  const [data, setData] = useState<any>(cachedSummaryData);
  const [loading, setLoading] = useState(!cachedSummaryData);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback 
        title="Connect Instagram to View Analytics" 
        description="SyncSocio needs a connected Instagram account to analyze your profile performance and generate your dashboard summary."
      />
    );
  }

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const res = await fetch(`${API_BASE}/dashboard/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const summaryData = await res.json();
          cachedSummaryData = summaryData;
          setData(summaryData);
          setError(null);
        } else if (res.status === 401 && isMounted) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        } else if (isMounted) {
          setError(`Server responded with ${res.status}`);
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
        if (!cachedSummaryData && isMounted) setError('Connection failed');
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
  }, []);

  if (loading && !data) {
     return (
        <div className="h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Dashboard</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waking up Agent Operations...</p>
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
      label: 'Active DM Flows',
      value: workspaceStats.totalFlows.toString(),
      desc: 'Automated comment flows',
      icon: MessageSquare,
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

      {/* Two columns */}
      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Agent Activity */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50 h-full flex flex-col">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={14} />
                </div>
                <CardTitle className="text-base">Recent Agent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-1 overflow-y-auto pr-2 scrollbar-hide flex-1 max-h-[380px]">
              {data.activities?.map((a: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-4 p-3.5 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="relative mt-1">
                    <span className={`block w-2.5 h-2.5 rounded-full ${
                      a.status === 'done' ? 'bg-emerald-500' :
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
                <Plus size={14} className="mr-2" /> Create SaaS Strategy Creative
              </Button>
              <Button 
                onClick={() => navigate('/dashboard/dms')} 
                variant="outline"
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold border-border hover:bg-muted hover:text-black bg-card text-muted-foreground"
              >
                <MessageSquare size={14} className="mr-2 text-primary" /> Configure DM Automations
              </Button>
              <Button 
                onClick={() => navigate('/dashboard/strategy')} 
                variant="outline"
                className="w-full justify-start rounded-xl py-5 text-xs font-semibold border-border hover:bg-muted hover:text-black bg-card text-muted-foreground"
              >
                <Send size={14} className="mr-2 text-primary" /> Manage Campaign Recipients
              </Button>
            </CardContent>
          </Card>

          {/* Platform Status */}
          <Card className="border-border/50 overflow-hidden relative">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Globe size={14} />
                </div>
                <CardTitle className="text-base">Platform Connections</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              {/* Instagram API */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
                    <InstagramIcon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Instagram Graph API</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">@{profile?.instagramUsername || 'connected'}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              </div>

              {/* WhatsApp sandbox gateway */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    WA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">WhatsApp Sandbox</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Sandbox Campaign Gateway</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Ready
                </span>
              </div>

              {/* Email SMTP relay */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                    @
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Email SMTP Server</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">smtp.gmail.com</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Connected
                </span>
              </div>
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