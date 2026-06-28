import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageCircle, Zap, ArrowRight, ArrowLeft, Trash2, ToggleLeft, ToggleRight,
  Eye, PenLine, X, Search, MessageSquare, Hash, MousePointerClick,
  Send, Sparkles, Copy, Link2, UserPlus, ExternalLink, MoveDown,
  Image as ImageIcon, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ─── TYPES ───
type ButtonType = 'url' | 'next' | 'follow' | 'visit_profile';

interface FlowButton {
  id: string;
  label: string;
  type: ButtonType;
  url?: string; // for url / visit_profile
}

interface FlowMessage {
  id: string;
  text: string;
  buttons: FlowButton[];
  // condition is implicit: shown after user taps the button that triggered it
  // first message is the hook (auto-sent after trigger)
  conditional?: 'if_following' | 'if_not_following' | null;
}

interface Flow {
  id: string;
  name: string;
  trigger: 'comment' | 'story_reply' | 'dm_keyword';
  targetType: 'all' | 'specific';
  targetMediaId?: string;
  keyword: string;
  commentReplyMessage: string;
  messages: FlowMessage[];
  active: boolean;
  createdAt: string;
  stats: { triggered: number; replied: number; clicked: number; conversions: number };
  source?: 'user' | 'ai_suggested';
  linkedPostTopic?: string;
}

interface ApiFlow {
  _id: string;
  name: string;
  trigger: Flow['trigger'];
  targetType: Flow['targetType'];
  targetMediaId?: string;
  keyword: string;
  commentReplyMessage?: string;
  messages: FlowMessage[];
  active: boolean;
  createdAt: string;
  stats?: Partial<Flow['stats']>;
  source?: 'user' | 'ai_suggested';
  linkedPostTopic?: string;
}

// ─── HELPERS ───
const uid = () => Math.random().toString(36).slice(2, 9);
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

const getAuthHeaders = (includeJson = false): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
};

const getInitialFlow = () => ({
  name: '🎁 Link Delivery Flow', trigger: 'comment' as const, targetType: 'all' as const, keyword: 'link',
  commentReplyMessage: '{{username}} Check your DM',
  messages: [
    {
      id: uid(),
      text: "Hey! I'm so glad you're here - thanks a ton for stopping by 😊\nTap below and I'll send you the access in just a moment ✨",
      buttons: [
        { id: uid(), label: "Send me the access", type: "next" as const }
      ],
    },
    {
      id: uid(),
      conditional: "if_not_following" as const,
      text: "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
      buttons: [
        { id: uid(), label: "Visit Profile", type: "visit_profile" as const, url: "https://instagram.com/" },
        { id: uid(), label: "I'm following ✅", type: "next" as const }
      ]
    },
    {
      id: uid(),
      conditional: "if_following" as const,
      text: "Thanks for the comment! 🙌\n\n🔗 Main link: https://poe.com/\n\nThe app in the video is no longer free, but here's a solid free alternative for the same",
      buttons: [
        { id: uid(), label: "Open Link", type: "url" as const, url: "https://poe.com/" }
      ]
    }
  ]
});

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;

  return date.toLocaleDateString();
};

const toUIFlow = (flow: ApiFlow): Flow => {
  const safeMessages = Array.isArray(flow.messages)
    ? flow.messages
      .filter((message) => typeof message?.text === 'string' && message.text.trim().length > 0)
      .map((message) => ({
        id: message.id || uid(),
        text: message.text,
        buttons: Array.isArray(message.buttons)
          ? message.buttons.map((button) => ({
            id: button.id || uid(),
            label: button.label || '',
            type: button.type,
            url: button.url,
          }))
          : [],
        conditional:
          message.conditional === 'if_following' || message.conditional === 'if_not_following'
            ? message.conditional
            : null,
      }))
    : [];

  return {
    id: flow._id,
    name: flow.name,
    trigger: flow.trigger,
    targetType: flow.targetType,
    targetMediaId: flow.targetMediaId || undefined,
    keyword: flow.keyword,
    commentReplyMessage: flow.commentReplyMessage || '',
    messages: safeMessages,
    active: flow.active,
    createdAt: formatRelativeTime(flow.createdAt),
    stats: {
      triggered: flow.stats?.triggered ?? 0,
      replied: flow.stats?.replied ?? 0,
      clicked: flow.stats?.clicked ?? 0,
      conversions: flow.stats?.conversions ?? 0,
    },
    source: flow.source || 'user',
    linkedPostTopic: flow.linkedPostTopic || '',
  };
};

