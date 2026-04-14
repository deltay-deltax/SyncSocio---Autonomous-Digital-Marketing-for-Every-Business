import { motion } from 'framer-motion';
import { Target, TrendingUp, Users, Clock, IndianRupee, Sparkles, Rocket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const recommendations = [
  {
    emoji: '🎬',
    caption: '5 baking secrets nobody tells you — save this reel! 🍞',
    engagement: '8.2%',
    reasoning: 'This post is outperforming your average by 3.4x — ideal for boosting',
    budget: '₹500',
    duration: '3 days',
    reach: '8,000-12,000',
    audience: 'Foodies · Bangalore · 22-38',
  },
  {
    emoji: '🎬',
    caption: 'Morning bake routine — peaceful ASMR edition ☀️',
    engagement: '9.1%',
    reasoning: 'Highest engagement reel this week — strong boost candidate',
    budget: '₹750',
    duration: '5 days',
    reach: '12,000-18,000',
    audience: 'Foodies · India · 20-35',
  },
];

const DashboardAds = () => {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Rocket size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">Boost Recommendations</h2>
        </div>
        <p className="text-sm text-muted-foreground">Agent identified posts worth promoting</p>
      </div>

      {recommendations.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-20 text-center">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-sm text-muted-foreground">Agent will recommend posts to boost once engagement data comes in</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="hover-lift border-border/50 overflow-hidden group">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-5">
                    {/* Post preview */}
                    <div className="w-full lg:w-28 h-28 rounded-2xl bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center text-4xl shrink-0 group-hover:scale-[1.02] transition-transform duration-300">
                      {rec.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-sm font-semibold text-foreground">{rec.caption}</p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600">
                        <TrendingUp size={12} /> {rec.engagement} engagement
                      </span>
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                        <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground leading-relaxed">{rec.reasoning}</p>
                      </div>
                    </div>

                    {/* Details + CTA */}
                    <div className="lg:w-56 shrink-0 space-y-3">
                      <div className="space-y-2.5 text-xs p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5"><IndianRupee size={12} /> Budget</span>
                          <span className="font-bold text-foreground">{rec.budget}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Clock size={12} /> Duration</span>
                          <span className="font-bold text-foreground">{rec.duration}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Target size={12} /> Est. reach</span>
                          <span className="font-bold text-foreground">{rec.reach}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Users size={12} /> Audience</span>
                          <span className="font-bold text-foreground text-right">{rec.audience}</span>
                        </div>
                      </div>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-xs h-10 rounded-xl shadow-lg shadow-primary/20">
                        Approve Boost →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardAds;
