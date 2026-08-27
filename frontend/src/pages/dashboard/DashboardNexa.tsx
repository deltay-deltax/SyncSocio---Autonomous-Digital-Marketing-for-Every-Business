import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Package, MapPin, Phone, CreditCard, Clock, MessageSquare, AlertCircle, ShoppingBag, Users, Zap, TrendingUp,
  Truck, CheckCircle2, XCircle, Boxes, Calendar, Building, Mail, Briefcase, Send, BookOpen, Settings, ArrowRight, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { Checkout } from '@/components/Checkout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const isLeadDemo = (convo: any) => {
  if (!convo) return false;
  const status = convo.order_status || '';
  if (['demo_booked', 'meeting_scheduled', 'contacted', 'lead_captured'].includes(status)) return true;
  if (convo.collected?.lead_type === 'saas_demo' || convo.collected?.lead_type === 'saas_lead') return true;
  if (convo.collected?.meeting_time || convo.collected?.company_name) return true;
  if (!convo.collected?.delivery_address && convo.collected?.email) return true;
  return false;
};

const renderStatusBadge = (convo: any) => {
  const isDemo = isLeadDemo(convo);
  const status = convo.order_status;

  if (!status || status === 'none') {
    return isDemo 
      ? <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-violet-500/10 text-violet-600 border-violet-500/20">Demo Lead</span>
      : null;
  }

  switch (status) {
    case 'demo_booked':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-violet-500/10 text-violet-600 border-violet-500/20">Demo Booked</span>;
    case 'meeting_scheduled':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-600 border-blue-500/20">Meeting Scheduled</span>;
    case 'contacted':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-600 border-amber-500/20">Contacted</span>;
    case 'lead_captured':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-cyan-500/10 text-cyan-600 border-cyan-500/20">Lead Captured</span>;
    case 'ordered':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-600 border-blue-500/20">Ordered</span>;
    case 'packing':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-600 border-amber-500/20">Packing</span>;
    case 'shipping':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-purple-500/10 text-purple-600 border-purple-500/20">Shipping</span>;
    case 'delivered':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{isDemo ? 'Completed' : 'Delivered'}</span>;
    case 'cancelled':
      return <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-rose-500/10 text-rose-600 border-rose-500/20">Cancelled</span>;
    default:
      return null;
  }
};

