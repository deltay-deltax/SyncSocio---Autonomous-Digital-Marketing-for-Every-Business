import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, Heart, Activity, ArrowUpRight, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const ranges = ['This Week', 'This Month', 'All Time'];

const metrics = [
  { label: 'Posts This Month', value: '12', change: '+3', icon: TrendingUp, gradient: 'from-primary/15 to-primary/5' },
  { label: 'Reach This Week', value: '4,200', change: '+18%', icon: Eye, gradient: 'from-emerald-500/15 to-emerald-500/5' },
  { label: 'Likes This Week', value: '312', change: '+24%', icon: Heart, gradient: 'from-rose-500/15 to-rose-500/5' },
  { label: 'Engagement Rate', value: '6.2%', change: '+0.8%', icon: Activity, gradient: 'from-amber-500/15 to-amber-500/5' },
];

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  reach: Math.floor(Math.random() * 400) + (i >= 18 && i <= 21 ? 600 : 50),
  peak: i === 20,
}));

const postBreakdown = [
  { post: '5 baking secrets...', type: 'Reel', reach: '2.1K', likes: '186', engagement: '8.2%', posted: '2h ago' },
  { post: 'Morning bake routine...', type: 'Reel', reach: '3.2K', likes: '290', engagement: '9.1%', posted: '3d ago' },
  { post: 'Flour to focaccia...', type: 'Carousel', reach: '1.4K', likes: '128', engagement: '5.6%', posted: '2d ago' },
  { post: 'Sourdough starter...', type: 'Static', reach: '890', likes: '94', engagement: '4.1%', posted: '1d ago' },
  { post: 'Cinnamon rolls...', type: 'Static', reach: '670', likes: '72', engagement: '3.8%', posted: '4d ago' },
];

const insights = [
  'Reels consistently outperform static posts by 4x in reach',
  'Posting between 7-9 PM drives 62% of your weekly engagement',
  'Carousel posts have the highest save rate at 3.2%',
  'Your audience is most active on Wednesday and Saturday',
  'Food process videos get 2.8x more shares than finished product shots',
];

const DashboardAnalytics = () => {
  const [range, setRange] = useState('This Week');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground">Analytics</h2>
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="group hover-lift border-border/50 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <m.icon size={16} className="text-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10">{m.change} <ArrowUpRight size={10} /></span>
                </div>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hourly Reach — Best day this week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="reach" radius={[6, 6, 0, 0]}>
                    {hourlyData.map((entry, i) => (
                      <Cell key={i} fill={entry.peak ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.2)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">⚡ Peak engagement: 8PM — agent posts at this time</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom two columns */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Post Table */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Per Post Breakdown</CardTitle>
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
                    {postBreakdown.map((p, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-foreground max-w-[150px] truncate font-medium">{p.post}</td>
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

        {/* Agent Insights */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <CardTitle className="text-sm">What your agent learned</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3">
                {insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;
