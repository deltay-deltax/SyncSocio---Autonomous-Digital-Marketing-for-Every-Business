import { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, List, Eye, Heart, Activity, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = ['All', 'Agent Posts', 'Original Posts'];

const posts = [
  { id: 1, type: 'Reel', caption: '5 baking secrets nobody tells you 🍞', time: '2 hours ago', views: '2.1K', likes: '186', engagement: '8.2%', agent: true, emoji: '🎬' },
  { id: 2, type: 'Static', caption: 'Our new sourdough starter — 72 hours in the making', time: '1 day ago', views: '890', likes: '94', engagement: '4.1%', agent: true, emoji: '📸' },
  { id: 3, type: 'Carousel', caption: 'From flour to focaccia — swipe through the process →', time: '2 days ago', views: '1.4K', likes: '128', engagement: '5.6%', agent: true, emoji: '🎠' },
  { id: 4, type: 'Reel', caption: 'Morning bake routine — peaceful ASMR edition ☀️', time: '3 days ago', views: '3.2K', likes: '290', engagement: '9.1%', agent: false, emoji: '🎬' },
  { id: 5, type: 'Static', caption: 'Fresh batch of cinnamon rolls available this weekend!', time: '4 days ago', views: '670', likes: '72', engagement: '3.8%', agent: true, emoji: '📸' },
  { id: 6, type: 'Carousel', caption: 'Top 5 bread mistakes beginners make 🚫', time: '5 days ago', views: '1.8K', likes: '210', engagement: '7.3%', agent: true, emoji: '🎠' },
];

const DashboardFeed = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = activeTab === 'All' ? posts
    : activeTab === 'Agent Posts' ? posts.filter(p => p.agent)
    : posts.filter(p => !p.agent);

  return (
    <div className="space-y-5">
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
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <p className="text-3xl mb-3">🤖</p>
            <p className="text-sm text-muted-foreground">Your agent is preparing your first post. Check back in a few minutes</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden hover-lift cursor-pointer border-border/50 group">
                <div className="aspect-square bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center text-4xl relative overflow-hidden">
                  <span className="group-hover:scale-110 transition-transform duration-500">{post.emoji}</span>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-card/90 backdrop-blur-sm text-foreground shadow-sm">{post.type}</span>
                  {post.agent && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-primary/90 text-primary-foreground flex items-center gap-0.5 shadow-sm">
                      <Sparkles size={8} /> AI
                    </span>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-foreground line-clamp-2 mb-2 font-medium">{post.caption}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views}</span>
                    <span className="flex items-center gap-0.5"><Heart size={10} /> {post.likes}</span>
                    <span className="flex items-center gap-0.5"><Activity size={10} /> {post.engagement}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{post.time}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover-lift cursor-pointer border-border/50 group">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform duration-300">{post.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate font-medium">{post.caption}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-semibold">{post.type}</span>
                      <span>{post.time}</span>
                      {post.agent && <span className="text-primary font-semibold flex items-center gap-0.5"><Sparkles size={10} /> Agent</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground shrink-0 hidden sm:flex">
                    <span className="text-center"><span className="block text-foreground font-bold">{post.views}</span>views</span>
                    <span className="text-center"><span className="block text-foreground font-bold">{post.likes}</span>likes</span>
                    <span className="text-center"><span className="block text-foreground font-bold">{post.engagement}</span>eng.</span>
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
