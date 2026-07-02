import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Eye, Heart, Activity, ArrowUpRight, ArrowDownRight, Brain, Zap, Target, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';

let cachedAnalyticsData: Record<string, any> = {};

const DashboardAnalytics = () => {
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const [data, setData] = useState<any>(cachedAnalyticsData['default'] || null);
  const [loading, setLoading] = useState(!cachedAnalyticsData['default']);
  const [error, setError] = useState<string | null>(null);

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback 
        title="Connect Instagram to View Analytics" 
        description="SyncSocio requires a linked Instagram Business account to track live metrics and audience insights."
        metaTesterStatus={profile?.metaTesterStatus}
      />
    );
  }

  useEffect(() => {
    let isMounted = true;

    if (cachedAnalyticsData['default']) {
      setData(cachedAnalyticsData['default']);
    }

    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        // Defaulting to 4-week context automatically on backend
        const res = await fetch(`${API_BASE}/instagram/metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok && isMounted) {
          cachedAnalyticsData['default'] = result.data;
          setData(result.data);
          setError(null);
        } else if (isMounted && !res.ok) {
          setError(result.message);
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        if (isMounted && !cachedAnalyticsData['default']) setError('Connection failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchMetrics();
    
    const intervalId = setInterval(fetchMetrics, 60000);
    
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
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Synchronizing Meta Data</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waking up Analytics Agent...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && (error.includes('Permission') || error.includes('Expired') || error.includes('RECONNECT') || error.includes('10'))) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[4rem] border-2 border-dashed border-slate-200 shadow-sm animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 mb-8 relative">
          <div className="absolute inset-0 bg-amber-500/10 rounded-[2.5rem] animate-ping opacity-30" />
          <Zap size={44} className="relative z-10" />
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 mb-3">Reconnect <span className="text-amber-500">Required</span></h2>
        <p className="text-slate-500 text-center max-w-md mb-10 font-medium leading-relaxed">
          Your Instagram session has expired or permissions (insights) are missing. 
          Please re-connect to fix this.
        </p>
        <Button 
          onClick={() => window.location.href = '/setup?step=1'}
          className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20"
        >
          Reconnect Instagram
        </Button>
      </div>
    );
  }

  const liveMetrics = [
    { label: 'Total Reach', value: data?.reach?.toLocaleString() || '0', change: data?.reachChange || 'Live', basis: 'Unique', icon: TrendingUp, gradient: 'from-primary/15 to-primary/5' },
    { label: 'Total Followers', value: data?.followers?.toLocaleString() || '0', change: data?.followersChange || 'Live', basis: 'Current', icon: Eye, gradient: 'from-emerald-500/15 to-emerald-500/5' },
    { label: 'Impressions', value: data?.impressions?.toLocaleString() || '0', change: data?.impressionsChange || 'Live', basis: 'Total', icon: Heart, gradient: 'from-rose-500/15 to-rose-500/5' },
    { label: 'Engagement Rate', value: data?.engagementRate || '0.0%', change: data?.engagementRateChange || 'Live', basis: 'Ratio', icon: Activity, gradient: 'from-amber-500/15 to-amber-500/5' },
  ];

  const hourlyData = data?.hourlyActivity && data.hourlyActivity.length > 0 
    ? data.hourlyActivity.map((d: any) => ({
        hour: d.hour,
        reach: d.active, // Map to reach so the chart config doesn't break
        peak: d.peak
      })) 
    : [];

  const postBreakdown = data?.postBreakdown && data.postBreakdown.length > 0 
    ? data.postBreakdown 
    : [];

  const agentLearnings = data?.agentLearnings || [];
  const neuralState = data?.neuralState || 'Idle';

  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'visual': return Eye;
      case 'timing': return Clock;
      case 'audience': return Target;
      case 'strategy': return Zap;
      case 'engagement': return Activity;
      default: return Brain;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground">Analytics</h2>
        
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-border/50 px-3 py-1.5 rounded-2xl shadow-sm">
          <div className="relative">
            <Brain size={14} className={cn("text-primary", neuralState !== 'Idle' && "animate-pulse")} />
            {neuralState !== 'Idle' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Agent Status: <span className="text-primary">{neuralState}</span>
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {liveMetrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="group hover-lift border-border/50 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <m.icon size={16} className="text-primary" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {m.basis}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
                    m.change?.startsWith('-') ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10"
                  )}>
                    {m.change} {m.change?.startsWith('-') ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                  </span>
                </div>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Reach Growth Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Average Reach per Post</CardTitle>
              <p className="text-[10px] text-muted-foreground">Quality comparison: Agent vs. Self Posted</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Self Posted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Agent Assisted</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Averages Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500/70 mb-1">Avg Self Reach (30D Avg)</p>
                  <p className="text-lg font-bold text-blue-600">{data?.weeklyGrowth?.avgSelfReach || 0}</p>
               </div>
               <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70 mb-1">Avg Agent Reach (30D Avg)</p>
                  <p className="text-lg font-bold text-emerald-600">{data?.weeklyGrowth?.avgAgentReach || 0}</p>
               </div>
            </div>

            <div className="h-64">
              {data?.weeklyGrowth?.history && data.weeklyGrowth.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weeklyGrowth.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="selfReach" 
                      name="Self Posted"
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="agentReach" 
                      name="Agent Assisted"
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-muted-foreground italic">
                  Calibrating neural growth telemetry...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Follower Growth Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Follower Growth</CardTitle>
              <p className="text-[10px] text-muted-foreground">Audience expansion (Last 30 Days)</p>
            </div>
            <div className="flex items-center gap-2">
               <span className={cn(
                 "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest",
                 (data?.newFollowersCount || 0) > 0 ? "text-emerald-500 bg-emerald-500/10" : 
                 (data?.newFollowersCount || 0) < 0 ? "text-rose-500 bg-rose-500/10" : 
                 "text-slate-400 bg-slate-100"
               )}>
                  {(data?.newFollowersCount || 0) > 0 ? '+' : ''}{data?.newFollowersCount || 0} followers { (data?.newFollowersCount || 0) > 0 ? 'gained' : (data?.newFollowersCount || 0) < 0 ? 'lost' : 'stable' }
               </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.followerGrowth && data.followerGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.followerGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#10b981" 
                      strokeWidth={4} 
                      dot={false}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-muted-foreground italic">
                  Analyzing follower telemetry...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audience Activity Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Audience Activity — Best Time to Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="reach" radius={[6, 6, 0, 0]}>
                      {hourlyData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.peak ? 'hsl(var(--primary))' : 'rgba(59, 130, 246, 0.2)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Not Enough Data</h3>
                  <p className="text-xs text-slate-500 max-w-[250px] leading-relaxed">
                    Need at least <span className="font-semibold text-slate-700">100 followers</span> to track online audience activity securely via the Graph API.
                  </p>
                </div>
              )}
            </div>
            {hourlyData.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 font-medium">⚡ Peak follower activity: {data?.peakHourText || '8 PM'} — agent will schedule future posts slightly before this time</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Agent Smartness Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/[0.03] to-transparent">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-violet-500" />
                <CardTitle className="text-sm font-bold">Agent Getting Smarter Over Time</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground">Neural optimization progress per post</p>
            </div>
            {(data?.agentSmartness?.improvement || 0) > 0 && (
              <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                  +{data.agentSmartness.improvement}% Efficiency
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.agentSmartness?.trend && data.agentSmartness.trend.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.agentSmartness.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="postIndex" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} unit="%" />
                    <Tooltip 
                      contentStyle={{ fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      name="Engagement Rate"
                      stroke="#8b5cf6" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-violet-500/[0.02] rounded-xl border border-dashed border-violet-500/10">
                   <Zap className="w-8 h-8 text-violet-300 animate-pulse" />
                   <p className="text-[11px] text-violet-500/70 font-medium italic max-w-[200px]">
                      Agent is still mapping your audience's neural response. Publish more posts to see optimization trend.
                   </p>
                </div>
              )}
            </div>
            {(data?.agentSmartness?.improvement || 0) > 0 && (
               <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-600">
                    <span className="font-bold text-violet-600 italic underline decoration-violet-500/30 underline-offset-2">Optimization Insight:</span> Engagement improved <span className="text-violet-700 font-black">{data.agentSmartness.improvement}%</span> since the agent started managing your content strategy.
                  </p>
               </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom two columns */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Post Table Breakdown */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Per Post Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Post</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Type</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Reach</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Likes</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Eng.</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postBreakdown.map((p: any, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-foreground max-w-[150px] truncate font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate">{p.post}</span>
                            {p.isAgentAssisted && (
                              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                                <Zap size={8} className="fill-emerald-500" /> Neural Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-semibold">{p.type}</span></td>
                        <td className="p-3 text-right text-foreground">{p.reach}</td>
                        <td className="p-3 text-right text-foreground">{p.likes}</td>
                        <td className="p-3 text-right text-foreground font-bold">{p.engagement}</td>
                        <td className="p-3 text-right text-muted-foreground">{p.posted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Strategic Insights */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent relative h-full overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <CardTitle className="text-sm font-bold">What your agent learned</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-4">
                {agentLearnings.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3 animate-pulse">
                      <Brain size={20} className="text-primary/40" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                      Initial Neural Mapping in progress... Complete 3 posts to see insights.
                    </p>
                  </div>
                ) : (
                  agentLearnings.map((l: any, i: number) => {
                    const Icon = getInsightIcon(l.category);
                    return (
                      <motion.li 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.5 + (i * 0.1) }}
                        className="group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white border border-primary/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                            <Icon size={14} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                                {l.category}
                              </span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">
                                {Math.round(l.confidence * 100)}% Confidence
                              </span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed font-medium">
                              {l.insight}
                            </p>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })
                )}
              </ul>
              {agentLearnings.length > 0 && (
                <div className="mt-6 pt-4 border-t border-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                           <div className="w-full h-full gradient-bg opacity-40" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Evolving strategy from {agentLearnings.length} data signals
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Live Raw Insights Section (Meta Sync) */}
      {data?.insights && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
           <Card className="border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold">Raw Meta Telemetry</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Direct feed from Instagram Graph API</p>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {data.insights.map((insight: any) => (
                            <div key={insight.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 truncate">{insight.name.replace('_', ' ')}</span>
                                <div className="text-xl font-bold text-slate-900">{insight.values[0].value}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardAnalytics;