const buttonTypeMeta: Record<ButtonType, { label: string; icon: any; color: string; desc: string }> = {
  url: { label: 'Open Link', icon: Link2, color: 'text-blue-500', desc: 'Opens a URL in browser' },
  next: { label: 'Button', icon: MoveDown, color: 'text-primary', desc: 'Sends the next DM' },
  follow: { label: 'Follow', icon: UserPlus, color: 'text-emerald-500', desc: 'Prompts user to follow you' },
  visit_profile: { label: 'Visit Profile', icon: ExternalLink, color: 'text-amber-500', desc: 'Opens your IG profile' },
};

const triggerLabels = {
  comment: { label: 'Comment Trigger', icon: MessageSquare, color: 'text-primary' },
  story_reply: { label: 'Story Reply', icon: Send, color: 'text-amber-500' },
  dm_keyword: { label: 'DM Keyword', icon: Hash, color: 'text-emerald-500' },
};

const DashboardDMs = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [wizardStep, setWizardStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'paused'>('all');
  const [previewFlow, setPreviewFlow] = useState<Flow | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [automations, setAutomations] = useState<{
    storyMention: { active: boolean; message: string };
    defaultReply: { active: boolean; message: string };
  }>({
    storyMention: { active: false, message: "" },
    defaultReply: { active: false, message: "" }
  });
  const [editModal, setEditModal] = useState<{
    type: 'storyMention' | 'defaultReply' | null;
    message: string;
  }>({ type: null, message: '' });



  // Fetch media + flow data on mount
  React.useEffect(() => {
    const fetchMedia = async () => {
      setIsLoadingMedia(true);
      try {
        const res = await fetch(`${API_BASE}/instagram/feed`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }
        });
        const data = await res.json();
        if (data.data) setMedia(data.data);
      } catch (err) {
        console.error('Failed to fetch media:', err);
      } finally {
        setIsLoadingMedia(false);
      }
    };

    const fetchFlows = async () => {
      setIsLoadingFlows(true);
      setFlowError(null);
      try {
        const res = await fetch(`${API_BASE}/dm-flows`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to fetch flows');
        }

        const mapped = Array.isArray(data?.data) ? data.data.map((item: ApiFlow) => toUIFlow(item)).filter(f => f.source !== 'ai_suggested') : [];
        setFlows(mapped);
      } catch (err) {
        console.error('Failed to fetch flows:', err);
        setFlowError('Unable to load your DM flows right now.');
      } finally {
        setIsLoadingFlows(false);
      }
    };

    const fetchAutomations = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/instagram/automations`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setAutomations(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch automations:', err);
      }
    };

    fetchMedia();
    fetchFlows();
    fetchAutomations();
  }, []);

  const [newFlow, setNewFlow] = useState<{
    id?: string;
    name: string;
    trigger: Flow['trigger'];
    targetType: Flow['targetType'];
    targetMediaId?: string;
    keyword: string;
    commentReplyMessage: string;
    messages: FlowMessage[];
  }>(getInitialFlow());

  const wizardSteps = [
    { title: 'Target', desc: 'Where should this trigger?' },
    { title: 'Type', desc: 'Campaign identity' },
    { title: 'Keyword', desc: 'What word triggers the DM?' },
    { title: 'Sequence', desc: 'Build your DM flow' },
  ];

  const resetWizard = () => {
    setNewFlow(getInitialFlow());
    setWizardStep(0);
    setView('list');
  };

  // ─── Message helpers ───
  const updateMessage = (mid: string, patch: Partial<FlowMessage>) => {
    setNewFlow(f => ({ ...f, messages: f.messages.map(m => m.id === mid ? { ...m, ...patch } : m) }));
  };
  const addMessage = () => {
    setNewFlow(f => ({ ...f, messages: [...f.messages, { id: uid(), text: '', buttons: [] }] }));
  };
  const removeMessage = (mid: string) => {
    setNewFlow(f => ({ ...f, messages: f.messages.filter(m => m.id !== mid) }));
  };
  const addButton = (mid: string, type: ButtonType) => {
    const defaults: Record<ButtonType, { label: string; url?: string }> = {
      url: { label: 'Open Link', url: '' },
      next: { label: 'Continue' },
      follow: { label: 'Follow' },
      visit_profile: { label: 'Visit Profile', url: 'https://instagram.com/yourbrand' },
    };
    const newBtn: FlowButton = { id: uid(), type, ...defaults[type] };
    updateMessage(mid, { buttons: [...(newFlow.messages.find(m => m.id === mid)?.buttons || []), newBtn] });
  };
  const updateButton = (mid: string, bid: string, patch: Partial<FlowButton>) => {
    const msg = newFlow.messages.find(m => m.id === mid);
    if (!msg) return;
    updateMessage(mid, { buttons: msg.buttons.map(b => b.id === bid ? { ...b, ...patch } : b) });
  };
  const removeButton = (mid: string, bid: string) => {
    const msg = newFlow.messages.find(m => m.id === mid);
    if (!msg) return;
    updateMessage(mid, { buttons: msg.buttons.filter(b => b.id !== bid) });
  };

  const handleCreateFlow = async () => {
    const preparedMessages = newFlow.messages
      .filter((message) => message.text.trim().length > 0)
      .map((message) => ({
        ...message,
        text: message.text.trim(),
        buttons: message.buttons.map((button) => ({
          ...button,
          label: button.label.trim(),
          url: button.url?.trim(),
        })),
      }));

    if (preparedMessages.length === 0) {
      setFlowError('Please add at least one message before activating the flow.');
      return;
    }

    setIsSavingFlow(true);
    setFlowError(null);

    try {
      const isEditing = !!newFlow.id;
      const url = isEditing ? `${API_BASE}/dm-flows/${newFlow.id}` : `${API_BASE}/dm-flows`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: newFlow.name,
          trigger: newFlow.trigger,
          targetType: newFlow.targetType,
          targetMediaId: newFlow.targetType === 'specific' ? newFlow.targetMediaId : undefined,
          keyword: newFlow.keyword,
          commentReplyMessage: newFlow.commentReplyMessage,
          messages: preparedMessages,
          active: true, // Auto-enable on save
          source: 'user', // Transition flow from ai_suggested to user flow on save/activation
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.errors?.[0] || data?.message || `Failed to ${isEditing ? 'update' : 'create'} flow`);
      }

      const updated = toUIFlow(data as ApiFlow);
      if (isEditing) {
        setFlows((prev) => prev.map((item) => (item.id === newFlow.id ? updated : item)));
      } else {
        setFlows((prev) => [updated, ...prev]);
      }
      resetWizard();
    } catch (err) {
      console.error('Failed to create flow:', err);
      setFlowError(err instanceof Error ? err.message : 'Failed to create flow.');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const setupAndEditFlow = (flow: Flow) => {
    setNewFlow({
      id: flow.id,
      name: flow.name,
      trigger: flow.trigger,
      targetType: flow.targetType,
      targetMediaId: flow.targetMediaId,
      keyword: flow.keyword,
      commentReplyMessage: flow.commentReplyMessage,
      messages: flow.messages.map(m => ({
        id: m.id || uid(),
        text: m.text,
        conditional: m.conditional,
        buttons: m.buttons ? m.buttons.map(b => ({
          id: b.id || uid(),
          label: b.label,
          type: b.type,
          url: b.url || ''
        })) : []
      }))
    });
    setWizardStep(3); // Sequence step
    setView('create');
  };

  const toggleFlow = async (id: string) => {
    const flow = flows.find((item) => item.id === id);
    if (!flow) return;

    setFlowError(null);

    try {
      const res = await fetch(`${API_BASE}/dm-flows/${id}/active`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ active: !flow.active }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update flow status');
      }

      const updated = toUIFlow(data as ApiFlow);
      setFlows((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error('Failed to toggle flow:', err);
      setFlowError(err instanceof Error ? err.message : 'Failed to update flow status.');
    }
  };

  const deleteFlow = async (id: string) => {
    setFlowError(null);

    try {
      const res = await fetch(`${API_BASE}/dm-flows/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Failed to delete flow');
      }

      setFlows((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete flow:', err);
      setFlowError(err instanceof Error ? err.message : 'Failed to delete flow.');
    }
  };

  const toggleAutomation = async (type: 'storyMention' | 'defaultReply') => {
    const newVal = !automations[type].active;
    try {
      const res = await fetch(`${API_BASE}/auth/instagram/automations/${type}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ active: newVal }),
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => ({ ...prev, [type]: { ...prev[type], active: newVal } }));
      }
    } catch (err) {
      console.error('Failed to toggle automation:', err);
    }
  };

  const editAutomation = (type: 'storyMention' | 'defaultReply') => {
    setEditModal({ type, message: automations[type].message });
  };

  const saveAutomation = async () => {
    const { type, message } = editModal;
    if (!type) return;

    try {
      const res = await fetch(`${API_BASE}/auth/instagram/automations/${type}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => ({ ...prev, [type]: { ...prev[type], message } }));
        setEditModal({ type: null, message: '' });
      }
    } catch (err) {
      console.error('Failed to save automation:', err);
    }
  };

  const filtered = flows.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterActive === 'all'
      || (filterActive === 'active' && f.active)
      || (filterActive === 'paused' && !f.active);
    return matchSearch && matchFilter;
  });

  const canProceed = () => {
    switch (wizardStep) {
      case 0: return newFlow.targetType === 'all' || !!newFlow.targetMediaId;
      case 1: return true;
      case 2: return newFlow.keyword.trim().length > 0;
      case 3: return newFlow.messages.some(m => m.text.trim().length > 0);
      default: return false;
    }
  };

  // ─── FULL PAGE CREATE VIEW ───
  if (view === 'create') {
    return (
      <div className="max-w-5xl mx-auto">
        {/* Back & Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={resetWizard} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to flows
          </button>
          <h1 className="text-2xl font-bold text-foreground">{newFlow.id ? 'Setup & Customize AI Flow' : 'Create New Flow'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{wizardSteps[wizardStep].desc}</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {wizardSteps.map((s, i) => (
              <button
                key={i}
                onClick={() => { if (i < wizardStep) setWizardStep(i); }}
                className="flex-1 flex flex-col items-center gap-1.5 group"
                disabled={i > wizardStep}
              >
                <div className="w-full flex items-center gap-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                    i < wizardStep ? 'bg-primary text-primary-foreground' :
                      i === wizardStep ? 'bg-primary/15 text-primary ring-2 ring-primary/30' :
                        'bg-muted text-muted-foreground'
                  )}>
                    {i < wizardStep ? '✓' : i + 1}
                  </div>
                  {i < wizardSteps.length - 1 && (
                    <div className={cn('h-0.5 flex-1 rounded-full transition-all duration-500', i < wizardStep ? 'bg-primary' : 'bg-muted')} />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-semibold transition-colors hidden sm:block',
                  i <= wizardStep ? 'text-primary' : 'text-muted-foreground/50'
                )}>{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form - Left */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={wizardStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {/* Step 0: Target */}
                {wizardStep === 0 && (
                  <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6 space-y-6">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-3">Targeting Scope</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setNewFlow({ ...newFlow, targetType: 'all' })}
                          className={cn(
                            'p-6 rounded-2xl border text-center transition-all',
                            newFlow.targetType === 'all' ? 'border-primary bg-primary/10' : 'border-border/40 bg-muted/20'
                          )}
                        >
                          <Zap size={24} className={cn('mx-auto mb-2', newFlow.targetType === 'all' ? 'text-primary' : 'text-muted-foreground')} />
                          <p className="text-sm font-bold">All Posts</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Triggers on any post</p>
                        </button>
                        <button
                          onClick={() => setNewFlow({ ...newFlow, targetType: 'specific' })}
                          className={cn(
                            'p-6 rounded-2xl border text-center transition-all',
                            newFlow.targetType === 'specific' ? 'border-primary bg-primary/10' : 'border-border/40 bg-muted/20'
                          )}
                        >
                          <ImageIcon size={24} className={cn('mx-auto mb-2', newFlow.targetType === 'specific' ? 'text-primary' : 'text-muted-foreground')} />
                          <p className="text-sm font-bold">Specific Post</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Triggers on selected media</p>
                        </button>
                      </div>
                    </div>

                    {newFlow.targetType === 'specific' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Select Media from Feed</label>
                        <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto p-1 scrollbar-hide">
                          {isLoadingMedia ? (
                            Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                            ))
                          ) : media.length > 0 ? (
                            media.map((post) => (
                              <button
                                key={post.id}
                                onClick={() => setNewFlow({ ...newFlow, targetMediaId: post.id })}
                                className={cn(
                                  "aspect-square rounded-xl overflow-hidden border-2 transition-all relative group",
                                  newFlow.targetMediaId === post.id ? "border-primary scale-[1.02] shadow-lg shadow-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                              >
                                {post.type === 'VIDEO' ? (
                                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <Zap size={20} className="text-white/40" />
                                    <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                  </div>
                                ) : (
                                  <img src={post.media_url} className="w-full h-full object-cover" />
                                )}

                                {newFlow.targetMediaId === post.id && (
                                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                                    <div className="bg-white rounded-full p-1 text-primary shadow-xl">
                                      <Zap size={14} fill="currentColor" />
                                    </div>
                                  </div>
                                )}

                                {/* Hover caption preview */}
                                <div className="absolute inset-x-0 bottom-0 p-1.5 translate-y-full group-hover:translate-y-0 transition-transform bg-black/60 backdrop-blur-sm">
                                  <p className="text-[8px] text-white truncate text-center">{post.caption || 'Product Reel'}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-3 py-10 text-center">
                              <p className="text-xs text-muted-foreground">No media found or Instagram not connected.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 1: Trigger */}
                {wizardStep === 1 && (
                  <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6 space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-2">Flow Name (optional)</label>
                      <Input
                        placeholder="e.g. Link Drop Flow"
                        value={newFlow.name}
                        onChange={e => setNewFlow({ ...newFlow, name: e.target.value })}
                        className="rounded-xl bg-background/60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-3">Trigger Type</label>
                      <div className="p-5 rounded-2xl border border-primary bg-primary/10 shadow-sm shadow-primary/10 transition-all duration-200 text-center max-w-xs mx-auto sm:mx-0 sm:text-left sm:flex sm:items-center sm:gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto sm:mx-0 shrink-0">
                          <MessageSquare size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground mt-2 sm:mt-0">Comment-to-DM Campaign</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">This flow automates a private DM whenever someone drops a specific keyword on your post.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Keyword */}
                {wizardStep === 2 && (
                  <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6 space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Trigger Keyword</label>
                      <p className="text-[11px] text-muted-foreground mb-3">When someone {newFlow.trigger === 'comment' ? 'comments' : newFlow.trigger === 'story_reply' ? 'replies to your story with' : 'DMs you'} this word, the flow activates.</p>
                      <Input
                        placeholder="e.g. Link, menu, price"
                        value={newFlow.keyword}
                        onChange={e => setNewFlow({ ...newFlow, keyword: e.target.value })}
                        className="rounded-xl bg-background/60 text-lg font-mono"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">What to reply to comment msg</label>
                      <p className="text-[11px] text-muted-foreground mb-3">This public reply is sent on the comment before the DM. Use <span className="font-mono">{'{{username}}'}</span> to mention the commenter.</p>
                      <Textarea
                        placeholder="{{username}} Check your DM"
                        value={newFlow.commentReplyMessage}
                        onChange={e => setNewFlow({ ...newFlow, commentReplyMessage: e.target.value })}
                        className="min-h-[96px] rounded-xl bg-background/60 text-sm font-medium resize-none"
                      />
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary font-medium flex items-center gap-2">
                        <Sparkles size={14} /> Tip: Pick a word your audience naturally types in comments
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Messages Builder */}
                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-2.5">
                      <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-foreground font-medium">Build your DM sequence</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Add messages and attach buttons. Use "Next Message" buttons to chain flows.</p>
                      </div>
                    </div>

                    {newFlow.messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {idx === 0 ? 'Hook Message' : `Message ${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {idx === 0 ? 'Auto-sent right after trigger' : 'Sent when previous button is tapped'}
                              </p>
                            </div>
                          </div>
                          {newFlow.messages.length > 1 && (
                            <button
                              onClick={() => removeMessage(msg.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Conditional badge for non-first messages */}
                        {idx > 0 && (
                          <div className="mb-3">
                            <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Condition (optional)</label>
                            <div className="flex flex-wrap gap-2">
                              {([
                                { v: null, label: 'Always send' },
                                { v: 'if_not_following', label: 'If not following' },
                                { v: 'if_following', label: 'If following' },
                              ] as const).map(c => (
                                <button
                                  key={String(c.v)}
                                  onClick={() => updateMessage(msg.id, { conditional: c.v })}
                                  className={cn(
                                    'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                    (msg.conditional ?? null) === c.v
                                      ? 'bg-primary/15 text-primary border border-primary/30'
                                      : 'bg-muted/60 text-muted-foreground border border-transparent hover:bg-muted'
                                  )}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <Textarea
                          placeholder={idx === 0 ? "Hey! 👋 Thanks for reaching out..." : "You haven't followed yet — tap below to unlock!"}
                          value={msg.text}
                          onChange={e => updateMessage(msg.id, { text: e.target.value })}
                          className="rounded-xl bg-background/60 min-h-[90px] resize-none text-sm"
                        />

                        {/* Buttons */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Buttons {msg.buttons.length > 0 && `(${msg.buttons.length}/3)`}
                            </label>
                          </div>

                          {msg.buttons.map(btn => {
                            const meta = buttonTypeMeta[btn.type];
                            return (
                              <div key={btn.id} className="bg-muted/40 rounded-xl p-3 border border-border/30 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-background', meta.color)}>
                                    <meta.icon size={13} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-foreground">{meta.label}</p>
                                    <p className="text-[9px] text-muted-foreground">{meta.desc}</p>
                                  </div>
                                  <button
                                    onClick={() => removeButton(msg.id, btn.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                <Input
                                  placeholder="Button label"
                                  value={btn.label}
                                  onChange={e => updateButton(msg.id, btn.id, { label: e.target.value })}
                                  className="rounded-lg bg-background/80 h-8 text-xs"
                                />
                                {(btn.type === 'url' || btn.type === 'visit_profile') && (
                                  <Input
                                    placeholder={btn.type === 'visit_profile' ? "https://instagram.com/yourbrand" : "https://your-link.com"}
                                    value={btn.url || ''}
                                    onChange={e => updateButton(msg.id, btn.id, { url: e.target.value })}
                                    className="rounded-lg bg-background/80 h-8 text-xs font-mono"
                                  />
                                )}
                                {btn.type === 'next' && (
                                  <p className="text-[10px] text-muted-foreground italic px-1">→ Triggers next message in sequence</p>
                                )}
                              </div>
                            );
                          })}

                          {msg.buttons.length < 3 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                              {(Object.keys(buttonTypeMeta) as ButtonType[]).map(type => {
                                const meta = buttonTypeMeta[type];
                                return (
                                  <button
                                    key={type}
                                    onClick={() => addButton(msg.id, type)}
                                    className="p-2 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-center transition-all group"
                                  >
                                    <meta.icon size={14} className={cn('mx-auto mb-1', meta.color)} />
                                    <p className="text-[10px] font-semibold text-foreground">{meta.label}</p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Add Message */}
                    <button
                      onClick={addMessage}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary group"
                    >
                      <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                      Add Another Message
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                onClick={() => wizardStep === 0 ? resetWizard() : setWizardStep(wizardStep - 1)}
                className="rounded-xl gap-2"
              >
                <ArrowLeft size={16} /> {wizardStep === 0 ? 'Cancel' : 'Back'}
              </Button>
              {wizardStep < wizardSteps.length - 1 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canProceed()}
                  className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                >
                  Next <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateFlow}
                  disabled={!canProceed() || isSavingFlow}
                  className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20"
                >
                  <Zap size={16} /> {isSavingFlow ? 'Saving...' : newFlow.id ? 'Enable & Go Live 🚀' : 'Activate Flow'}
                </Button>
              )}
            </div>
          </div>

          {/* Live Preview - Right */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border/40 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Live Preview</p>
                  <p className="text-xs text-foreground font-medium mt-0.5">DM Conversation</p>
                </div>
                <div className="p-4 space-y-4 min-h-[320px] max-h-[60vh] overflow-y-auto bg-slate-50/50 rounded-b-2xl scrollbar-hide">
                  {/* Outer Trigger (User Comment) */}
                  {newFlow.keyword && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">Comment</span>
                      <div className="bg-white text-foreground rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] shadow-sm border border-border/50">
                        <p className="text-[12px] font-medium leading-tight">{newFlow.keyword}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Messages chain */}
                  {newFlow.messages.map((msg, mi) => {
                    const hasTextOrButtons = msg.text || msg.buttons.length > 0;
                    if (!hasTextOrButtons) return null;
                    const previousButtonLabel = mi > 0
                      ? newFlow.messages[mi - 1].buttons.find(b => b.type === 'next')?.label || 'Clicked Button'
                      : '';
                    const shouldShowTransitionBubble = mi > 0 && msg.conditional !== 'if_following';

                    return (
                      <React.Fragment key={msg.id}>
                        {/* User reply from previous message's button */}
                        {shouldShowTransitionBubble && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-end"
                          >
                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] shadow-sm">
                              <p className="text-[12px] font-medium leading-tight">
                                {previousButtonLabel}
                              </p>
                            </div>
                          </motion.div>
                        )}

                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="flex flex-col gap-1.5"
                        >
                          {msg.conditional && (
                            <div className="flex justify-center my-1">
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold uppercase tracking-wider">
                                {msg.conditional === 'if_following' ? 'If Following' : 'If Not Following'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <Sparkles size={12} className="text-white" />
                            </div>

                            <div className="bg-white rounded-2xl rounded-tl-md max-w-[85%] overflow-hidden border border-border/80 shadow-sm">
                              {msg.text && (
                                <div className="px-3.5 py-2.5">
                                  <p className="text-[12px] text-foreground whitespace-pre-wrap leading-[1.4]">{msg.text}</p>
                                </div>
                              )}

                              {msg.buttons.length > 0 && (
                                <div className="flex flex-col border-t border-border/50 bg-muted/5">
                                  {msg.buttons.map((btn, bi) => (
                                    <div
                                      key={btn.id}
                                      className={cn(
                                        "py-2.5 text-center text-[12px] font-bold border-b border-border/50 last:border-0 cursor-default transition-all",
                                        btn.type === 'url' ? 'text-primary' :
                                          'text-foreground/80'
                                      )}
                                    >
                                      {btn.label || buttonTypeMeta[btn.type].label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}

                  {!newFlow.keyword && newFlow.messages.every(m => !m.text) && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                        <MessageCircle size={24} className="text-muted-foreground/30" />
                      </div>
                      <p className="text-xs text-muted-foreground/60 font-medium tracking-wide">Flow Preview empty</p>
                      <p className="text-[10px] text-muted-foreground/30 mt-1 uppercase tracking-widest font-bold">Start building your sequence</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Flow Summary */}
              {wizardStep >= 2 && newFlow.messages.some(m => m.text) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-4">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Flow Summary</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">T</span>
                      <span className="text-muted-foreground shrink-0">Trigger:</span>
                      <span className="text-foreground font-medium truncate">{triggerLabels[newFlow.trigger].label} → "{newFlow.keyword}"</span>
                    </div>
                    {newFlow.messages.filter(m => m.text).map((m, i) => (
                      <div key={m.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                        <span className="text-muted-foreground shrink-0">Msg {i + 1}:</span>
                        <span className="text-foreground font-medium truncate">
                          {m.text.slice(0, 30)}{m.text.length > 30 ? '...' : ''}
                          {m.buttons.length > 0 && <span className="text-primary"> +{m.buttons.length} btn</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

  // ─── LIST VIEW ───
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle size={22} className="text-primary" />
            DM Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Auto-reply to comments & DMs with intelligent flows</p>
        </div>
        <Button onClick={() => setView('create')} className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <Plus size={16} /> New Flow
        </Button>
      </div>

      {flowError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {flowError}
        </div>
      )}

      {/* Global Auto-Replies */}
      <div>
        <h2 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3 px-1 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" /> Always-On Automations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/60 backdrop-blur-sm border border-border/40 hover:border-amber-500/30 rounded-2xl p-5 flex gap-4 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 transition-colors">
              <Send size={20} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground text-sm">📸 Story Mention Reply</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Instantly thank anyone who tags your account in their story.</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border/50 shrink-0">
                  <button
                    onClick={() => editAutomation('storyMention')}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background"
                  >
                    <PenLine size={13} />
                  </button>
                  <button
                    onClick={() => toggleAutomation('storyMention')}
                    className={cn(
                      "p-1 px-2 transition-colors flex items-center gap-1.5",
                      automations.storyMention.active ? "text-emerald-500" : "text-muted-foreground/40"
                    )}
                  >
                    {automations.storyMention.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span className="text-[10px] font-bold">{automations.storyMention.active ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 bg-muted/40 rounded-xl p-3 border border-border/40">
                <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                  {automations.storyMention.message ? `"${automations.storyMention.message.slice(0, 40)}..."` : "No message set"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-sm border border-border/40 hover:border-emerald-500/30 rounded-2xl p-5 flex gap-4 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/20 transition-colors">
              <MessageSquare size={20} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground text-sm">👋 Default DM Auto-Reply</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Instantly greet anyone who sends you a fresh direct message.</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border/50 shrink-0">
                  <button
                    onClick={() => editAutomation('defaultReply')}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background"
                  >
                    <PenLine size={13} />
                  </button>
                  <button
                    onClick={() => toggleAutomation('defaultReply')}
                    className={cn(
                      "p-1 px-2 transition-colors flex items-center gap-1.5",
                      automations.defaultReply.active ? "text-emerald-500" : "text-muted-foreground/40"
                    )}
                  >
                    {automations.defaultReply.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span className="text-[10px] font-bold">{automations.defaultReply.active ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 bg-muted/40 rounded-xl p-3 border border-border/40">
                <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                  {automations.defaultReply.message ? `"${automations.defaultReply.message.slice(0, 40)}..."` : "No message set"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-2" />

      <h2 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3 px-1 flex items-center gap-2">
        <Zap size={14} className="text-primary" /> Multi-Step Campaigns
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Flows', value: flows.length, icon: Zap, gradient: 'from-primary/15 to-primary/5' },
          { label: 'Active', value: flows.filter(f => f.active).length, icon: ToggleRight, gradient: 'from-emerald-500/15 to-emerald-500/5' },
          { label: 'Total Replies', value: flows.reduce((s, f) => s + f.stats.replied, 0).toLocaleString(), icon: Send, gradient: 'from-blue-500/15 to-blue-500/5' },
          { label: 'Link Clicks', value: flows.reduce((s, f) => s + f.stats.clicked, 0).toLocaleString(), icon: MousePointerClick, gradient: 'from-amber-500/15 to-amber-500/5' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('p-4 rounded-2xl bg-gradient-to-br border border-border/40', stat.gradient)}>
            <stat.icon size={18} className="text-muted-foreground mb-2" />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search flows by name or keyword..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 rounded-xl bg-card/60 border-border/40" />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'paused'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={cn('px-4 py-2 rounded-xl text-xs font-semibold transition-all relative',
                filterActive === f ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card/60 text-muted-foreground border border-border/40 hover:bg-muted/60')}>
              <span className="capitalize">{f}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flows */}
      <div className="space-y-3">
        {isLoadingFlows ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-card/40 rounded-2xl border border-border/30">
            <MessageCircle size={36} className="mx-auto text-muted-foreground/30 mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading your automation flows...</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-card/40 rounded-2xl border border-border/30">
                <MessageCircle size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No flows found. Create your first automation! 🤖</p>
              </motion.div>
            ) : filtered.map((flow, i) => (
              <motion.div key={flow.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                className="group bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        flow.active ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        {React.createElement(triggerLabels[flow.trigger].icon, { size: 18, className: flow.active ? triggerLabels[flow.trigger].color : 'text-muted-foreground' })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">{flow.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            flow.targetType === 'specific' ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                          )}>
                            {flow.targetType === 'specific' ? 'Single Post' : 'All Posts'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{triggerLabels[flow.trigger].label}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] font-mono text-muted-foreground">"{flow.keyword}"</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">{flow.messages.length} msg{flow.messages.length > 1 ? 's' : ''}</span>
                          <span className="text-[10px] text-muted-foreground">• {flow.createdAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-[52px]">
                      {[
                        { label: 'Triggered', value: flow.stats.triggered },
                        { label: 'Replied', value: flow.stats.replied },
                        { label: 'Clicks', value: flow.stats.clicked },
                        { label: 'Conversions', value: flow.stats.conversions },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="text-sm font-bold text-foreground">{s.value}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setPreviewFlow(flow)}><Eye size={16} className="text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => toggleFlow(flow.id)}>
                      {flow.active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => deleteFlow(flow.id)}><Trash2 size={15} className="text-muted-foreground hover:text-destructive" /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFlow && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" onClick={() => setPreviewFlow(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[8%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto sm:w-[460px] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{previewFlow.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Flow Preview — DM Conversation</p>
                </div>
                <button onClick={() => setPreviewFlow(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} className="text-muted-foreground" /></button>
              </div>
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto bg-slate-50/50 scrollbar-hide">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">Comment</span>
                  <div className="bg-white text-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%] shadow-sm border border-border/50">
                    <p className="text-xs font-medium">
                      {previewFlow.keyword}
                    </p>
                  </div>
                </div>

                {previewFlow.messages.map((msg, mi) => (
                  <React.Fragment key={msg.id}>
                    {mi > 0 && msg.conditional !== 'if_following' && (
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%] shadow-sm">
                          <p className="text-xs font-medium">
                            {previewFlow.messages[mi - 1].buttons.find(b => b.type === 'next')?.label || 'Clicked Button'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {msg.conditional && (
                        <div className="flex justify-center">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold uppercase tracking-wider">
                            {msg.conditional === 'if_following' ? 'If Following' : 'If Not Following'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Sparkles size={14} className="text-white" />
                        </div>

                        <div className="bg-white rounded-2xl rounded-tl-md max-w-[85%] overflow-hidden border border-border/80 shadow-md">
                          {msg.text && (
                            <div className="px-4 py-2.5">
                              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            </div>
                          )}

                          {msg.buttons.length > 0 && (
                            <div className="flex flex-col border-t border-border/50 bg-muted/5">
                              {msg.buttons.map(btn => (
                                <div
                                  key={btn.id}
                                  className={cn(
                                    "py-3 text-center text-xs font-bold border-b border-border/50 last:border-0",
                                    btn.type === 'url' ? 'text-primary' : 'text-foreground/80'
                                  )}
                                >
                                  {btn.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Automation Edit Modal */}
      <AnimatePresence>
        {editModal.type && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModal({ type: null, message: '' })}
              className="fixed inset-0 bg-background/40 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-lg bg-card border border-border/60 rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden"
            >
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                    editModal.type === 'storyMention' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {editModal.type === 'storyMention' ? <Send size={20} /> : <MessageSquare size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Edit {editModal.type === 'storyMention' ? 'Story Mention' : 'Welcome'} Message
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest font-black">Automation Configuration</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground px-1 uppercase tracking-tight">Response Content</label>
                  <Textarea
                    value={editModal.message}
                    onChange={(e) => setEditModal(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Type your automated response here..."
                    className="min-h-[140px] rounded-2xl bg-muted/20 border-border/40 focus:ring-primary/20 text-sm leading-relaxed scrollbar-hide"
                  />
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Sparkles size={12} className="text-primary" /> Keep it friendly and concise</p>
                    <p className={cn("text-[10px] font-mono", editModal.message.length > 280 ? "text-destructive" : "text-muted-foreground")}>
                      {editModal.message.length}/280
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditModal({ type: null, message: '' })}
                  className="flex-1 rounded-2xl h-11 text-sm font-bold border-border/60 hover:bg-background transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAutomation}
                  className="flex-1 rounded-2xl h-11 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardDMs;
