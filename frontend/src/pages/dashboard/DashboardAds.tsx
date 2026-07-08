import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Users, Clock, IndianRupee, Sparkles, Rocket, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOutletContext } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';

interface Recommendation {
  id: string;
  emoji: string;
  caption: string;
  engagement: string;
  reasoning: string;
  budget: string;
  duration: string;
  reach: string;
  audience: string;
  imageUrl?: string;
}

const DashboardAds = () => {
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextScan, setNextScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback 
        title="Connect Instagram to View Ad Recommendations" 
        description="SyncSocio needs a connected Instagram account to scan your top-performing organic posts and recommend high-ROI paid boost campaigns."
        metaTesterStatus={profile?.metaTesterStatus}
      />
    );
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/promotions/recommendations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        if (data.nextAnalysisAt) {
          setNextScan(new Date(data.nextAnalysisAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleBoost = (id: string) => {
    window.open('https://adsmanager.facebook.com/', '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Agent analyzing last 7 days of metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">Boost Recommendations</h2>
          </div>
          <p className="text-sm text-muted-foreground">AI identified high-ROI posts for your brand</p>
          {nextScan && (
             <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest mt-1">
               Strategic Refresh: {nextScan}
             </p>
          )}
        </div>
        <div className="hidden sm:block">
           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
             <Sparkles size={12} /> Ads Agent Active
           </span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <Card className="border-border/50 bg-white/50 backdrop-blur-sm">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <Target className="text-muted-foreground" size={28} />
             </div>
            <p className="text-lg font-bold text-foreground">No boost candidates yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">The Ads Agent only recommends posts with "Viral Momentum". Keep posting to find your next winner!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="hover-lift border-border/50 overflow-hidden group bg-white shadow-sm hover:shadow-elegant transition-all">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-5">
                    {/* Post preview */}
                    <div className="w-full lg:w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-4xl shrink-0 group-hover:scale-[1.02] transition-transform duration-300 border border-primary/5 overflow-hidden">
                      {rec.imageUrl ? (
                        <img src={rec.imageUrl} alt="Post preview" className="w-full h-full object-cover" />
                      ) : (
                        rec.emoji
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{rec.caption}</p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <TrendingUp size={12} /> {rec.engagement} Engagement
                      </span>
                      <div className="flex items-start gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">{rec.reasoning}</p>
                      </div>
                    </div>

                    {/* Details + CTA */}
                    <div className="lg:w-56 shrink-0 space-y-3">
                      <div className="space-y-2.5 text-xs p-4 rounded-2xl bg-muted/30 border border-border/40">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><IndianRupee size={12} /> Budget</span>
                          <span className="font-bold text-foreground">{rec.budget}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><Clock size={12} /> Duration</span>
                          <span className="font-bold text-foreground">{rec.duration}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><Target size={12} /> Est. reach</span>
                          <span className="font-bold text-foreground text-primary">{rec.reach}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><Users size={12} /> Audience</span>
                          <span className="font-bold text-foreground text-[10px] text-right line-clamp-2">{rec.audience}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleBoost(rec.id)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-[10px] font-black uppercase tracking-widest h-11 rounded-xl shadow-xl shadow-primary/20 hover-lift"
                      >
                        Approve Boost
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
