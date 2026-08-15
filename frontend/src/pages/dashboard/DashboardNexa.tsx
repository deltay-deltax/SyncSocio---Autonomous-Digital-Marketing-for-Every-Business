import React, { useState, useEffect } from 'react';
import { 
  Bot, User, Package, MapPin, Phone, CreditCard, Clock, MessageSquare, AlertCircle, ShoppingBag, Users, Zap, TrendingUp,
  Truck, CheckCircle2, XCircle, Boxes
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { Checkout } from '@/components/Checkout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    // Fetch Nexa conversations
    (async () => {
      setNexaConvLoading(true);
      try {
        const res = await fetch(`${API_BASE}/nexa/conversations?limit=50`, { headers: getAuthHeaders() });
        const data = await res.json();
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
      const res = await fetch(`${API_BASE}/nexa/conversations/${selectedLeadId}/reply`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText, learn: learnCheckbox })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Reply Sent', description: 'Conversation is back to automation.' });
        setReplyText('');
        setNexaConversations(prev => prev.map(c => c._id === selectedLeadId ? data.convo : c));
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
    }
    setReplying(false);
  };

  const handleUpdateOrderStatus = async (newStatus: string) => {
    if (!selectedLeadId) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/nexa/conversations/${selectedLeadId}/order-status`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus })
      });
      const data = await res.json();
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
                <div className="p-8 text-center text-muted-foreground text-sm">Loading leads...</div>
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
                          {convo.order_status && convo.order_status !== 'none' && (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                              convo.order_status === 'ordered' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                              convo.order_status === 'packing' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              convo.order_status === 'shipping' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                              convo.order_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            }`}>
                              {convo.order_status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground truncate max-w-[200px] flex items-center gap-1">
                        <ShoppingBag size={12} /> {convo.collected?.product_interested || 'Discussing Options'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Right Panel - CRM Detail View */}
          <Card className="lg:col-span-2 rounded-[2rem] border-border/50 shadow-sm flex flex-col h-full overflow-hidden bg-card">
            {selectedLead ? (
              <>
                <CardHeader className="p-6 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{selectedLead.collected?.customer_name || 'Unknown Customer'}</h2>
                      <p className="text-sm text-muted-foreground">IG ID: {selectedLead.ig_user_id}</p>
                    </div>
                  </div>
                  {selectedLead.escalate_to_human && (
                    <span className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={14} /> Human Action Required
                    </span>
                  )}
                </CardHeader>
                
                <ScrollArea className="flex-1 p-6">
                  {/* Order Status & Fulfillment Action Bar */}
                  <div className="p-4 mb-6 rounded-2xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-0.5">Order Status</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                          selectedLead.order_status === 'ordered' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          selectedLead.order_status === 'packing' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          selectedLead.order_status === 'shipping' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                          selectedLead.order_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          selectedLead.order_status === 'cancelled' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {selectedLead.order_status || 'No Order Yet'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (Nexa uses this to answer customer tracking inquiries)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Order Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">Order Details</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Package size={16} className="text-violet-500 mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Product Interested</p>
                            <p className="text-sm font-medium">{selectedLead.collected?.product_interested || 'Not identified yet'}</p>
                            {selectedLead.collected?.quantity && (
                              <p className="text-xs font-bold text-primary mt-0.5">Qty: {selectedLead.collected.quantity}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <CreditCard size={16} className="text-emerald-500 mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Pricing & Payment</p>
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

                    {/* Shipping & Contact */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">Shipping Profile</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Phone size={16} className="text-blue-500 mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Phone Number</p>
                            <p className="text-sm font-medium">{selectedLead.collected?.phone_number || 'Not provided'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-rose-500 mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Delivery Address</p>
                            <p className="text-sm font-medium">{selectedLead.collected?.delivery_address || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat History */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                      <MessageSquare size={16} /> Chat Transcript
                    </h3>
                    
                    <div className="bg-muted/30 rounded-2xl p-4 space-y-4">
                      {selectedLead.conversation_history && selectedLead.conversation_history.length > 0 ? (
                        selectedLead.conversation_history.map((msg: any, idx: number) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'nexa' ? 'items-start' : 'items-end'}`}>
                            <span className="text-[10px] text-muted-foreground font-medium mb-1 px-1">
                              {msg.role === 'nexa' ? 'Nexa Agent' : 'Customer'}
                            </span>
                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                              msg.role === 'nexa' 
                                ? 'bg-card border border-border/60 text-foreground rounded-tl-sm' 
                                : 'bg-primary text-primary-foreground rounded-tr-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No conversation history available.</p>
                      )}
                    </div>
                    
                    {/* Reply & Auto-Learn Box (only for escalated) */}
                    {selectedLead.escalate_to_human && (
                      <div className="mt-4 p-4 border border-violet-500/30 bg-violet-500/5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={16} className="text-violet-600" />
                          <h4 className="text-sm font-bold text-violet-900 dark:text-violet-100">Reply & Resolve</h4>
                        </div>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply to the customer..."
                          className="w-full min-h-[80px] p-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={learnCheckbox} 
                              onChange={(e) => setLearnCheckbox(e.target.checked)}
                              className="rounded text-violet-600 focus:ring-violet-500"
                            />
                            <span className="font-medium text-muted-foreground">Save to Nexa's Knowledge Base (Auto-Learn)</span>
                          </label>
                          <Button 
                            onClick={handleReply} 
                            disabled={replying || !replyText.trim()}
                            className="bg-violet-600 hover:bg-violet-700"
                          >
                            {replying ? 'Sending...' : 'Send Reply'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
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
