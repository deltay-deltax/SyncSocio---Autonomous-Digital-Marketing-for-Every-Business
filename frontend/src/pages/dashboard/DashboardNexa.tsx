import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Settings2, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, ShieldCheck, Banknote, Smartphone, Package, Search, ExternalLink, ChevronDown, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { Checkout } from '@/components/Checkout';

const DashboardNexa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = (useOutletContext<any>() || { 
    profile: JSON.parse(localStorage.getItem('syncsocio_profile') || 'null') 
  });
  
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const isPlanExpired = profile?.userPlanExpiresAt ? new Date(profile.userPlanExpiresAt) < new Date() : false;
  const planName = (profile?.userPlan || profile?.selectedPlan || '').toLowerCase();
  const isElite = planName.includes('elite');
  const isAgency = planName.includes('agency');
  const isMetaReviewer = profile?.userEmail === 'supportvelocitydm@gmail.com';
  const hasDMAutomationAccess = isElite || isAgency || profile?.dmAddonActive || isMetaReviewer;
  const isInstagramConnected = !!profile?.instagramIsConnected && !!profile?.instagramBusinessAccountId && !!profile?.instagramAccessToken;

  // Nexa State
  const [nexaSettings, setNexaSettings] = useState<any>(null);
  const [nexaLoading, setNexaLoading] = useState(false);
  const [nexaSaving, setNexaSaving] = useState(false);
  const [nexaExpanded, setNexaExpanded] = useState(false);
  const [nexaConversations, setNexaConversations] = useState<any[]>([]);
  const [nexaConvLoading, setNexaConvLoading] = useState(false);
  const [nexaForm, setNexaForm] = useState({
    nexa_enabled: false,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    upi_id: '',
    bank_details: '',
    cod_enabled: false,
    min_discount: 0,
    max_discount: 10,
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  const getAuthHeaders = (isJson = false) => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {})
  });

  React.useEffect(() => {
    (async () => {
      setNexaLoading(true);
      try {
        const res = await fetch(`${API_BASE}/nexa/settings`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.settings) {
          setNexaSettings(data.settings);
          setNexaForm(prev => ({
            ...prev,
            nexa_enabled: !!data.settings.nexa_enabled,
            upi_id: data.settings.upi_id || '',
            bank_details: data.settings.bank_details || '',
            cod_enabled: !!data.settings.cod_enabled,
            min_discount: data.settings.min_discount ?? 0,
            max_discount: data.settings.max_discount ?? 10,
          }));
        }
      } catch {}
      setNexaLoading(false);
    })();

    // Fetch Nexa conversations summary
    (async () => {
      setNexaConvLoading(true);
      try {
        const res = await fetch(`${API_BASE}/nexa/conversations?limit=10`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok) setNexaConversations(data.conversations || []);
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
    // simplified locked view
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

  return (
    <div className="flex flex-col min-h-screen bg-background/50">
      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Bot size={24} className="text-violet-500" /> Nexa AI Agent
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your AI sales closer to handle DMs and negotiate orders on auto-pilot.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-card border border-border/50 px-4 py-2 rounded-2xl shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</span>
                <span className="text-xs font-bold text-foreground">{nexaForm.nexa_enabled ? 'Active' : 'Inactive'}</span>
              </div>
              <button
                onClick={async () => {
                  const newVal = !nexaForm.nexa_enabled;
                  setNexaForm((p: any) => ({ ...p, nexa_enabled: newVal }));
                  try {
                    await fetch(`${API_BASE}/nexa/settings`, {
                      method: 'POST', headers: getAuthHeaders(true),
                      body: JSON.stringify({ nexa_enabled: newVal }),
                    });
                    toast({ title: newVal ? 'Nexa Activated' : 'Nexa Paused' });
                  } catch {}
                }}
                className="ml-2"
              >
                {nexaForm.nexa_enabled 
                  ? <ToggleRight size={32} className="text-emerald-500 hover:text-emerald-600 transition-colors" />
                  : <ToggleLeft size={32} className="text-muted-foreground hover:text-foreground transition-colors" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-6">
                
                {/* Payment Integrations */}
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <Banknote size={16} className="text-emerald-500" /> Payment Collection
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Razorpay */}
                    <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-3">
                      <label className="text-xs font-bold text-foreground">Razorpay API</label>
                      <div className="space-y-2">
                        <Input 
                          placeholder="Key ID (rzp_live_...)" 
                          value={nexaForm.razorpay_key_id}
                          onChange={e => setNexaForm((p: any) => ({ ...p, razorpay_key_id: e.target.value }))}
                          className="text-xs bg-background"
                        />
                        <Input 
                          type="password"
                          placeholder="Key Secret" 
                          value={nexaForm.razorpay_key_secret}
                          onChange={e => setNexaForm((p: any) => ({ ...p, razorpay_key_secret: e.target.value }))}
                          className="text-xs bg-background"
                        />
                      </div>
                    </div>

                    {/* UPI & COD */}
                    <div className="space-y-4">
                      <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-2">
                        <label className="text-xs font-bold text-foreground">UPI ID</label>
                        <Input 
                          placeholder="brand@upi or 9XXXXXXXXX@paytm" 
                          value={nexaForm.upi_id}
                          onChange={e => setNexaForm((p: any) => ({ ...p, upi_id: e.target.value }))}
                          className="text-xs bg-background"
                        />
                      </div>

                      <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-foreground block">Cash on Delivery</label>
                          <span className="text-[10px] text-muted-foreground">Allow manual COD orders</span>
                        </div>
                        <button onClick={() => setNexaForm((p: any) => ({ ...p, cod_enabled: !p.cod_enabled }))}>
                          {nexaForm.cod_enabled 
                            ? <ToggleRight size={24} className="text-emerald-500" />
                            : <ToggleLeft size={24} className="text-muted-foreground" />}
                        </button>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="md:col-span-2 bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-2">
                      <label className="text-xs font-bold text-foreground">Bank Details (IMPS/NEFT)</label>
                      <Textarea 
                        placeholder="Bank Name, Account No, IFSC, Account Holder Name" 
                        value={nexaForm.bank_details}
                        onChange={e => setNexaForm((p: any) => ({ ...p, bank_details: e.target.value }))}
                        className="text-xs bg-background resize-none h-20"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-border/50" />

                {/* Negotiation Bounds */}
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <ShieldCheck size={16} className="text-blue-500" /> Negotiation Bounds
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground">Min Discount % (Floor)</label>
                      <Input 
                        type="number" min={0} max={50}
                        value={nexaForm.min_discount}
                        onChange={e => setNexaForm((p: any) => ({ ...p, min_discount: Number(e.target.value) }))}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground">Max Discount % (Limit)</label>
                      <Input 
                        type="number" min={0} max={50}
                        value={nexaForm.max_discount}
                        onChange={e => setNexaForm((p: any) => ({ ...p, max_discount: Number(e.target.value) }))}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={async () => {
                    setNexaSaving(true);
                    try {
                      await fetch(`${API_BASE}/nexa/settings`, {
                        method: 'POST', headers: getAuthHeaders(true),
                        body: JSON.stringify(nexaForm),
                      });
                      toast({ title: 'Settings Saved', description: 'Nexa agent updated successfully.' });
                    } catch {
                      toast({ title: 'Error', variant: 'destructive' });
                    }
                    setNexaSaving(false);
                  }}
                  disabled={nexaSaving}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold h-12"
                >
                  {nexaSaving ? 'Saving...' : 'Save Agent Settings'}
                </Button>
              </div>
            </div>

            {/* Recent Leads */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Settings2 size={16} className="text-violet-500" /> Recent Leads
              </h3>
              
              {nexaConvLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : nexaConversations.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-3xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                    <Bot size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nexaConversations.map((convo: any) => (
                    <div key={convo._id} className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold">{convo.collected?.customer_name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{convo.collected?.product_interested || 'No product yet'}</p>
                        </div>
                        <span className="px-2 py-1 bg-violet-500/10 text-violet-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {convo.stage.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {convo.collected?.price_agreed && (
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <span className="text-xs font-bold">₹{convo.collected.price_agreed}</span>
                          {convo.payment?.payment_status === 'paid' ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase"><CheckCircle2 size={12}/> Paid</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-500 uppercase">Pending</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

</div>
      </main>
    </div>
  );
};

export default DashboardNexa;
