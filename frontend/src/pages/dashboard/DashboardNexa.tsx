import React, { useState } from 'react';
import { 
  Bot, User, Package, MapPin, Phone, CreditCard, Clock, MessageSquare, AlertCircle, ShoppingBag, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOutletContext } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { Checkout } from '@/components/Checkout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const DashboardNexa = () => {
  const { toast } = useToast();
  const { profile } = (useOutletContext<any>() || { 
    profile: JSON.parse(localStorage.getItem('syncsocio_profile') || 'null') 
  });
  
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
  const isElite = planName.includes('elite');
  const isAgency = planName.includes('agency');
  const isMetaReviewer = profile?.userEmail === 'supportvelocitydm@gmail.com';
  const hasDMAutomationAccess = isElite || isAgency || profile?.dmAddonActive || isMetaReviewer;
  const isInstagramConnected = !!profile?.instagramIsConnected && !!profile?.instagramBusinessAccountId && !!profile?.instagramAccessToken;

  // CRM State
  const [nexaConversations, setNexaConversations] = useState<any[]>([]);
  const [nexaConvLoading, setNexaConvLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  React.useEffect(() => {
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
        }
      } catch {}
      setNexaConvLoading(false);
    })();
  }, []);

  const handleBuyAddon = () => {
    setCheckoutData({
      baseAmount: 299,
      description: "DM Automation Add-on (Starter Plan)",
      type: "dm_addon_purchase",
      planName: "Starter",
      creditsAdded: 0
    });
  };

  const handleCheckoutSuccess = () => {
    toast({ title: 'Add-on Activated', description: 'DM Automation is now active!' });
    window.location.reload();
  };

  if (checkoutData) {
    return (
      <div className="max-w-xl mx-auto my-8">
        <Checkout
          baseAmount={checkoutData.baseAmount}
          description={checkoutData.description}
          type={checkoutData.type}
          planName={checkoutData.planName}
          creditsAdded={checkoutData.creditsAdded}
          onSuccess={handleCheckoutSuccess}
          onBack={() => setCheckoutData(null)}
        />
      </div>
    );
  }

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback 
        title="Connect Instagram for Nexa Agent" 
        description="To use the Nexa AI Sales Agent, you need to connect your Instagram Business account."
      />
    );
  }

  if (!hasDMAutomationAccess) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-card border border-border/60 rounded-3xl text-center shadow-lg">
        <h2 className="text-xl font-bold mb-2">Nexa Agent Locked</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Nexa is a premium service included in the Elite Plan or available as an add-on.
        </p>
        <Button onClick={handleBuyAddon} className="w-full">Buy DM Automation Add-on</Button>
      </div>
    );
  }

  const selectedLead = nexaConversations.find(c => c._id === selectedLeadId);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background/50">
      <main className="flex-1 p-6 lg:p-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bot size={24} className="text-violet-500" /> Nexa CRM Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your AI-driven sales conversations and orders.
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
          
          {/* Left Panel - Leads List */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm flex flex-col h-full overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Users size={16} /> Recent Leads
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              {nexaConvLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading leads...</div>
              ) : nexaConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                    <Bot size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nexaConversations.map((convo: any) => (
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
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          convo.stage === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600' :
                          convo.stage === 'ESCALATED' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-violet-500/10 text-violet-600'
                        }`}>
                          {convo.stage.replace('_', ' ')}
                        </span>
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
