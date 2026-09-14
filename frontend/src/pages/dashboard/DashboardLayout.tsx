import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { EditorProvider, useEditor } from '@/contexts/EditorContext';
import { Home, Rss, BarChart3, Target, Calendar, Settings, Rocket, Pause, Bell, Menu, Sparkles, X, Zap, TrendingUp, MessageSquare, CheckCircle2, Clock, User, Upload, MessageCircle, HelpCircle, Library, ShoppingBag, Coins, Lock, Paintbrush, AlertCircle, Bot, Gift, LogOut, CreditCard, ArrowRight, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { CreditsModal } from '@/components/CreditsModal';
import { BackgroundGenerationsPopover } from '@/components/BackgroundGenerationsPopover';
import { useToast } from '@/hooks/use-toast';
import { saveTasksToIDB, loadTasksFromIDB } from '@/lib/idb';
import { getFriendlyErrorMessage } from '@/lib/errorHandler';
import { SiteChatbot } from '@/components/SiteChatbot';
import { useOnboardingTour, startOnboardingTour } from '@/hooks/useOnboardingTour';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Home', icon: Home, path: '/dashboard' },
      { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    ]
  },
  {
    title: 'Socials',
    items: [
      { label: 'Feed', icon: Rss, path: '/dashboard/feed', id: 'tour-nav-feed' },
      { label: 'DM Automation', icon: MessageSquare, path: '/dashboard/dms', id: 'tour-nav-dms' },
      { label: 'Nexa Agent', icon: Bot, path: '/dashboard/nexa', id: 'tour-nav-nexa' },
      { label: 'Ads', icon: Target, path: '/dashboard/ads', id: 'tour-nav-ads' },
    ]
  },
  {
    title: 'Studio',
    items: [
      { label: 'Campaigns', icon: Sparkles, path: '/dashboard/strategy', id: 'tour-nav-strategy' },
      { label: 'Asset Library', icon: Library, path: '/dashboard/assets', id: 'tour-nav-assets' },
      { label: 'Products', icon: ShoppingBag, path: '/dashboard/products', id: 'tour-nav-products' },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'History', icon: Clock, path: '/dashboard/history' },
      { label: 'Settings', icon: Settings, path: '/dashboard/settings', id: 'tour-nav-settings' },
      { label: 'Help & Support', icon: HelpCircle, path: '/dashboard/support' },
      { label: 'FAQ', icon: HelpCircle, path: '/dashboard/faq' },
    ]
  }
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

