import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, Heart, Activity, ArrowUpRight, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  TrendingUp: TrendingUp,
  Eye: Eye,
  Heart: Heart,
  Activity: Activity,
};

let cachedSummaryData: any = null;

const DashboardHome = () => {
  const [data, setData] = useState<any>(cachedSummaryData);
  const [loading, setLoading] = useState(!cachedSummaryData);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {data.metrics?.map((m: any, i: number) => {
          const Icon = iconMap[m.icon] || TrendingUp;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="group hover-lift cursor-default border-border/50 overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardContent className="p-4 sm:p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-[1.05] transition-transform duration-500">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-0.5 px-2 py-1 rounded-full bg-emerald-500/10">
                      {m.change} <ArrowUpRight size={11} />
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

      {/* Two columns */}
      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Agent Activity */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={14} />
                </div>
                <CardTitle className="text-base">Agent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-1 max-h-[380px] overflow-y-auto pr-2 scrollbar-hide">
              {data.activities?.map((a: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
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

        {/* Quick Stats */}
        <motion.div className="lg:col-span-2 space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {/* Top Post */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔥</span>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Top Post This Week</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {data.topPost ? (
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent aspect-video flex items-center justify-center mb-3 overflow-hidden shadow-inner relative">
                    {data.topPost.image ? (
                      <img src={data.topPost.image} alt="Top Post" className="w-full h-full object-cover" />
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
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent aspect-video flex items-center justify-center mb-3 overflow-hidden shadow-inner">
                    <span className="text-4xl text-primary opacity-20">🎬</span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-2 mb-2 font-medium">"5 baking secrets nobody tells you — save this reel! 🍞"</p>
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-muted font-medium">2.1K views</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted font-medium">186 likes</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted font-medium">8.2%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Content Mix */}
          <Card className="border-border/50">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Content Mix This Week</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex-1 h-3 rounded-full bg-slate-50 overflow-hidden flex gap-0.5 border border-slate-100">
                  <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} transition={{ delay: 0.6, duration: 0.8 }} className="bg-primary h-full rounded-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: '35%' }} transition={{ delay: 0.8, duration: 0.8 }} className="bg-primary/50 h-full rounded-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: '25%' }} transition={{ delay: 1, duration: 0.8 }} className="bg-primary/25 h-full rounded-full" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Reels 40%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/50" /> Static 35%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/25" /> Carousel 25%</span>
              </div>
            </CardContent>
          </Card>

          {/* Agent Recommendation */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Agent Recommendation</p>
              </div>
              <p className="text-[11px] text-foreground leading-relaxed italic font-medium">
                Reels are outperforming static 4x. Agent has shifted your content mix to 70% Reels going forward.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardHome;