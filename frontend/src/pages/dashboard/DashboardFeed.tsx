import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, List, Eye, Heart, MessageSquare, Sparkles, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = ['All', 'Agent Posts', 'Original Posts'];

const DashboardFeed = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/instagram/feed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          setPosts(result.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  const filtered = activeTab === 'All' ? posts
    : activeTab === 'Agent Posts' ? posts.filter(p => p.caption?.includes('🤖') || p.caption?.toLowerCase().includes('velocity'))
    : posts; // Simplifying for now

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-muted rounded-[2rem] animate-pulse" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight italic">Your <span className="text-primary">Feed</span></h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Live Instagram Sync</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-border/50 shadow-sm">
          <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all duration-200', viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all duration-200', viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                : 'bg-white text-muted-foreground hover:bg-muted border border-border/40'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts */}
      {filtered.length === 0 ? (
        <Card className="rounded-[3rem] border-dashed border-2 border-border/50 bg-white">
          <CardContent className="py-24 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                <Sparkles size={24} />
            </div>
            <p className="text-sm font-black uppercase tracking-tight">No Posts Found</p>
            <p className="text-[11px] text-muted-foreground mt-2 max-w-xs mx-auto">Your Instagram feed is empty or your agent is still preparing the first drop.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white group hover:-translate-y-2 transition-all duration-500">
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  {post.media_url ? (
                    <img src={post.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📸</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                     <a href={post.permalink} target="_blank" rel="noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                        View on Insta <ExternalLink size={12} />
                     </a>
                  </div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black bg-white/90 backdrop-blur-md text-slate-900 shadow-sm uppercase tracking-widest">{post.type}</span>
                </div>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-700 line-clamp-2 mb-4 font-bold leading-relaxed">{post.caption || 'No caption'}</p>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[11px] font-black text-slate-800">
                            <Heart size={14} className="text-rose-500 fill-rose-500" /> {post.likes}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-black text-slate-800">
                            <MessageSquare size={14} className="text-primary" /> {post.comments}
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">
                        {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                    <img src={post.media_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">{post.type}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(post.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-800 truncate font-bold">{post.caption || 'No caption'}</p>
                  </div>
                  <div className="flex gap-8 shrink-0 px-6 border-l border-slate-50">
                    <div className="text-center">
                        <span className="block text-xl font-black text-slate-900">{post.likes}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Likes</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-slate-900">{post.comments}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comments</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-emerald-500 italic">{( ((post.likes + post.comments) / 1000) * 10).toFixed(1)}%</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate</span>
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

export default DashboardFeed;