const DashboardLayoutContent = () => {
  useOnboardingTour();
  const { unread, setUnread } = useEditor();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(() => {
    const stored = localStorage.getItem('syncsocio_profile');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (location.pathname === '/dashboard/editor') {
      setUnread(false);
    }
  }, [location.pathname, setUnread]);
  const [loading, setLoading] = useState(() => !localStorage.getItem('syncsocio_profile'));
  const [showRelinkSuccess, setShowRelinkSuccess] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [credits, setCredits] = useState<number | null>(() => {
    const cached = localStorage.getItem('syncsocio_credits');
    return cached ? parseInt(cached, 10) : null;
  });
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  const [outOfCreditsCost, setOutOfCreditsCost] = useState(0);
  const [creditsAnim, setCreditsAnim] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);

  // Downgrade choice state
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [allowedMaxBrands, setAllowedMaxBrands] = useState(1);
  const [downgradeSelectedBrands, setDowngradeSelectedBrands] = useState<string[]>([]);
  const [isLocking, setIsLocking] = useState(false);

  const { toast } = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSignoutModal, setShowSignoutModal] = useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  const [showReviewBrandBanner, setShowReviewBrandBanner] = useState<boolean>(() => {
    const isPending = localStorage.getItem('syncsocio_review_brand_pending') === 'true';
    const isDismissed = localStorage.getItem('syncsocio_review_brand_dismissed') === 'true';
    return isPending && !isDismissed;
  });

  useEffect(() => {
    const checkBanner = () => {
      const isPending = localStorage.getItem('syncsocio_review_brand_pending') === 'true';
      const isDismissed = localStorage.getItem('syncsocio_review_brand_dismissed') === 'true';
      setShowReviewBrandBanner(isPending && !isDismissed);
    };
    checkBanner();
    window.addEventListener('storage', checkBanner);
    return () => window.removeEventListener('storage', checkBanner);
  }, [location.pathname]);

  const [showBrandSuccess, setShowBrandSuccess] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (profile?.brandName === 'Processing...') {
      interval = setInterval(async () => {
        try {
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await axios.get(`${apiBase}/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data && res.data.brandName !== 'Processing...') {
            setProfile(res.data);
            localStorage.setItem('syncsocio_profile', JSON.stringify(res.data));
            
            // Update the brands array as well so the dropdown reflects the new name!
            setBrands(prev => prev.map(b => b._id === res.data._id ? { ...b, brandName: res.data.brandName } : b));
            
            setShowBrandSuccess(true);
            localStorage.setItem('syncsocio_review_brand_pending', 'true');
            localStorage.removeItem('syncsocio_review_brand_dismissed');
            setShowReviewBrandBanner(true);
            
            setTimeout(() => setShowBrandSuccess(false), 8000);
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [profile?.brandName]);

  const handleDismissReviewBanner = () => {
    localStorage.setItem('syncsocio_review_brand_dismissed', 'true');
    setShowReviewBrandBanner(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('syncsocio_profile');
    localStorage.removeItem('syncsocio_setup_done');
    localStorage.removeItem('syncsocio_credits');
    window.location.href = '/';
  };

  const [backgroundTasks, setBackgroundTasks] = useState<BgTask[]>(() => {
    try {
      const saved = localStorage.getItem('syncsocio_bg_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If a task was running when the page was refreshed, the connection is lost.
        return parsed.map((t: BgTask) =>
          t.status === 'generating'
            ? { ...t, status: 'error' as const, error: "Looks like the page refreshed. Don't worry, your assets should still arrive in the Asset Library shortly!" }
            : t
        );
      }
    } catch (e) {
      console.error('Error parsing bg tasks from local storage', e);
    }
    return [];
  });

  const [isIDBLoaded, setIsIDBLoaded] = useState(false);

  useEffect(() => {
    // Load heavy background tasks from IndexedDB on mount
    loadTasksFromIDB().then((idbTasks: any[]) => {
      if (idbTasks && idbTasks.length > 0) {
        setBackgroundTasks(prev => {
          let hasInterrupted = false;
          const processed = idbTasks.map((t: BgTask) => {
            if (t.status === 'generating') {
              hasInterrupted = true;
              return { ...t, status: 'error' as const, error: "Looks like the page refreshed. Don't worry, your assets should still arrive in the Asset Library shortly!" };
            }
            return t;
          });

          if (hasInterrupted) {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
            axios.post(`${apiBase}/ai/log-client-error`, {
              provider: 'OTHER',
              endpoint: 'client-generation',
              errorMessage: 'Page refresh interruption'
            }, { withCredentials: true }).catch(err => console.error('Failed to log client error', err));
          }

          const newTasksStarted = prev.filter(p => !processed.find((pt: any) => pt.id === p.id));
          return [...newTasksStarted, ...processed];
        });
      }
      setIsIDBLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isIDBLoaded) return; // Prevent overwriting IDB with localStorage's stripped data on mount

    try {
      // Save lightweight metadata to localStorage for instant UI load
      const lightweightTasks = backgroundTasks.map(t => ({
        ...t,
        posts: []
      }));
      localStorage.setItem('syncsocio_bg_tasks', JSON.stringify(lightweightTasks));

      // Save the heavy data (including base64 images) to IndexedDB
      saveTasksToIDB(backgroundTasks);
    } catch (err) {
      console.warn('Could not save background tasks:', err);
    }

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
      } else if (task.mode === 'autopilot') {
        if (location.pathname !== '/dashboard/autopilot') {
          navigate('/dashboard/autopilot');
        }
      } else if (task.mode === 'clone') {
        if (location.pathname !== '/dashboard/clone') {
          navigate('/dashboard/clone');
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

  const clearAllTasks = () => {
    setBackgroundTasks(prev => prev.filter(t => t.status === 'generating'));
    if (viewingTask?.status !== 'generating') {
      setViewingTask(null);
    }
  };

  const startBackgroundGeneration = async (payload: any, creditCost: number, creditReason: string, mode: any) => {
    const currentCreditsStr = localStorage.getItem('syncsocio_credits');
    const baseCredits = parseInt(currentCreditsStr || '0', 10);

    const pendingCredits = backgroundTasks
      .filter(t => t.status === 'generating')
      .reduce((sum, t) => sum + (t.creditCost || 0), 0);

    const currentCredits = baseCredits - pendingCredits;

    if (creditCost > 0 && currentCredits < creditCost) {
      setOutOfCreditsCost(creditCost);
      setShowOutOfCreditsModal(true);
      return null;
    }

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
        const res = await fetch(`${AI_BASE}/generate-strategy-images`, { credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Generation failed');
        }

        const _rawJson80 = await res.json();
          const data = _rawJson80 && _rawJson80.success !== undefined ? (_rawJson80.success ? _rawJson80.data : _rawJson80) : _rawJson80;
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
          
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const deductRes = await fetch(`${apiBase}/credits/deduct`, { credentials: 'include',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              
            },
            body: JSON.stringify({ amount: creditCost, reason: creditReason }),
          });
          if (deductRes.ok) {
            const _rawJson79 = await deductRes.json();
              const credData = _rawJson79 && _rawJson79.success !== undefined ? (_rawJson79.success ? _rawJson79.data : _rawJson79) : _rawJson79;
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
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t));
        toast({
          variant: 'destructive',
          title: 'Creative generation failed ❌',
          description: getFriendlyErrorMessage(err),
        });
      }
    })();

    return taskId;
  };

  const startBackgroundAllInOne = async (requests: any[], creditCost: number, creditReason: string) => {
    const currentCreditsStr = localStorage.getItem('syncsocio_credits');
    const baseCredits = parseInt(currentCreditsStr || '0', 10);

    const pendingCredits = backgroundTasks
      .filter(t => t.status === 'generating')
      .reduce((sum, t) => sum + (t.creditCost || 0), 0);

    const currentCredits = baseCredits - pendingCredits;

    if (creditCost > 0 && currentCredits < creditCost) {
      setOutOfCreditsCost(creditCost);
      setShowOutOfCreditsModal(true);
      return null;
    }

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
          fetch(`${AI_BASE}/generate-strategy-images`, { credentials: 'include',
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
          
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          const deductRes = await fetch(`${apiBase}/credits/deduct`, { credentials: 'include',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              
            },
            body: JSON.stringify({ amount: creditCost, reason: creditReason }),
          });
          if (deductRes.ok) {
            const _rawJson78 = await deductRes.json();
              const credData = _rawJson78 && _rawJson78.success !== undefined ? (_rawJson78.success ? _rawJson78.data : _rawJson78) : _rawJson78;
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
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t));
        toast({
          variant: 'destructive',
          title: 'All-in-One generation failed ❌',
          description: getFriendlyErrorMessage(err),
        });
      }
    })();

    return taskId;
  };

  const startBackgroundClone = async (payload: any) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const title = 'Clone Mode Generation';

    const newTask: BgTask = {
      id: taskId,
      title,
      status: 'generating',
      mode: 'clone',
      posts: [],
      error: null,
      creditCost: 0,
      creditReason: '',
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const response = await fetch(`${apiBase}/ai/edit-product-image`, { credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to generate clone');
        }

        const _rawJson77 = await response.json();
          const data = _rawJson77 && _rawJson77.success !== undefined ? (_rawJson77.success ? _rawJson77.data : _rawJson77) : _rawJson77;
        const imageSrc = data.image ? (data.image.startsWith('data:') || data.image.startsWith('http') ? data.image : `data:image/jpeg;base64,${data.image}`) : null;

        if (data.credits !== undefined) {
          localStorage.setItem('syncsocio_credits', String(data.credits));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'syncsocio_credits',
            newValue: String(data.credits),
          }));
        }

        const posts = [{ image: imageSrc, caption: '' }];
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success', posts } : t));

        toast({
          title: 'Clone complete! 🎨',
          description: `Successfully cloned the template.`,
        });
      } catch (err: any) {
        console.error('[BgClone] failed:', err);
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t));
        toast({
          variant: 'destructive',
          title: 'Clone failed ❌',
          description: getFriendlyErrorMessage(err),
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
        const response = await fetch(`${AI_BASE}/edit-strategy-media`, { credentials: 'include',
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

        const _rawJson76 = await response.json();
          const data = _rawJson76 && _rawJson76.success !== undefined ? (_rawJson76.success ? _rawJson76.data : _rawJson76) : _rawJson76;
        if (data.status === 'success') {
          const updatedPost = { ...previewPost, id: Math.random().toString(36).substring(7), isEdited: true };
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
            t.id === taskId ? { ...t, status: 'success', posts: [updatedPost, previewPost] } : t
          ));
        } else {
          throw new Error(data.message || 'Edit failed');
        }
      } catch (err: any) {
        console.error('[BgEdit] failed:', err);
        setBackgroundTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t
        ));
      }
    })();

    return taskId;
  };

  const startBackgroundAutopilot = async (
    language: string,
    weeks: number,
    selectedProductIds: string[],
    upcomingFestivals: any[]
  ) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const title = `Sprint campaign (${weeks} week${weeks > 1 ? 's' : ''})`;
    const baseImageCost = profile?.selectedPlan?.toLowerCase().includes('pro') ? 8 : 5;
    const creditCost = weeks * 7 * baseImageCost;

    const newTask: BgTask = {
      id: taskId,
      title,
      status: 'generating',
      mode: 'autopilot',
      posts: [],
      error: null,
      creditCost,
      creditReason: 'Sprint campaign generation',
      createdAt: Date.now(),
    };

    setBackgroundTasks(prev => [newTask, ...prev]);

    (async () => {
      let creditsDeducted = false;
      try {
        
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        // 1. Deduct Credits Upfront
        if (creditCost > 0) {
          const deductRes = await fetch(`${apiBase}/credits/deduct`, { credentials: 'include',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              
            },
            body: JSON.stringify({ amount: creditCost, reason: 'Sprint campaign generation' }),
          });

          if (!deductRes.ok) {
            const errData = await deductRes.json().catch(() => ({}));
            throw new Error(errData.message || 'Insufficient credits for Sprint campaign');
          }

          const _rawJson75 = await deductRes.json();
            const credData = _rawJson75 && _rawJson75.success !== undefined ? (_rawJson75.success ? _rawJson75.data : _rawJson75) : _rawJson75;
          localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'syncsocio_credits',
            newValue: String(credData.credits ?? 0),
          }));
          creditsDeducted = true;
        }

        // 2. Start AI Generation
        const response = await fetch(`${apiBase}/ai/autopilot`, { credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            },
          body: JSON.stringify({
            language,
            weeks,
            selectedProductIds,
            upcomingFestivals
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to generate autopilot campaign');
        }

        const _rawJson74 = await response.json();
          const data = _rawJson74 && _rawJson74.success !== undefined ? (_rawJson74.success ? _rawJson74.data : _rawJson74) : _rawJson74;
        if (data.status === 'success') {
          const posts = data.posts || [];

          // Credits already deducted upfront.

          setBackgroundTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'success', posts } : t
          ));

          toast({
            title: 'Sprint campaign generated! 🚀',
            description: `Successfully planned and generated ${posts.length} campaign posts.`,
          });
        } else {
          throw new Error(data.message || 'Generation failed');
        }
      } catch (err: any) {
        console.error('[BgAutopilot] failed:', err);

        if (creditsDeducted && creditCost > 0) {
          try {
            
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
            const refundRes = await fetch(`${apiBase}/credits/topup`, { credentials: 'include',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                
              },
              body: JSON.stringify({ amount: creditCost }),
            });
            if (refundRes.ok) {
              const _rawJson73 = await refundRes.json();
                const credData = _rawJson73 && _rawJson73.success !== undefined ? (_rawJson73.success ? _rawJson73.data : _rawJson73) : _rawJson73;
              localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'syncsocio_credits',
                newValue: String(credData.credits ?? 0),
              }));
              console.log(`[BgAutopilot] Refunded ${creditCost} credits.`);
            }
          } catch (refundErr) {
            console.error('[BgAutopilot] Failed to refund credits:', refundErr);
          }
        }

        setBackgroundTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t
        ));
        toast({
          variant: 'destructive',
          title: 'Sprint generation failed ❌',
          description: getFriendlyErrorMessage(err),
        });
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
        
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        const body = { postIds, startDate, endDate, platforms, schedules };
        console.log('[BgSchedule] Sending to smart-schedule:', JSON.stringify(body, null, 2));
        const res = await fetch(`${API_BASE}/posts/smart-schedule`, { credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            },
          body: JSON.stringify(body)
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
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: getFriendlyErrorMessage(err) } : t));
        toast({
          variant: 'destructive',
          title: 'Action failed ❌',
          description: getFriendlyErrorMessage(err),
        });
      }
    })();

    return taskId;
  };

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        let userPlan = 'starter';
        const token = localStorage.getItem('token');
        const profileRes = await fetch(`${apiBase}/profile/me`, { credentials: 'include',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (profileRes.ok) {
          const _rawJson72 = await profileRes.json();
            const pData = _rawJson72 && _rawJson72.success !== undefined ? (_rawJson72.success ? _rawJson72.data : _rawJson72) : _rawJson72;
          userPlan = (pData.userPlan || 'starter').toLowerCase();
        }

        const res = await fetch(`${apiBase}/profile/list`, { credentials: 'include',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const _rawJson71 = await res.json();
            const data = _rawJson71 && _rawJson71.success !== undefined ? (_rawJson71.success ? _rawJson71.data : _rawJson71) : _rawJson71;
          const fetchedBrands = data.brands || [];
          setBrands(fetchedBrands);

          const hasAgency = userPlan.includes('agency');
          const hasElite = userPlan.includes('elite');
          const maxBrands = hasAgency ? 8 : hasElite ? 2 : 1;

          const unlockedCount = fetchedBrands.filter((b: any) => !b.isLocked).length;
          if (unlockedCount > maxBrands) {
            setAllowedMaxBrands(maxBrands);
            setShowDowngradeModal(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch brands list:', err);
      }
    };
    fetchBrands();
  }, []);

  const handleSwitchBrand = async (brandId: string) => {
    try {
      const brand = brands.find(b => b._id === brandId);
      if (brand?.isLocked) {
        toast({
          variant: 'destructive',
          title: 'Brand Locked 🔒',
          description: 'This brand profile is locked on your current plan. Please upgrade to access it.'
        });
        return;
      }

      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/switch`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({ brandId })
      });
      if (res.ok) {
        const _rawJson70 = await res.json();
          const data = _rawJson70 && _rawJson70.success !== undefined ? (_rawJson70.success ? _rawJson70.data : _rawJson70) : _rawJson70;
        localStorage.setItem('syncsocio_profile', JSON.stringify(data.activeBrand));
        setProfile(data.activeBrand);
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          variant: 'destructive',
          title: 'Failed to switch brand',
          description: errData.message || 'Access denied.'
        });
      }
    } catch (err) {
      console.error('Failed to switch brand:', err);
    }
  };

  const handleDowngradeSelection = async () => {
    if (downgradeSelectedBrands.length !== allowedMaxBrands) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: `Please select exactly ${allowedMaxBrands} brand(s) to keep active.`
      });
      return;
    }
    setIsLocking(true);
    try {
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/lock-excess`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({ keepBrandIds: downgradeSelectedBrands })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const _rawJson69 = await res.json();
          const err = _rawJson69 && _rawJson69.success !== undefined ? (_rawJson69.success ? _rawJson69.data : _rawJson69) : _rawJson69;
        toast({
          variant: 'destructive',
          title: 'Error locking brands',
          description: err.message
        });
        setIsLocking(false);
      }
    } catch (err) {
      console.error(err);
      setIsLocking(false);
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
        
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const res = await fetch(`${API_BASE}/credits`, { credentials: 'include',
          headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
        });
        if (res.ok) {
          const _rawJson68 = await res.json();
            const data = _rawJson68 && _rawJson68.success !== undefined ? (_rawJson68.success ? _rawJson68.data : _rawJson68) : _rawJson68;
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
      case 'alert': return AlertCircle;
      case 'billing': return Target;
      case 'support': return MessageSquare;
      default: return Zap;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'success': return "bg-emerald-500/10 text-emerald-600";
      case 'insight': return "bg-violet-500/10 text-violet-600";
      case 'alert': return "bg-rose-500/10 text-rose-600";
      case 'billing': return "bg-blue-500/10 text-blue-600";
      case 'support': return "bg-indigo-500/10 text-indigo-600";
      case 'comment': return "bg-cyan-500/10 text-cyan-600";
      case 'scheduled': return "bg-amber-500/10 text-amber-600";
      default: return "bg-primary/10 text-primary";
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/profile/me`, { credentials: 'include',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const _rawJson67 = await res.json();
            const data = _rawJson67 && _rawJson67.success !== undefined ? (_rawJson67.success ? _rawJson67.data : _rawJson67) : _rawJson67;
          setProfile(data);
          localStorage.setItem('syncsocio_profile', JSON.stringify(data));

          if (data.userCredits !== undefined) {
            setCredits(data.userCredits);
            localStorage.setItem('syncsocio_credits', String(data.userCredits));
          }
        } else if (res.status === 401) {
          console.error('Session expired or invalid. Redirecting to login.');
          
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
      <div className="flex h-screen bg-background overflow-hidden animate-pulse">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:flex w-72 flex-col border-r border-border/50 bg-white">
           <div className="p-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-muted/80"></div>
                 <div className="w-24 h-6 bg-muted/80 rounded"></div>
              </div>
           </div>
           <div className="px-4 mt-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-10 bg-muted/60 rounded-xl"></div>
              ))}
           </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
           {/* Header Skeleton */}
           <div className="h-16 border-b border-border/50 bg-white/50 px-6 flex items-center justify-between">
              <div className="w-32 h-6 bg-muted rounded"></div>
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 bg-muted rounded-full"></div>
                 <div className="w-8 h-8 bg-muted rounded-full"></div>
                 <div className="w-10 h-10 bg-muted rounded-full"></div>
              </div>
           </div>
           {/* Page Skeleton */}
           <div className="flex-1 p-6 md:p-8">
              <div className="w-64 h-8 bg-muted rounded mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="h-40 bg-muted/60 rounded-3xl border border-border/50"></div>
                 ))}
              </div>
              <div className="mt-8 h-64 bg-muted/60 rounded-3xl border border-border/50"></div>
           </div>
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
            src="/SyncSocioLogo.png" width="40" height="40"
            alt="SyncSocio Logo"
            className="w-9 h-9 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground leading-none">SyncSocio</span>

          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-hide">
        {navGroups.map((group, groupIdx) => (
          <div key={group.title} className={cn("flex flex-col space-y-1", groupIdx > 0 && "mt-6")}>
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{group.title}</span>
            {group.items.map((item) => {
              let itemPath = item.path;

              const isHome = item.path === '/dashboard';
              const isActive = isHome
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

              const isPlanExpired = profile?.userPlanExpiresAt ? new Date(profile.userPlanExpiresAt) < new Date() : false;
              const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
              const isGrowth = planName.includes('growth');
              const isPro = planName.includes('pro');
              const isElite = planName.includes('elite');
              const isAgency = planName.includes('agency');
              const isMetaReviewer = profile?.userEmail === 'supportvelocitydm@gmail.com';
              const hasDMAutomationAccess = isGrowth || isPro || isElite || isAgency || profile?.dmAddonActive || profile?.DM_Automation_Service || isMetaReviewer;
              const isLocked = item.label === 'DM Automation' && !hasDMAutomationAccess;



              return (
                <NavLink
                  key={item.path}
                  to={itemPath}
                  id={(item as any).id}
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
          </div>
        ))}
      </nav>
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
        <header className="h-14 sm:h-16 border-b border-border/50 bg-white/50 backdrop-blur-sm px-3 sm:px-6 flex items-center justify-between relative z-30 shrink-0">
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
              {navGroups.flatMap(g => g.items).find(i => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <BackgroundGenerationsPopover
              tasks={backgroundTasks}
              onView={viewCompletedTask}
              onRemove={removeTask}
              onClearAll={clearAllTasks}
            />

            <AnimatePresence mode="wait">
              {profile?.brandName === 'Processing...' ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 h-8 rounded-full pl-2 pr-3 sm:pr-4 bg-primary/10 border border-primary/20 mr-2 shadow-sm animate-pulse max-w-[140px] sm:max-w-none overflow-hidden"
                >
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate">Processing...</span>
                </motion.div>
              ) : brands.length > 0 ? (
                <motion.select
                  key="dropdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  value={profile?._id || ''}
                  onChange={(e) => handleSwitchBrand(e.target.value)}
                  className="inline-block h-8 rounded-full px-2 sm:px-3 text-[10px] font-black uppercase tracking-widest border border-border bg-card hover:border-primary transition-all cursor-pointer outline-none mr-2 max-w-[120px] sm:max-w-[150px] truncate"
                >
                  {brands.map((b) => (
                    <option key={b._id} value={b._id} disabled={b.isLocked}>
                      {b.brandName || 'Untitled Brand'} {b.isLocked ? ' 🔒 (Locked)' : ''}
                    </option>
                  ))}
                </motion.select>
              ) : null}
            </AnimatePresence>

            <button
              onClick={() => navigate('/dashboard/billing')}
              className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 border border-emerald-400/50 p-2 sm:px-3 sm:py-1.5 rounded-full mr-1 sm:mr-2 hover:brightness-110 transition-all duration-200 cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Sparkles size={14} className="text-white" />
              <span className="hidden sm:inline text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">Upgrade</span>
            </button>

            {/* ── Credits Badge & Buy Button ──────────────────────────────── */}
            {credits !== null && (
              <button
                id="tour-nav-credits"
                onClick={() => navigate('/dashboard/buy-credits')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border mr-1 transition-all duration-300 hover:brightness-95 active:scale-95 cursor-pointer select-none group shadow-sm ${credits < 50
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
                  : credits < 200
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-400/20 text-violet-700 hover:opacity-80'
                  } ${creditsAnim ? 'scale-110' : 'scale-100'}`}
                title="Buy more credits"
              >
                <Zap
                  size={12}
                  className={`fill-current shrink-0 ${credits < 50 ? 'text-rose-500' : credits < 200 ? 'text-amber-500' : 'text-violet-500'
                    }`}
                />
                <span className="text-[10.5px] font-black uppercase tracking-widest flex items-center">
                  {credits.toLocaleString()} <span className="hidden sm:inline opacity-60 font-bold normal-case tracking-normal ml-1 mr-1">cr</span>
                </span>
                <div className={`flex items-center justify-center w-4 h-4 rounded-full ml-0.5 ${credits < 50 ? 'bg-rose-500/20 text-rose-600 group-hover:bg-rose-500 group-hover:text-white' :
                    credits < 200 ? 'bg-amber-500/20 text-amber-700 group-hover:bg-amber-500 group-hover:text-white' :
                      'bg-violet-500/15 text-violet-700 group-hover:bg-violet-500 group-hover:text-white'
                  } transition-colors`}>
                  <Plus size={10} strokeWidth={4} />
                </div>
              </button>
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

            {/* ── User Profile Dropdown ───────────────────────── */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="tour-nav-profile"
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="flex items-center gap-1.5 focus:outline-none"
                aria-label="User Account Menu"
              >
                <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-primary/20 ring-offset-1 shadow-sm hover:ring-primary/60 transition-all">
                  {(profile?.logo || profile?.instagramProfilePicture) ? (
                    <img src={profile.logo || profile.instagramProfilePicture} alt={brandName} className="object-contain p-0.5 w-full h-full bg-white" />
                  ) : (
                    <AvatarFallback className="gradient-bg text-white text-[10px] font-black">{initials}</AvatarFallback>
                  )}
                </Avatar>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border/70 shadow-2xl z-50 overflow-hidden"
                    >
                      {/* User / Brand Summary */}
                      <div className="p-4 bg-muted/30 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 ring-1 ring-border shadow-inner bg-white shrink-0">
                            {(profile?.logo || profile?.instagramProfilePicture) ? (
                              <img src={profile.logo || profile.instagramProfilePicture} alt={brandName} className="object-contain p-0.5 w-full h-full" />
                            ) : (
                              <AvatarFallback className="gradient-bg text-white text-xs font-black">{initials}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{brandName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{profile?.userEmail || profile?.email || 'Active Account'}</p>
                            <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                              {profile?.plan || profile?.userPlan || 'Active Plan'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Navigation list */}
                      <div className="p-1.5 space-y-0.5">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            startOnboardingTour(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors text-left"
                        >
                          <Rocket size={14} className="text-primary" />
                          <span>Replay Tour</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/dashboard/settings');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <Settings size={14} className="text-muted-foreground" />
                          <span>Settings & Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/dashboard/settings?tab=Plan%20%26%20Billing');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <CreditCard size={14} className="text-muted-foreground" />
                          <span>Plan & Billing</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/dashboard/buy-credits');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <Coins size={14} className="text-muted-foreground" />
                          <span>Top-up Credits</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/dashboard/faq');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <HelpCircle size={14} className="text-muted-foreground" />
                          <span>Help & FAQs</span>
                        </button>
                      </div>

                      <div className="p-1.5 border-t border-border/50 bg-muted/10">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowSignoutModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors text-left"
                        >
                          <LogOut size={14} className="text-destructive" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <section className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 pt-2 pb-24 lg:pb-8 bg-slate-50/20 scrollbar-hide scroll-touch relative">
          <div className="max-w-6xl mx-auto">

            <AnimatePresence>
              {showReviewBrandBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -16, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/[0.08] via-primary/[0.07] to-amber-500/[0.08] border border-primary/20 p-3.5 sm:p-4 shadow-sm shadow-primary/5 backdrop-blur-sm">
                    {/* Subtle decorative glow */}
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary mt-0.5 sm:mt-0 shadow-sm">
                          <Sparkles size={16} className="animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6 sm:pr-0">
                          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                            Please review your brand in <button type="button" onClick={() => navigate('/dashboard/settings?tab=Brand%20Profile')} className="font-bold text-primary hover:underline inline-flex items-center gap-0.5">settings</button> to generate perfect generatives.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <Button
                          size="sm"
                          onClick={() => navigate('/dashboard/settings?tab=Brand%20Profile')}
                          className="h-8 px-3.5 text-xs font-bold gradient-bg text-white shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 rounded-xl w-full sm:w-auto"
                        >
                          <span>Review in Settings</span>
                          <ArrowRight size={13} />
                        </Button>
                        <button
                          onClick={handleDismissReviewBanner}
                          aria-label="Dismiss banner"
                          className="p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 absolute top-3 right-3 sm:static"
                          title="Dismiss"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {profile?.plan === 'Free Trial' && (
              <div className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Gift size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Free Trial Active</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">You have {credits || 0} credits remaining. Upgrade to unlock all features.</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/dashboard/settings')}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0"
                >
                  Upgrade Plan
                </Button>
              </div>
            )}

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
            <ErrorBoundary>
              <Outlet context={{
                profile,
                setProfile,
                setShowNotifications,
                backgroundTasks,
                viewingTask,
                startBackgroundGeneration,
                startBackgroundAllInOne,
                startBackgroundClone,
                startBackgroundSchedule,
                startBackgroundEdit,
                startBackgroundAutopilot,
                viewCompletedTask,
                clearViewingTask,
                removeTask
              }} />
            </ErrorBoundary>
          </div>
        </section>
      </main>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border/50 flex items-stretch pb-safe" style={{ minHeight: '60px' }}>
        {[
          { label: 'Home', icon: Home, path: '/dashboard', end: true },
          { label: 'Campaigns', icon: Sparkles, path: '/dashboard/strategy', end: false },
          { label: 'Feed', icon: Rss, path: '/dashboard/feed', end: false },
          { label: 'DMs', icon: MessageSquare, path: '/dashboard/dms', end: false },
          { label: 'Settings', icon: Settings, path: '/dashboard/settings', end: false },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-black uppercase tracking-widest transition-colors active:opacity-70',
              isActive ? 'text-primary' : 'text-muted-foreground/60'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={cn('transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/40')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
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
              className="fixed top-0 right-0 bottom-0 w-full sm:max-w-[400px] bg-white shadow-2xl z-[70] border-l border-border/50 flex flex-col"
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
                        onClick={() => {
                          if (!n.isRead) markAsRead(n._id);
                          if (n.metadata?.conversationId || n.title.toLowerCase().includes('nexa') || n.description.toLowerCase().includes('crm')) {
                            setShowNotifications(false);
                            navigate('/dashboard/nexa');
                          }
                        }}
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

      {showDowngradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-background rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />

            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Lock size={32} className="text-amber-500" />
            </div>

            <h2 className="text-2xl font-black tracking-tight mb-2">Downgrade Detected</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Your current plan only allows <span className="font-bold text-foreground">{allowedMaxBrands} active brand profile(s)</span>, but you currently have {brands.length}.
              <br /><br />
              Please select the <span className="font-bold text-primary">{allowedMaxBrands} brand(s)</span> you want to keep active. The rest will be securely locked until you upgrade again.
            </p>

            <div className="space-y-3 mb-8 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
              {brands.map(b => (
                <div
                  key={b._id}
                  onClick={() => {
                    if (downgradeSelectedBrands.includes(b._id)) {
                      setDowngradeSelectedBrands(prev => prev.filter(id => id !== b._id));
                    } else {
                      if (downgradeSelectedBrands.length < allowedMaxBrands) {
                        setDowngradeSelectedBrands(prev => [...prev, b._id]);
                      } else {
                        toast({ title: 'Limit Reached', description: `You can only select ${allowedMaxBrands} brand(s).` });
                      }
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer transition-all",
                    downgradeSelectedBrands.includes(b._id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-primary/30 bg-card"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    downgradeSelectedBrands.includes(b._id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {downgradeSelectedBrands.includes(b._id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{b.brandName || 'Untitled Brand'}</p>
                    <p className="text-xs text-muted-foreground truncate">@{b.instagramUsername || b.socialHandle || 'no-handle'}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 rounded-xl gradient-bg text-white font-bold tracking-wide"
              onClick={handleDowngradeSelection}
              disabled={isLocking || downgradeSelectedBrands.length !== allowedMaxBrands}
            >
              {isLocking ? 'Locking Excess Brands...' : 'Confirm Selection'}
            </Button>
          </div>
        </div>
      )}

      {showOutOfCreditsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-background rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Insufficient Credits</h2>
            <p className="text-center text-muted-foreground mb-6 text-sm">
              You need <span className="font-bold text-foreground">{outOfCreditsCost} credits</span> for this generation, but you only have <span className="font-bold text-foreground">{credits ?? 0}</span>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowOutOfCreditsModal(false)}>Cancel</Button>
              <Button className="flex-1 gradient-bg text-white border-0" onClick={() => { setShowOutOfCreditsModal(false); navigate('/dashboard/buy-credits'); }}>Buy Credits</Button>
            </div>
          </div>
        </div>
      )}
      {/* Tier 1 AI Support Agent Widget */}
      <SiteChatbot hideWhatsApp={true} />
      {/* ── SIGN OUT CONFIRMATION MODAL ───────────────────── */}
      <AnimatePresence>
        {showSignoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-card border border-border/80 rounded-3xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <LogOut size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Sign out of SyncSocio?</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  You will be safely logged out of your session on <span className="font-semibold text-foreground">{profile?.brandName || 'Untitled Brand'}</span>. You can sign back in anytime.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowSignoutModal(false)}
                  className="flex-1 h-12 rounded-xl font-bold text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 h-12 rounded-xl font-bold text-sm bg-destructive text-destructive-foreground hover:brightness-110 shadow-lg shadow-destructive/20 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Ready Fixed Notification */}
      <AnimatePresence>
        {showBrandSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-24 right-6 z-[100] flex items-start gap-4 p-4 rounded-2xl border border-emerald-500/30 bg-background shadow-2xl max-w-[320px]"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-black text-foreground">Brand Profile Ready!</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-medium">
                Your brand DNA has been successfully extracted. Please review and tune it in Settings to ensure top quality outputs.
              </p>
              <button 
                onClick={() => {
                  setShowBrandSuccess(false);
                  navigate('/dashboard/settings');
                }}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1"
              >
                Review Settings <ArrowRight size={12} />
              </button>
            </div>
            <button 
              onClick={() => setShowBrandSuccess(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <EditorProvider>
      <DashboardLayoutContent />
    </EditorProvider>
  );
};

export default DashboardLayout;
