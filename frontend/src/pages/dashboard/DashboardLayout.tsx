import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { EditorProvider, useEditor } from '@/contexts/EditorContext';
import { Home, Rss, BarChart3, Target, Calendar, Settings, Rocket, Pause, Bell, Menu, Sparkles, X, Zap, TrendingUp, MessageSquare, CheckCircle2, Clock, User, Upload, MessageCircle, HelpCircle, Library, ShoppingBag, Coins, Lock, Paintbrush, AlertCircle, Bot, Gift } from 'lucide-react';
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
      { label: 'Feed', icon: Rss, path: '/dashboard/feed' },
      { label: 'DM Automation', icon: MessageSquare, path: '/dashboard/dms' },
      { label: 'Nexa Agent', icon: Bot, path: '/dashboard/nexa' },
      { label: 'Ads', icon: Target, path: '/dashboard/ads' },
    ]
  },
  {
    title: 'Studio',
    items: [
      { label: 'Campaigns', icon: Sparkles, path: '/dashboard/strategy' },
      { label: 'Asset Library', icon: Library, path: '/dashboard/assets' },
      { label: 'Products', icon: ShoppingBag, path: '/dashboard/products' },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'History', icon: Clock, path: '/dashboard/history' },
      { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
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
            axios.post(`${import.meta.env.VITE_API_URL}/api/ai/log-client-error`, {
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
    const currentCredits = parseInt(currentCreditsStr || '0', 10);

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
    const currentCredits = parseInt(currentCreditsStr || '0', 10);

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
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const response = await fetch(`${apiBase}/ai/edit-product-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to generate clone');
        }

        const data = await response.json();
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
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        // 1. Deduct Credits Upfront
        if (creditCost > 0) {
          const deductRes = await fetch(`${apiBase}/credits/deduct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount: creditCost, reason: 'Sprint campaign generation' }),
          });

          if (!deductRes.ok) {
            const errData = await deductRes.json().catch(() => ({}));
            throw new Error(errData.message || 'Insufficient credits for Sprint campaign');
          }

          const credData = await deductRes.json();
          localStorage.setItem('syncsocio_credits', String(credData.credits ?? 0));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'syncsocio_credits',
            newValue: String(credData.credits ?? 0),
          }));
          creditsDeducted = true;
        }

        // 2. Start AI Generation
        const response = await fetch(`${apiBase}/ai/autopilot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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

        const data = await response.json();
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
            const token = localStorage.getItem('token');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
            const refundRes = await fetch(`${apiBase}/credits/topup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ amount: creditCost }),
            });
            if (refundRes.ok) {
              const credData = await refundRes.json();
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
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

        let userPlan = 'starter';
        const profileRes = await fetch(`${apiBase}/profile/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const pData = await profileRes.json();
          userPlan = (pData.userPlan || 'starter').toLowerCase();
        }

        const res = await fetch(`${apiBase}/profile/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
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
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${apiBase}/profile/lock-excess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keepBrandIds: downgradeSelectedBrands })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
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
              const isElite = planName.includes('elite');
              const isAgency = planName.includes('agency');
              const isMetaReviewer = profile?.userEmail === 'supportvelocitydm@gmail.com';
              const hasDMAutomationAccess = profile?.dmAddonActive || profile?.DM_Automation_Service || isMetaReviewer;
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

            {brands.length > 0 && (
              <select
                value={profile?._id || ''}
                onChange={(e) => handleSwitchBrand(e.target.value)}
                className="hidden sm:inline-block h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest border border-border bg-card hover:border-primary transition-all cursor-pointer outline-none mr-2 max-w-[150px] truncate"
              >
                {brands.map((b) => (
                  <option key={b._id} value={b._id} disabled={b.isLocked}>
                    {b.brandName || 'Untitled Brand'} {b.isLocked ? ' 🔒 (Locked)' : ''}
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
        <section className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-24 lg:pb-8 bg-slate-50/20 scrollbar-hide relative">
          <div className="max-w-6xl mx-auto">

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
              <Button className="flex-1 gradient-bg text-white border-0" onClick={() => { setShowOutOfCreditsModal(false); navigate('/dashboard/settings?tab=Plan%20%26%20Billing'); }}>Buy Plan</Button>
            </div>
          </div>
        </div>
      )}
      {/* Tier 1 AI Support Agent Widget */}
      <SiteChatbot hideWhatsApp={true} />
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