const DashboardNexa = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = (useOutletContext<any>() || { 
    profile: JSON.parse(localStorage.getItem('syncsocio_profile') || 'null') 
  });
  
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
  const isGrowth = planName.includes('growth');
  const isPro = planName.includes('pro');
  const isElite = planName.includes('elite');
  const isAgency = planName.includes('agency');
  const isMetaReviewer = profile?.userEmail === 'supportvelocitydm@gmail.com';

  // All plans now get Nexa. Starter = IG-only, 20 leads/month.
  const nexaUnlimited = profile?.nexaUnlimited || isGrowth || isPro || isElite || isAgency || isMetaReviewer;
  const isStarter = !nexaUnlimited;
  const STARTER_NEXA_LIMIT = 20;

  const brandLimit = profile?.brandLimit ?? (isAgency ? 8 : 1);
  const totalBrands = profile?.totalBrands ?? 1;
  const isInstagramConnected = !!profile?.instagramIsConnected && !!profile?.instagramBusinessAccountId && !!profile?.instagramAccessToken;

  // CRM State
  const [nexaConversations, setNexaConversations] = useState<any[]>([]);
  const [nexaConvLoading, setNexaConvLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'whatsapp'>('instagram');
  const [replyText, setReplyText] = useState('');
  const [learnCheckbox, setLearnCheckbox] = useState(true);
  const [replying, setReplying] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Nexa Setup Check
  const [nexaSetupBannerDismissed, setNexaSetupBannerDismissed] = useState(
    () => sessionStorage.getItem('nexa_setup_banner_dismissed') === 'true'
  );
  const [nexaIsConfigured, setNexaIsConfigured] = useState<boolean | null>(null); // null = loading

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  const getAuthHeaders = () => ({
    });

  useEffect(() => {
    // Fetch Nexa settings to check if configured
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/nexa/settings`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.settings) {
          const configured = !!data.settings.nexa_enabled || !!data.settings.business_context;
          setNexaIsConfigured(configured);
        } else {
          setNexaIsConfigured(false);
        }
      } catch {
        setNexaIsConfigured(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Fetch Nexa conversations
    (async () => {
      setNexaConvLoading(true);
      try {
        const res = await fetch(`${API_BASE}/nexa/conversations?limit=50`, { credentials: 'include', headers: getAuthHeaders() });
        const _rawJson83 = await res.json();
          const data = _rawJson83 && _rawJson83.success !== undefined ? (_rawJson83.success ? _rawJson83.data : _rawJson83) : _rawJson83;
        if (res.ok) {
          setNexaConversations(data.conversations || []);
          if (data.conversations?.length > 0) {
            setSelectedLeadId(data.conversations[0]._id);
          }
          // Use monthly_count from API if present (returned for Starter plans)
          if (typeof data.monthly_count === 'number') {
            setMonthlyCount(data.monthly_count);
          } else if (isStarter) {
            // Fallback: count from this month's conversations
            const startOfMonth = new Date();
            startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
            const thisMonthCount = (data.conversations || []).filter((c: any) => new Date(c.createdAt) >= startOfMonth).length;
            setMonthlyCount(thisMonthCount);
          }
        }
      } catch {}
      setNexaConvLoading(false);
    })();
  }, []);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedLeadId) return;
    setReplying(true);
    try {
      const res = await fetch(`${API_BASE}/nexa/conversations/${selectedLeadId}/reply`, { credentials: 'include',
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText, learn: learnCheckbox })
      });
      const _rawJson82 = await res.json();
      const data = _rawJson82 && _rawJson82.success !== undefined ? (_rawJson82.success ? (_rawJson82.data || _rawJson82) : _rawJson82) : _rawJson82;
      if (res.ok) {
        toast({ title: '✓ Reply Sent', description: 'Message delivered. Nexa AI will handle the next reply.' });
        setReplyText('');
        setNexaConversations(prev => prev.map(c => c._id === selectedLeadId ? data.convo : c));
        // Scroll to bottom after new message appears
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
    }
    setReplying(false);
  };

  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
  }, [selectedLeadId]);

  // Ctrl+Enter / Cmd+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleReply();
    }
  };

  const handleUpdateOrderStatus = async (newStatus: string) => {
    if (!selectedLeadId) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/nexa/conversations/${selectedLeadId}/order-status`, { credentials: 'include',
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus })
      });
      const _rawJson81 = await res.json();
        const data = _rawJson81 && _rawJson81.success !== undefined ? (_rawJson81.success ? _rawJson81.data : _rawJson81) : _rawJson81;
      if (res.ok) {
        toast({ title: 'Order Status Updated', description: `Status changed to ${newStatus.toUpperCase()}` });
        setNexaConversations(prev => prev.map(c => c._id === selectedLeadId ? { ...c, order_status: newStatus } : c));
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' });
    }
    setUpdatingStatus(false);
  };

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback 
        title="Connect Instagram for Nexa Agent" 
        description="To use the Nexa AI Sales Agent, you need to connect your Instagram Business account."
      />
    );
  }

  const limitReached = isStarter && monthlyCount >= STARTER_NEXA_LIMIT;

  const filteredConversations = nexaConversations.filter(c => (c.platform || 'instagram') === activePlatform);
  const selectedLead = nexaConversations.find(c => c._id === selectedLeadId);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background/50">
      <main className="flex-1 p-6 lg:p-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bot size={24} className="text-violet-500" /> Nexa CRM Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your AI-driven sales conversations and orders.
            </p>
          </div>
          {/* Starter Plan Usage Meter */}
          {isStarter && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
              limitReached
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : 'bg-violet-500/8 border-violet-500/20 text-violet-700 dark:text-violet-400'
            }`}>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} />
                    {limitReached ? 'Monthly limit reached' : `${monthlyCount} / ${STARTER_NEXA_LIMIT} leads this month`}
                  </span>
                </div>
                <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${limitReached ? 'bg-amber-500' : 'bg-violet-500'}`}
                    style={{ width: `${Math.min((monthlyCount / STARTER_NEXA_LIMIT) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/billing')}
                className="h-7 px-3 text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white shrink-0"
              >
                <TrendingUp size={11} className="mr-1" />
                Upgrade
              </Button>
            </div>
          )}
        </div>

        {/* Nexa Setup Banner */}
        {nexaIsConfigured === false && !nexaSetupBannerDismissed && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center gap-3 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute right-0 top-0 w-48 h-full bg-primary/5 blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3 flex-1 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                <Settings size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nexa AI isn't set up yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add your business context and enable Nexa so it can start auto-replying to your DMs and closing orders 24/7.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/settings', { state: { tab: 'Nexa AI Setup' } })}
                className="h-8 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                Set up Nexa <ArrowRight size={13} />
              </Button>
              <button
                onClick={() => { setNexaSetupBannerDismissed(true); sessionStorage.setItem('nexa_setup_banner_dismissed', 'true'); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
          
          {/* Left Panel - Leads List */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm flex flex-col h-full overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <Users size={16} /> Recent Leads
              </CardTitle>
              <div className="flex bg-muted/50 p-1 rounded-xl">
                <button
                  onClick={() => { setActivePlatform('instagram'); setSelectedLeadId(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activePlatform === 'instagram' ? 'bg-background shadow text-violet-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Instagram
                </button>
                <button
                  onClick={() => { if (!isStarter) { setActivePlatform('whatsapp'); setSelectedLeadId(null); } }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                    isStarter
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : activePlatform === 'whatsapp' ? 'bg-background shadow text-emerald-600' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isStarter ? 'WhatsApp Nexa available on Growth & Pro plans' : undefined}
                >
                  WhatsApp {isStarter && <span className="text-[9px] ml-0.5">🔒</span>}
                </button>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              {nexaConvLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-[1.5rem] bg-muted/60 border border-border/50"></div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                    <Bot size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map((convo: any) => (
                    <div 
                      key={convo._id} 
                      onClick={() => setSelectedLeadId(convo._id)}
                      className={`bg-card border ${selectedLeadId === convo._id ? 'border-violet-500 bg-violet-500/5 shadow-md' : 'border-border/50 hover:border-primary/30'} rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-foreground">{convo.collected?.customer_name || 'Unknown Lead'}</p>
                          <p className="text-xs text-muted-foreground">@{convo.ig_user_id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            convo.stage === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600' :
                            convo.stage === 'ESCALATED' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-violet-500/10 text-violet-600'
                          }`}>
                            {convo.stage.replace('_', ' ')}
                          </span>
                          {renderStatusBadge(convo)}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground truncate max-w-[200px] flex items-center gap-1">
                        {isLeadDemo(convo) ? (
                          <><Briefcase size={12} className="text-violet-500" /> {convo.collected?.company_name || convo.collected?.product_interested || 'Demo Meeting Request'}</>
                        ) : (
                          <><ShoppingBag size={12} /> {convo.collected?.product_interested || 'Discussing Options'}</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Right Panel - CRM Detail View */}
          <Card className="lg:col-span-2 rounded-[2rem] border-border/50 shadow-sm flex flex-col h-full overflow-hidden bg-card" style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedLead ? (
              <>
                <CardHeader className="p-6 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{selectedLead.collected?.customer_name || 'Unknown Customer'}</h2>
                      <p className="text-sm text-muted-foreground">{selectedLead.platform === 'whatsapp' ? 'WhatsApp' : 'IG'}: @{selectedLead.ig_user_id}</p>
                    </div>
                  </div>
                  {selectedLead.escalate_to_human && (
                    <span className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={14} /> Human Action Required
                    </span>
                  )}
                </CardHeader>
                
                <ScrollArea className="shrink-0 max-h-[200px] p-6 border-b border-border/30">
                  {/* Status & Action Bar (Context-aware for Demo Leads vs E-Commerce) */}
                  {(() => {
                    const isDemo = isLeadDemo(selectedLead);
                    return (
                      <div className="p-4 mb-6 rounded-2xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-0.5">
                            {isDemo ? 'Lead & Meeting Status' : 'Order Status'}
                          </span>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(selectedLead)}
                            <span className="text-xs text-muted-foreground">
                              {isDemo 
                                ? '(Nexa manages meeting schedule & onboarding)' 
                                : '(Nexa uses this to answer tracking inquiries)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isDemo ? [
                            { id: 'demo_booked', label: 'Demo Booked', icon: Calendar },
                            { id: 'contacted', label: 'Contacted', icon: Phone },
                            { id: 'delivered', label: 'Completed', icon: CheckCircle2 },
                            { id: 'cancelled', label: 'Cancelled', icon: XCircle },
                          ].map((st) => {
                            const Icon = st.icon;
                            const isActive = selectedLead.order_status === st.id || (!selectedLead.order_status && st.id === 'demo_booked');
                            return (
                              <button
                                key={st.id}
                                disabled={updatingStatus}
                                onClick={() => handleUpdateOrderStatus(st.id)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                                  isActive 
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm' 
                                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                                }`}
                              >
                                <Icon size={12} />
                                {st.label}
                              </button>
                            );
                          }) : [
                            { id: 'ordered', label: 'Ordered', icon: ShoppingBag },
                            { id: 'packing', label: 'Packing', icon: Boxes },
                            { id: 'shipping', label: 'Shipping', icon: Truck },
                            { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
                            { id: 'cancelled', label: 'Cancelled', icon: XCircle },
                          ].map((st) => {
                            const Icon = st.icon;
                            const isActive = selectedLead.order_status === st.id;
                            return (
                              <button
                                key={st.id}
                                disabled={updatingStatus}
                                onClick={() => handleUpdateOrderStatus(st.id)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                                  isActive 
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                                }`}
                              >
                                <Icon size={12} />
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Information Column 1 */}
                    {isLeadDemo(selectedLead) ? (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                          Inquiry Details
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Briefcase size={16} className="text-violet-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Product / Plan Interested</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.product_interested || 'General Demo Inquiry'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <CreditCard size={16} className="text-emerald-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Plan Pricing</p>
                              <p className="text-sm font-medium">
                                {selectedLead.collected?.price_agreed ? `₹${selectedLead.collected.price_agreed}/mo` : 'Custom / Demo'}
                              </p>
                            </div>
                          </div>

                          {selectedLead.collected?.use_case && (
                            <div className="flex items-start gap-3">
                              <Bot size={16} className="text-blue-500 mt-1 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Use Case</p>
                                <p className="text-sm font-medium">{selectedLead.collected.use_case}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                          Order Details
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Package size={16} className="text-violet-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Product Interested</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.product_interested || 'Not identified yet'}</p>
                              {selectedLead.collected?.quantity && (
                                <p className="text-xs font-bold text-primary mt-0.5">Qty: {selectedLead.collected.quantity}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <CreditCard size={16} className="text-emerald-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Pricing &amp; Payment</p>
                              <p className="text-sm font-medium">
                                {selectedLead.collected?.price_agreed ? `₹${selectedLead.collected.price_agreed}` : 'Not negotiated yet'}
                              </p>
                              {selectedLead.collected?.payment_mode && (
                                <p className="text-xs font-bold text-emerald-600 mt-0.5 uppercase tracking-wider">
                                  {selectedLead.collected.payment_mode} • {selectedLead.payment?.payment_status}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Information Column 2 */}
                    {isLeadDemo(selectedLead) ? (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                          Lead &amp; Meeting Profile
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Mail size={16} className="text-violet-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Work Email</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.email || 'Not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <Building size={16} className="text-blue-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Company Name</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.company_name || 'Not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <Calendar size={16} className="text-amber-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Preferred Meeting Time</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.meeting_time || 'Not specified'}</p>
                            </div>
                          </div>

                          {selectedLead.collected?.phone_number && (
                            <div className="flex items-start gap-3">
                              <Phone size={16} className="text-emerald-500 mt-1 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Phone / WhatsApp</p>
                                <p className="text-sm font-medium">{selectedLead.collected.phone_number}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                          Shipping Profile
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Phone size={16} className="text-blue-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone Number</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.phone_number || 'Not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-rose-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Delivery Address</p>
                              <p className="text-sm font-medium">{selectedLead.collected?.delivery_address || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </ScrollArea>

                {/* ── Chat Transcript ─────────────────────────────────── */}
                <div className="flex-1 overflow-hidden flex flex-col border-t border-border/30">
                  <div className="flex-none px-6 pt-4 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                      <MessageSquare size={16} /> Chat Transcript
                    </h3>
                  </div>
                  <ScrollArea className="flex-1 px-6">
                    <div className="space-y-3 pb-4">
                      {selectedLead.conversation_history && selectedLead.conversation_history.length > 0 ? (
                        selectedLead.conversation_history.map((msg: any, idx: number) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'nexa' ? 'items-start' : 'items-end'}`}>
                            <span className="text-[10px] text-muted-foreground font-medium mb-1 px-1">
                              {msg.role === 'nexa' ? '🤖 Nexa' : '👤 Customer'}
                              {msg.timestamp && (
                                <span className="ml-2 opacity-60">
                                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                              msg.role === 'nexa' 
                                ? 'bg-card border border-border/60 text-foreground rounded-tl-sm shadow-sm' 
                                : 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No conversation history yet.</p>
                      )}
                      {/* Scroll anchor */}
                      <div ref={chatBottomRef} />
                    </div>
                  </ScrollArea>
                </div>

                  {/* ── Always-visible Reply Bar ─────────────────────────── */}
                  <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
                    {selectedLead.escalate_to_human && (
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <AlertCircle size={13} className="text-amber-500 shrink-0" />
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Human action requested — Nexa paused on this conversation.
                        </p>
                      </div>
                    )}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          value={replyText}
                          onChange={(e) => {
                            setReplyText(e.target.value);
                            // Auto-grow
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder={`Reply as ${selectedLead.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'} brand... (Ctrl+Enter to send)`}
                          rows={1}
                          className="w-full resize-none overflow-hidden p-3 pr-4 text-sm rounded-2xl border border-border bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all placeholder:text-muted-foreground/60"
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                      </div>
                      <button
                        onClick={handleReply}
                        disabled={replying || !replyText.trim()}
                        className="shrink-0 h-11 w-11 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                        title="Send reply (Ctrl+Enter)"
                      >
                        {replying
                          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <Send size={16} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={learnCheckbox}
                          onChange={(e) => setLearnCheckbox(e.target.checked)}
                          className="rounded accent-violet-600"
                        />
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                          <BookOpen size={11} /> Auto-learn from this reply
                        </span>
                      </label>
                      <span className="text-[10px] text-muted-foreground/50">
                        Nexa AI resumes after your reply
                      </span>
                    </div>
                  </div>
                </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground">
                  <User size={32} />
                </div>
                <div>
                  <p className="text-foreground font-medium">Select a Lead</p>
                  <p className="text-sm text-muted-foreground mt-1">Choose a conversation from the left to view CRM details.</p>
                </div>
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  );
};

export default DashboardNexa;
