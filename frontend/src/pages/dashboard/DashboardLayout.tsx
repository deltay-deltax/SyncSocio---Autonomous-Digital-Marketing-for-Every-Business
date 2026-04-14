import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { Home, Rss, BarChart3, Target, Settings, Rocket, Pause, Bell, Menu, Sparkles, X, Zap, TrendingUp, MessageSquare, CheckCircle2, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const notifications = [
  { id: 1, type: 'success', icon: CheckCircle2, title: 'Post published successfully', desc: 'Your Reel "5 baking secrets" is now live on Instagram', time: '10 min ago', unread: true },
  { id: 2, type: 'insight', icon: TrendingUp, title: 'Engagement milestone reached', desc: 'Your account crossed 6% avg engagement rate this week 🎉', time: '1 hr ago', unread: true },
  { id: 3, type: 'agent', icon: Zap, title: 'Agent updated content strategy', desc: 'Shifted mix to 70% Reels based on last week\'s performance', time: '2 hrs ago', unread: true },
  { id: 4, type: 'comment', icon: MessageSquare, title: 'New comments on your post', desc: '12 new comments on "Morning bake routine" — 3 need replies', time: '3 hrs ago', unread: false },
  { id: 5, type: 'scheduled', icon: Clock, title: 'Post scheduled for tonight', desc: 'Carousel post "Flour to focaccia" will go live at 8PM', time: '5 hrs ago', unread: false },
  { id: 6, type: 'success', icon: CheckCircle2, title: 'Boost approved & running', desc: 'Your boosted Reel is reaching 2.4K people so far', time: '1 day ago', unread: false },
];

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Feed', icon: Rss, path: '/dashboard/feed' },
  { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { label: 'Ads', icon: Target, path: '/dashboard/ads' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          localStorage.setItem('velocity_profile', JSON.stringify(data));
        } else if (res.status === 401) {
          console.error('Session expired or invalid. Redirecting to login.');
          localStorage.removeItem('token');
          localStorage.removeItem('velocity_profile');
          window.location.href = '/login';
        } else {
          console.error('Profile fetch returned status:', res.status);
          const stored = localStorage.getItem('velocity_profile');
          if (stored) setProfile(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const stored = localStorage.getItem('velocity_profile');
        if (stored) setProfile(JSON.parse(stored));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const brandName = profile?.brandName || 'My Brand';
  const initials = brandName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Waking up Agent...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white border-r border-border/50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2.5">
        <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap size={18} fill="currentColor" className="text-white" />
        </div>
        <span className="font-black text-lg tracking-tighter uppercase text-foreground">Velocity</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = item.path === '/dashboard' 
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/8 text-primary font-bold shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/3 bottom-1/3 w-1.5 rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Agent Status Card in Sidebar */}
      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 rounded-[2rem] border border-primary/10 mb-4">
           <div className="flex items-center gap-2 mb-3">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
              </div>
              <span className="text-xs font-bold text-foreground">Agent Active</span>
           </div>
           <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
             Next post scheduled for <span className="text-foreground font-bold">Today 8PM</span>
           </p>
           <Button variant="outline" size="sm" className="w-full text-[10px] h-8 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent group uppercase tracking-widest font-black">
              <Pause size={12} className="mr-1.5 group-hover:scale-90 transition-transform" /> Pause Agent
           </Button>
        </div>

        {/* User Profile Hook */}
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-muted/20">
          <Avatar className="w-9 h-9 ring-2 ring-primary/10">
            <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-black">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate">{brandName}</p>
            <p className="text-[10px] text-muted-foreground font-bold truncate">@{profile?.instagramUsername || profile?.socialHandle || 'user'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden">
      {/* SIDEBAR — Desktop */}
      <aside className="hidden lg:flex w-64 fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* MOBILE NAV OVERLAY */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-64 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-border/50 bg-white/50 backdrop-blur-sm px-6 flex items-center justify-between relative z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
              {navItems.find(i => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-full mr-2">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Strategy v2.1</span>
            </div>

            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground relative"
            >
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            </button>
            
            <div className="h-8 w-px bg-border/50 mx-2" />
            
            <button onClick={() => window.location.href='/dashboard/settings'}>
              <Avatar className="w-8 h-8 cursor-pointer ring-1 ring-border shadow-sm hover:ring-primary/40 transition-all">
                <AvatarFallback className="bg-muted text-foreground text-[10px] font-black">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8 bg-slate-50/20 scrollbar-hide">
          <div className="max-w-6xl mx-auto">
            <Outlet context={{ profile }} />
          </div>
        </section>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border/50 px-8 py-4 flex justify-between items-center z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary/10 text-primary scale-110 shadow-sm" : "text-muted-foreground hover:scale-105"
              )}
            >
              <item.icon size={22} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
            </NavLink>
          );
        })}
      </nav>

      {/* NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/10 z-[60] backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white shadow-2xl z-[70] border-l border-border/50 flex flex-col"
            >
              {/* Notif content... */}
              <div className="p-8 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Activity Log</h2>
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Real-time Agent Operations</p>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={cn(
                    "p-5 rounded-[2rem] border transition-all cursor-default",
                    n.unread ? "bg-primary/[0.03] border-primary/10 shadow-sm" : "bg-card border-border/40"
                  )}>
                    <div className="flex gap-4">
                      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", n.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : n.type === 'insight' ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary")}>
                        <n.icon size={20} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black truncate">{n.title}</h4>
                          {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium mb-2">{n.desc}</p>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
