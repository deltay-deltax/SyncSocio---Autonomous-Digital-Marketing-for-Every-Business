import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, List, Eye, Heart, Activity, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = ['All', 'Agent Posts', 'Original Posts'];

let cachedFeedData: any = null;

const DashboardFeed = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [posts, setPosts] = useState<any[]>(cachedFeedData || []);
  const [loading, setLoading] = useState(!cachedFeedData);

  useEffect(() => {
    let isMounted = true;

    const fetchFeed = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/instagram/feed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const result = await res.json();
          cachedFeedData = result.data || [];
          setPosts(cachedFeedData);
        }
      } catch (err) {
        console.error('Failed to fetch feed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeed();

    // Background auto-polling every 60 seconds for live data
    const intervalId = setInterval(() => {
      fetchFeed();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const getEmoji = (type: string) => {
    switch(type?.toUpperCase()) {
      case 'VIDEO': return '🎬';
      case 'CAROUSEL_ALBUM': return '🎠';
      default: return '📸';
    }
  };

  const isAgentPost = (post: any) => {
    return post.caption?.includes('🤖') || post.caption?.toLowerCase().includes('velocity');
  };

  const filtered = activeTab === 'All' ? posts
    : activeTab === 'Agent Posts' ? posts.filter(p => isAgentPost(p))
    : posts.filter(p => !isAgentPost(p));

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Synchronizing Feed</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retrieving Meta Assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground">Your Instagram Feed</h2>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60">
          <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all duration-200', viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all duration-200', viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
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
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 bg-white">
          <CardContent className="py-24 text-center">
            <p className="text-4xl mb-4 animate-bounce">🤖</p>
            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">Establishing Connection</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">Your agent is either preparing your first post or synchronizing with your live Instagram account.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden hover-lift cursor-default border-border/50 group bg-white shadow-sm border-0">
                <div className="aspect-square bg-slate-100 flex items-center justify-center text-4xl relative overflow-hidden">
                  {post.media_url ? (
                    <img 
                      src={post.media_url} 
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 will-change-transform" 
                      alt="" 
                    />
                  ) : (
                    <span className="group-hover:scale-[1.03] transition-transform duration-500">{getEmoji(post.media_type)}</span>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white/90 backdrop-blur-sm text-foreground shadow-sm uppercase tracking-widest leading-none flex items-center h-5">{post.media_type === 'VIDEO' ? 'REEL' : 'POST'}</span>
                  {isAgentPost(post) && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-primary text-white flex items-center gap-1 shadow-sm uppercase tracking-widest leading-none h-5">
                      <Sparkles size={8} /> AI
                    </span>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-foreground line-clamp-2 mb-3 font-medium leading-relaxed">{post.caption || 'No caption provided'}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart size={12} className="text-rose-500" /> {post.likes || 0}</span>
                    <span className="flex items-center gap-1"><Activity size={12} className="text-primary" /> {post.comments || 0}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest opacity-60">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover-lift cursor-default border-border/50 group bg-white shadow-sm border-0">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden border border-slate-50">
                    {post.media_url ? (
                      <img src={post.media_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      getEmoji(post.media_type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate font-medium">{post.caption || 'No caption provided'}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest">{post.media_type === 'VIDEO' ? 'REEL' : 'POST'}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(post.timestamp).toLocaleDateString()}</span>
                      {isAgentPost(post) && <span className="text-primary font-black uppercase tracking-widest text-[9px] flex items-center gap-1"><Sparkles size={10} /> AI Agent</span>}
                    </div>
                  </div>
                  <div className="flex gap-6 shrink-0 px-6 border-l border-slate-50 hidden sm:flex">
                    <div className="text-center">
                      <span className="block text-sm font-black text-slate-900">{post.likes || 0}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">likes</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-black text-slate-900">{post.comments || 0}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">eng.</span>
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
