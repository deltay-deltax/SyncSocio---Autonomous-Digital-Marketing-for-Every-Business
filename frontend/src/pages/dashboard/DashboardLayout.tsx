import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { Home, Rss, BarChart3, Target, Calendar, Settings, Rocket, Pause, Bell, Menu, Sparkles, X, Zap, TrendingUp, MessageSquare, CheckCircle2, Clock, User, Upload, MessageCircle, HelpCircle, Library, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Feed', icon: Rss, path: '/dashboard/feed' },
  { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { label: 'Ads', icon: Target, path: '/dashboard/ads' },
  { label: 'Campaigns', icon: Sparkles, path: '/dashboard/strategy' },
  { label: 'Products', icon: ShoppingBag, path: '/dashboard/products' },
  { label: 'Creatives', icon: Library, path: '/dashboard/assets' },
  { label: 'DMs', icon: MessageCircle, path: '/dashboard/dms' },
  { label: 'History', icon: Clock, path: '/dashboard/history' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  { label: 'FAQ', icon: HelpCircle, path: '/dashboard/faq' },
];

const DashboardLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRelinkSuccess, setShowRelinkSuccess] = useState(false);
  const [nextScheduled, setNextScheduled] = useState<any>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [credits, setCredits] = useState<number | null>(() => {
    const cached = localStorage.getItem('velocity_credits');
    return cached ? parseInt(cached, 10) : null;
  });
  const [creditsAnim, setCreditsAnim] = useState(false);

  useEffect(() => {
    if (showNotifications) {
      refresh();
    }
  }, [showNotifications, refresh]);

  // Fetch credits balance
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const res = await fetch(`${API_BASE}/credits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const newCredits = data.credits ?? 0;
          setCredits(prev => {
            if (prev !== null && prev !== newCredits) {
              setCreditsAnim(true);
              setTimeout(() => setCreditsAnim(false), 800);
            }
            return newCredits;
          });
          localStorage.setItem('velocity_credits', String(newCredits));
        }
      } catch (err) {
        console.warn('[Credits] Failed to fetch:', err);
      }
    };
    fetchCredits();
    // Refresh credits every 60 seconds
    const interval = setInterval(fetchCredits, 60000);

    // Also listen for immediate updates dispatched by ContentStrategy after deductions
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'velocity_credits' && e.newValue !== null) {
        const updated = parseInt(e.newValue, 10);
        setCredits(prev => {
          if (prev !== null && prev !== updated) {
            setCreditsAnim(true);
            setTimeout(() => setCreditsAnim(false), 800);
          }
          return updated;
        });
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const fetchNextScheduled = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch full history and filter locally (more reliable)
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/posts/history`;
        
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          const now = new Date();
          
          // Filter for upcoming posts
          const scheduled = data
            .filter((i: any) => {
              if (i.status === 'failed') return false;
              if (i.status === 'scheduled') return true;
              return i.scheduledAt && new Date(i.scheduledAt) > now;
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.scheduledAt || a.createdAt).getTime();
              const dateB = new Date(b.scheduledAt || b.createdAt).getTime();
              return dateA - dateB; // Closest first
            });

          if (scheduled.length > 0) {
            setNextScheduled(scheduled[0]);
          } else {
            setNextScheduled(null);
          }
        }
      } catch (err) {
        console.error('[SIDEBAR] Fetch Error:', err);
      }
    };
    fetchNextScheduled();
  }, [location.pathname]); // Refresh when navigating

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('relinked') === 'true') {
      setShowRelinkSuccess(true);
      const timer = setTimeout(() => setShowRelinkSuccess(false), 6000);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle2;
      case 'insight': return TrendingUp;
      case 'agent': return Zap;
      case 'comment': return MessageSquare;
      case 'scheduled': return Clock;
      case 'alert': return Sparkles;
      case 'billing': return Target;
      default: return Zap;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'success': return "bg-emerald-500/10 text-emerald-600";
      case 'insight': return "bg-amber-500/10 text-amber-600";
      case 'alert': return "bg-rose-500/10 text-rose-600";
      case 'billing': return "bg-blue-500/10 text-blue-600";
      default: return "bg-primary/10 text-primary";
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const res = await fetch(`${API_BASE}/profile/me`, {
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
          if (res.status !== 404) {
            console.error('Profile fetch returned status:', res.status);
          }
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
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap size={18} fill="currentColor" className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tighter uppercase text-foreground leading-none">VelocityDM</span>
            <span className="text-[8px] font-bold text-primary tracking-[0.2em] leading-none uppercase mt-1">Agent as a Service</span>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          if (item.label === 'DMs' && !profile?.DM_Automation_Service) return null;

          let itemPath = item.path;
          
          const isHome = item.path === '/dashboard';
          const isActive = isHome 
            ? location.pathname === '/dashboard' 
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={itemPath}
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
      <div className="px-3 mt-auto mb-2">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 rounded-[1.5rem] border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-30" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Agent Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {nextScheduled ? (
              <>Next post scheduled for <span className="text-foreground font-bold">{
                (() => {
                  const d = new Date(nextScheduled.scheduledAt);
                  const now = new Date();
                  const isToday = d.toDateString() === now.toDateString();
                  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  return `${isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
                })()
              }</span></>
            ) : (
              "Agent is monitoring for new content to optimize."
            )}
          </p>
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
          {showRelinkSuccess && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-full left-0 right-0 h-10 bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-lg z-50"
            >
              <CheckCircle2 size={14} className="mr-2" /> Instagram Reconnected Successfully!
            </motion.div>
          )}
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

            {/* ── Credits Badge ──────────────────────────────── */}
            {credits !== null && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border mr-1 transition-all duration-300 cursor-default select-none ${
                  credits < 50
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    : credits < 200
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                    : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-400/20 text-violet-700'
                } ${creditsAnim ? 'scale-110' : 'scale-100'}`}
                title={`${credits} credits remaining`}
              >
                <Zap
                  size={11}
                  className={`fill-current shrink-0 ${
                    credits < 50 ? 'text-rose-500' : credits < 200 ? 'text-amber-500' : 'text-violet-500'
                  }`}
                />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {credits.toLocaleString()} <span className="opacity-60 font-bold normal-case tracking-normal">credits</span>
                </span>
              </div>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            <div className="h-8 w-px bg-border/50 mx-2" />

            <button onClick={() => window.location.href = '/dashboard/settings'}>
              <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-primary/20 ring-offset-1 shadow-sm hover:ring-primary/60 transition-all">
                {profile?.instagramProfilePicture ? (
                  <img src={profile.instagramProfilePicture} alt={brandName} className="object-cover w-full h-full" />
                ) : (
                  <AvatarFallback className="gradient-bg text-white text-[10px] font-black">{initials}</AvatarFallback>
                )}
              </Avatar>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8 bg-slate-50/20 scrollbar-hide relative">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence>
              {showRelinkSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Account Relinked Successfully</p>
                        <p className="text-[10px] font-medium opacity-90 uppercase tracking-widest">Your Instagram operations are now synchronized</p>
                      </div>
                    </div>
                    <button onClick={() => setShowRelinkSuccess(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Outlet context={{ profile, setProfile, setShowNotifications }} />
          </div>
        </section>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border/50 px-8 py-4 flex justify-between items-center z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          if (item.label === 'DMs' && !profile?.DM_Automation_Service) return null;

          let itemPath = item.path;
          const isActive = itemPath === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(itemPath);
          return (
            <NavLink
              key={item.path}
              to={itemPath}
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
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline mr-2"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Bell size={24} className="text-muted-foreground/40" />
                    </div>
                    <h3 className="text-sm font-black text-foreground">Quiet for now</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">When the agent takes action, you'll see it here.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = getIcon(n.type);
                    return (
                      <div 
                        key={n._id} 
                        onClick={() => !n.isRead && markAsRead(n._id)}
                        className={cn(
                          "p-5 rounded-[2rem] border transition-all cursor-pointer group hover:border-primary/20",
                          !n.isRead ? "bg-primary/[0.03] border-primary/10 shadow-sm" : "bg-card border-border/40 opacity-70"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", getColorClass(n.type))}>
                            <Icon size={20} strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-black truncate group-hover:text-primary transition-colors">{n.title}</h4>
                              {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium mb-2">{n.description}</p>
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-6 border-t border-border/50">
                <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                  End of Activity Log
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
