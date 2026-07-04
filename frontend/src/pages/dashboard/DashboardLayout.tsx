import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Home, Rss, BarChart3, Target, Calendar, Settings, Rocket, Pause, Bell, Menu, Sparkles, X, Zap, TrendingUp, MessageSquare, CheckCircle2, Clock, User, Upload, MessageCircle, HelpCircle, Library, ShoppingBag, Coins, Lock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { CreditsModal } from '@/components/CreditsModal';
import { BackgroundGenerationsPopover } from '@/components/BackgroundGenerationsPopover';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Feed', icon: Rss, path: '/dashboard/feed' },
  { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { label: 'Ads', icon: Target, path: '/dashboard/ads' },
  { label: 'Campaigns', icon: Sparkles, path: '/dashboard/strategy' },
  { label: 'Products', icon: ShoppingBag, path: '/dashboard/products' },
  { label: 'Creatives', icon: Library, path: '/dashboard/assets' },
  { label: 'DM Automation', icon: MessageCircle, path: '/dashboard/dms' },
  { label: 'History', icon: Clock, path: '/dashboard/history' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  { label: 'FAQ', icon: HelpCircle, path: '/dashboard/faq' },
];

export type BgTask = {
  id: string;
  title: string;
  status: 'generating' | 'success' | 'error';
  mode: any;
  posts: any[];
  error: any;
  creditCost: number;
  creditReason: string;
  createdAt: number;
};

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(() => {
    const stored = localStorage.getItem('syncsocio_profile');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('syncsocio_profile'));
  const [showRelinkSuccess, setShowRelinkSuccess] = useState(false);
  const [nextScheduled, setNextScheduled] = useState<any>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [credits, setCredits] = useState<number | null>(() => {
    const cached = localStorage.getItem('syncsocio_credits');
    return cached ? parseInt(cached, 10) : null;
  });
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [creditsAnim, setCreditsAnim] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const { toast } = useToast();

  const [backgroundTasks, setBackgroundTasks] = useState<BgTask[]>(() => {
    try {
      const saved = localStorage.getItem('syncsocio_bg_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If a task was running when the page was refreshed, the connection is lost.
        return parsed.map((t: BgTask) => 
          t.status === 'generating' 
            ? { ...t, status: 'error', error: 'Interrupted by page refresh. The generation might still complete in the background—check your Asset Library in a few minutes.' } 
            : t
        );
      }
    } catch (e) {
      console.error('Error parsing bg tasks from local storage', e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('syncsocio_bg_tasks', JSON.stringify(backgroundTasks));
    
    // Prevent accidental reload if there's an active generation
    const hasActiveGeneration = backgroundTasks.some(t => t.status === 'generating');
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveGeneration) {
        e.preventDefault();
        // Standard way to trigger the native browser warning dialog
        e.returnValue = 'You have an active generation running. If you leave, the progress in this window will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backgroundTasks]);
  const [viewingTask, setViewingTask] = useState<BgTask | null>(null);

  const viewCompletedTask = (taskId: string) => {
    const task = backgroundTasks.find(t => t.id === taskId);
    if (task && task.status === 'success') {
      setViewingTask(task);
      if (task.mode === 'schedule') {
        if (location.pathname !== '/dashboard/history') {
          navigate('/dashboard/history');
        }
      } else {
        if (location.pathname !== '/dashboard/strategy') {
          navigate('/dashboard/strategy');
        }
      }
    }
  };

  const clearViewingTask = () => setViewingTask(null);

  const removeTask = (taskId: string) => {
    setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
    if (viewingTask?.id === taskId) {
      setViewingTask(null);
    }
  };

  const startBackgroundGeneration = async (payload: any, creditCost: number, creditReason: string, mode: any) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const title = mode === 'all_in_one' ? 'All-in-One Pack' :
      mode === 'whatsapp' ? 'WhatsApp Blast' :
        mode === 'email' ? 'Email Campaign' :
          `${payload.count || 1} ${mode || 'custom'} generation(s)`;

    const newTask: BgTask = {
      id: taskId,
      title,
      status: 'generating',
      mode,
      posts: [],
      error: null,
      creditCost,
      creditReason,
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
        const res = await fetch(`${AI_BASE}/generate-strategy-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Generation failed');
        }

        const data = await res.json();
        const posts = data.posts || [];

        // Verify if any post failed (image/video missing or contains error message)
        const failedPost = posts.find((p: any) =>
          p.error ||
          (p.type === 'video' && !p.url) ||
          (p.type === 'carousel' && (!p.slides || p.slides.length === 0)) ||
          (p.type !== 'video' && p.type !== 'carousel' && !p.image)
        );
        if (failedPost) {
          throw new Error(failedPost.error || 'One or more creative generations failed.');
        }

        // Deduct credits
        if (creditCost > 0 && posts.length > 0) {
          const token = localStorage.getItem('token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const deductRes = await fetch(`${apiBase}/credits/deduct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount: creditCost, reason: creditReason }),
          });
          if (deductRes.ok) {
            const credData = await deductRes.json();
            localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'syncsocio_credits',
              newValue: String(credData.credits ?? 0),
            }));
          }
        }

        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success', posts } : t));

        toast({
          title: 'Creative synthesis complete! 🎉',
          description: `Successfully generated ${posts.length} dynamic ${mode || 'custom'} creative(s).`,
        });
      } catch (err: any) {
        console.error('[BgGeneration] failed:', err);
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: err.message || 'Something went wrong' } : t));
        toast({
          variant: 'destructive',
          title: 'Creative generation failed ❌',
          description: err.message || 'Something went wrong during assets synthesis.',
        });
      }
    })();

    return taskId;
  };

  const startBackgroundAllInOne = async (requests: any[], creditCost: number, creditReason: string) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newTask: BgTask = {
      id: taskId,
      title: 'All-in-One Package',
      status: 'generating',
      mode: 'all_in_one',
      posts: [],
      error: null,
      creditCost,
      creditReason,
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
        const fetchPromises = requests.map(req =>
          fetch(`${AI_BASE}/generate-strategy-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({ detail: res.statusText }));
              throw new Error(err.detail || 'Generation failed');
            }
            return res.json();
          })
        );

        const resultsArray = await Promise.all(fetchPromises);
        let allPosts: any[] = [];
        resultsArray.forEach((data, reqIndex) => {
          const req = requests[reqIndex];
          const posts = (data.posts || []).map((post: any) => ({
            ...post,
            sectionType: req.layout,
          }));
          allPosts = [...allPosts, ...posts];
        });

        // Verify if any post failed
        const failedPost = allPosts.find((p: any) =>
          p.error ||
          (p.type === 'video' && !p.url) ||
          (p.type === 'carousel' && (!p.slides || p.slides.length === 0)) ||
          (p.type !== 'video' && p.type !== 'carousel' && !p.image)
        );
        if (failedPost) {
          throw new Error(failedPost.error || 'One or more creative generations failed in the All-in-One package.');
        }

        // Deduct credits
        if (creditCost > 0 && allPosts.length > 0) {
          const token = localStorage.getItem('token');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const deductRes = await fetch(`${apiBase}/credits/deduct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount: creditCost, reason: creditReason }),
          });
          if (deductRes.ok) {
            const credData = await deductRes.json();
            localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'syncsocio_credits',
              newValue: String(credData.credits ?? 0),
            }));
          }
        }

        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success', posts: allPosts } : t));

        toast({
          title: 'All-in-One creative package synthesized! 🎁',
          description: `Generated all 11 marketing-strategy assets successfully.`,
        });
      } catch (err: any) {
        console.error('[BgAllInOne] failed:', err);
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: err.message || 'Something went wrong' } : t));
        toast({
          variant: 'destructive',
          title: 'All-in-One generation failed ❌',
          description: err.message || 'Something went wrong during packages synthesis.',
        });
      }
    })();

    return taskId;
  };

  const startBackgroundEdit = async (
    previewPost: any,
    previewIndex: number,
    previewSlide: number,
    fullMediaSrc: string,
    editInstruction: string,
    aspect: string
  ) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const title = 'Media Edit';

    const newTask: BgTask = {
      id: taskId,
      title,
      status: 'generating',
      mode: 'edit_media',
      posts: [],
      error: null,
      creditCost: 0,
      creditReason: '',
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
        const response = await fetch(`${AI_BASE}/edit-strategy-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: fullMediaSrc,
            instruction: editInstruction,
            type: previewPost.type,
            aspectRatio: aspect,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to edit media');
        }

        const data = await response.json();
        if (data.status === 'success') {
          const updatedPost = { ...previewPost, id: Math.random().toString(36).substring(7) };
          if (previewPost.type === 'carousel') {
            const updatedSlides = [...(previewPost.slides || [])];
            if (updatedSlides[previewSlide]) {
              updatedSlides[previewSlide] = {
                ...updatedSlides[previewSlide],
                image: data.image,
              };
            }
            updatedPost.slides = updatedSlides;
          } else if (previewPost.type === 'video') {
            updatedPost.url = data.url;
            updatedPost.thumbnail = data.thumbnail;
          } else {
            updatedPost.image = data.image;
          }

          setBackgroundTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'success', posts: [previewPost, updatedPost] } : t
          ));
        } else {
          throw new Error(data.message || 'Edit failed');
        }
      } catch (err: any) {
        console.error('[BgEdit] failed:', err);
        setBackgroundTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'error', error: err.message || 'Something went wrong' } : t
        ));
      }
    })();

    return taskId;
  };

  const startBackgroundSchedule = async (postIds: string[], platforms: any, schedules?: any[], startDate?: string, endDate?: string) => {
    const taskId = `task_schedule_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const isImmediate = schedules && schedules.length > 0 && schedules.every((s: any) => new Date(s.scheduledAt).getTime() <= Date.now() + 60000);
    const title = isImmediate ? `Posting ${postIds.length} creative(s)` : `Scheduling ${postIds.length} creative(s)`;

    const newTask: BgTask = {
      id: taskId,
      title,
      status: 'generating',
      mode: 'schedule',
      posts: [],
      error: null,
      creditCost: 0,
      creditReason: '',
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        const res = await fetch(`${API_BASE}/posts/smart-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            postIds,
            startDate,
            endDate,
            platforms,
            schedules
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to process posts');
        }

        // Complete the task
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success' } : t));

        toast({
          title: isImmediate ? 'Posts published! 🚀' : 'Posts scheduled! 📅',
          description: `Successfully processed ${postIds.length} post(s).`,
        });

        // Trigger a global event to refresh assets if needed
        window.dispatchEvent(new Event('refresh-assets'));

      } catch (err: any) {
        console.error('[BgSchedule] failed:', err);
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: err.message || 'Something went wrong' } : t));
        toast({
          variant: 'destructive',
          title: 'Action failed ❌',
          description: err.message || 'Something went wrong while processing your posts.',
        });
      }
    })();

    return taskId;
  };

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const res = await fetch(`${apiBase}/profile/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBrands(data.brands || []);
        }
      } catch (err) {
        console.error('Failed to fetch brands list:', err);
      }
    };
    fetchBrands();
  }, []);

  const handleSwitchBrand = async (brandId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ brandId })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('syncsocio_profile', JSON.stringify(data.activeBrand));
        setProfile(data.activeBrand);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch brand:', err);
    }
  };

  useEffect(() => {
    const handleOpenModal = () => setIsCreditsModalOpen(true);
    window.addEventListener('open-credits-modal', handleOpenModal);

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.textContent && target.textContent.trim().toLowerCase() === 'what are credits?') {
        setIsCreditsModalOpen(true);
      }
    };
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('open-credits-modal', handleOpenModal);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

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
          localStorage.setItem('syncsocio_credits', String(newCredits));
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
      if (e.key === 'syncsocio_credits' && e.newValue !== null) {
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
          localStorage.setItem('syncsocio_profile', JSON.stringify(data));
        } else if (res.status === 401) {
          console.error('Session expired or invalid. Redirecting to login.');
          localStorage.removeItem('token');
          localStorage.removeItem('syncsocio_profile');
          window.location.href = '/login';
        } else {
          if (res.status !== 404) {
            console.error('Profile fetch returned status:', res.status);
          }
          const stored = localStorage.getItem('syncsocio_profile');
          if (stored) setProfile(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const stored = localStorage.getItem('syncsocio_profile');
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
          <img
            src="/SyncSocioLogo.png"
            alt="SyncSocio Logo"
            className="w-9 h-9 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground leading-none">SyncSocio</span>

          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          let itemPath = item.path;

          const isHome = item.path === '/dashboard';
          const isActive = isHome
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.path);

          const isPlanExpired = profile?.userPlanExpiresAt ? new Date(profile.userPlanExpiresAt) < new Date() : false;
          const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
          const isElite = planName.includes('elite');
          const hasDMAutomationAccess =
            !isPlanExpired &&
            (isElite || profile?.DM_Automation_Service === true);
          const isLocked = item.label === 'DM Automation' && !hasDMAutomationAccess;

          return (
            <NavLink
              key={item.path}
              to={itemPath}
              onClick={() => setIsSidebarOpen(false)}
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
              {isLocked && (
                <Lock size={12} className="ml-auto text-muted-foreground/60 group-hover:text-muted-foreground" />
              )}
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
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR — Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="lg:hidden w-72 fixed inset-y-0 left-0 z-50 bg-[#F8FAFC] shadow-2xl flex flex-col"
          >
            <SidebarContent />
          </motion.aside>
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
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
            >
              <Menu size={20} />
            </button>
            <h2 className="hidden sm:block text-sm font-black text-foreground uppercase tracking-widest">
              {navItems.find(i => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <BackgroundGenerationsPopover
              tasks={backgroundTasks}
              onView={viewCompletedTask}
              onRemove={removeTask}
            />

            {brands.length > 0 && (
              <select
                value={profile?._id || ''}
                onChange={(e) => handleSwitchBrand(e.target.value)}
                className="hidden sm:inline-block h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest border border-border bg-card hover:border-primary transition-all cursor-pointer outline-none mr-2 max-w-[150px] truncate"
              >
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.brandName || 'Untitled Brand'}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => navigate('/dashboard/buy-credits')}
              className="flex items-center gap-1.5 sm:gap-2 bg-primary/5 border border-primary/10 p-2 sm:px-3 sm:py-1.5 rounded-full mr-1 sm:mr-2 hover:bg-primary/10 transition-all duration-200 cursor-pointer"
            >
              <Coins size={14} className="text-primary" />
              <span className="hidden sm:inline text-[10px] font-black text-primary uppercase tracking-widest">Buy Credit</span>
            </button>

            {/* ── Credits Badge ──────────────────────────────── */}
            {credits !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full border mr-1 transition-all duration-300 cursor-default select-none ${credits < 50
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    : credits < 200
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                      : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-400/20 text-violet-700'
                  } ${creditsAnim ? 'scale-110' : 'scale-100'}`}
                title={`${credits} credits remaining`}
              >
                <Zap
                  size={11}
                  className={`fill-current shrink-0 ${credits < 50 ? 'text-rose-500' : credits < 200 ? 'text-amber-500' : 'text-violet-500'
                    }`}
                />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {credits.toLocaleString()} <span className="hidden sm:inline opacity-60 font-bold normal-case tracking-normal">credits</span>
                </span>
              </div>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            <div className="h-8 w-px bg-border/50 mx-2" />

            <button onClick={() => navigate('/dashboard/settings')}>
              <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-primary/20 ring-offset-1 shadow-sm hover:ring-primary/60 transition-all">
                {(profile?.logo || profile?.instagramProfilePicture) ? (
                  <img src={profile.logo || profile.instagramProfilePicture} alt={brandName} className="object-contain p-0.5 w-full h-full bg-white" />
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

            <Outlet context={{
              profile,
              setProfile,
              setShowNotifications,
              backgroundTasks,
              viewingTask,
              startBackgroundGeneration,
              startBackgroundAllInOne,
              startBackgroundSchedule,
              startBackgroundEdit,
              viewCompletedTask,
              clearViewingTask,
              removeTask
            }} />
          </div>
        </section>
      </main>



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

      <CreditsModal isOpen={isCreditsModalOpen} onClose={() => setIsCreditsModalOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
