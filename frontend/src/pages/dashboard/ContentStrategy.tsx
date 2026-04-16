import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Sparkles, 
  Zap, 
  Loader2, 
  ChevronRight, 
  Play, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useOutletContext } from 'react-router-dom';

const ContentStrategy = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [loading, setLoading] = useState(false);
  const [calendar, setCalendar] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5050/api/ai/calendar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendar(data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    }
  };

  const generateStrategy = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5050/api/ai/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to generate strategy');
      
      const data = await res.json();
      setCalendar(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border/50 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Content Lab</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">AI Content Strategy</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-md">
            Generate a personalized 7-day content calendar based on your brand DNA and market trends.
          </p>
        </div>
        
        <Button 
          onClick={generateStrategy}
          disabled={loading}
          className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 group transition-all"
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Zap className="mr-2 h-5 w-5 fill-current group-hover:scale-110 transition-transform" />
          )}
          <span className="font-black uppercase tracking-widest text-xs">
            {loading ? 'Synthesizing...' : 'Re-Generate Strategy'}
          </span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!calendar && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-border/60"
          >
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-6">
              <Calendar size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black mb-2 text-foreground">No Strategy Found</h3>
            <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs font-medium">
              Start your engine! Click the button above to generate your first AI-powered content strategy.
            </p>
          </motion.div>
        ) : loading ? (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-48 bg-white/50 border border-border/40 rounded-[2rem] animate-pulse" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {calendar.posts.map((post: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full border-border/50 hover-lift overflow-hidden rounded-[2rem] shadow-sm group">
                  <div className="p-1 h-1 bg-gradient-to-r from-primary/40 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1.5 rounded-xl bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Day {i + 1} ?" {post.day}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <Play size={14} className="fill-current" />
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 w-fit mb-3">
                      <span className="text-[10px] font-black uppercase tracking-tighter">{post.format}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <CardTitle className="text-base font-bold text-foreground leading-tight mb-4 group-hover:text-primary transition-colors">
                      {post.topic}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-muted-foreground/60">
                       <CheckCircle2 size={12} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Post Optimized</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            {/* CTA/Next Step Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 7 * 0.05 }}
            >
              <Card className="h-full border-primary/20 bg-primary/[0.02] overflow-hidden rounded-[2rem] shadow-sm flex flex-col items-center justify-center p-8 text-center border-dashed">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <ChevronRight size={24} />
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight text-foreground mb-1">Ready to create?</h4>
                <p className="text-[10px] text-muted-foreground font-medium mb-4">Your agent is trained and ready to draft these posts for you.</p>
                <Button variant="link" className="text-[10px] font-black uppercase tracking-widest text-primary p-0">
                  Open Creative Suite
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle size={18} />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ContentStrategy;
