import React, { useState, useEffect } from 'react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CheckoutProps {
  baseAmount: number;
  description: string;
  type: string;
  planName?: string;
  creditsAdded?: number;
  onSuccess: (data: any) => void;
  onBack: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  baseAmount,
  description,
  type,
  planName = '',
  creditsAdded = 0,
  onSuccess,
  onBack
}) => {
  const { toast } = useToast();
  const isRazorpayLoaded = useRazorpay();
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [billing, setBilling] = useState({
    fullName: '',
    email: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    country: 'India'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
        const res = await fetch(`${API_BASE}/profile/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.location?.country) {
            setBilling(prev => ({ ...prev, country: data.location.country }));
          }
        }
      } catch (e) {
        console.error('Failed to fetch profile for checkout', e);
      }
    };
    fetchProfile();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: couponCode, purchaseType: type, planName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const couponData = data.coupon || { code: data.code || couponCode, discountPercentage: data.discountPercentage };
        setAppliedCoupon(couponData);
        toast({ title: 'Coupon Applied', description: `Got ${couponData.discountPercentage}% off!` });
      } else {
        toast({ title: 'Invalid Coupon', description: data.message || 'Could not apply coupon.', variant: 'destructive' });
        setAppliedCoupon(null);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to validate coupon', variant: 'destructive' });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBilling(prev => ({ ...prev, [name]: value }));
  };

  // Calculations
  const discountAmount = appliedCoupon ? Math.round(baseAmount * (appliedCoupon.discountPercentage / 100)) : 0;
  const subtotalAfterDiscount = baseAmount - discountAmount;
  const tax = 0;
  const total = subtotalAfterDiscount;

  const handlePayNow = async () => {
    if (!billing.fullName || !billing.email) {
       toast({ title: 'Missing Info', description: 'Please provide at least your full name and email.', variant: 'destructive' });
       return;
    }
    if (!isRazorpayLoaded) {
      toast({ title: 'Error', description: 'Payment gateway is loading. Please try again.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      
      const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
           amount: total, 
           type, 
           plan: planName, 
           creditsAdded,
           couponCode: appliedCoupon?.code || '',
           discountPercentage: appliedCoupon?.discountPercentage || 0,
           discountAmount: discountAmount
        })
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'SyncSocio',
        description,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                ...response,
                billingAddress: billing
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || 'Payment verification failed');
            
            toast({ title: 'Payment Successful', description: 'Your order has been processed.' });
            onSuccess(verifyData);
          } catch (err: any) {
             toast({ title: 'Verification Failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
          } finally {
             setIsProcessing(false);
          }
        },
        prefill: { 
           name: billing.fullName, 
           email: billing.email 
        },
        theme: { color: '#2563EB' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast({ title: 'Payment Cancelled', description: 'You closed the payment modal.' });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async (response: any) => {
        setIsProcessing(false);
        toast({ title: 'Payment Failed', description: response.error.description, variant: 'destructive' });

        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
          await fetch(`${API_BASE}/payment/fail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              razorpayOrderId: response.error.metadata?.order_id,
              razorpayPaymentId: response.error.metadata?.payment_id,
              reason: response.error.description,
              billingAddress: billing
            })
          });
        } catch (e) {
          console.error('[Checkout] Failed to report payment failure to backend:', e);
        }
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
      setIsProcessing(false);
    }
  };

  return (
    <main className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
      </button>

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4 text-foreground">
        Checkout
      </h1>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 mt-8">
        {/* LEFT: form */}
        <div className="space-y-8">
          {/* Coupon */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Coupon code
            </h2>
            <div className="mt-4 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon || isApplyingCoupon}
                placeholder="Try WELCOME10"
                className="flex-1 h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary"
              />
              {!appliedCoupon ? (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isApplyingCoupon}
                  className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-70"
                >
                  {isApplyingCoupon ? 'Applying...' : 'Apply'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                  className="h-11 px-5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90"
                >
                  Remove
                </button>
              )}
            </div>
            {appliedCoupon && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
                {appliedCoupon.code} — {appliedCoupon.discountPercentage}% off
              </div>
            )}
          </section>

          {/* Billing */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
            <h2 className="font-display text-lg font-bold">Billing address</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Full name</span>
                <input name="fullName" value={billing.fullName} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email</span>
                <input type="email" name="email" value={billing.email} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Street address</span>
                <input name="streetAddress" value={billing.streetAddress} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">City</span>
                <input name="city" value={billing.city} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Postal code</span>
                <input name="postalCode" value={billing.postalCode} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Country</span>
                <input name="country" value={billing.country} onChange={handleInputChange} className="mt-1 w-full h-11 px-3 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-primary" />
              </label>
            </div>

            {billing.country.trim().toLowerCase() === 'nepal' && (
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-base">🇳🇵</span>
                  <span className="font-display font-bold text-sm tracking-wide">Serving Nepal Better</span>
                </div>
                <p className="text-xs text-black leading-relaxed">
                  You can pay directly via card using your standard <strong>Visa/Mastercard Debit & Credit Cards</strong> issued in Nepal.
                  <br/><br/>
                  If you prefer to pay using <strong>UPI</strong>, you can use your local mobile banking app or <strong>connectIPS</strong> via cross-border instant remittance to India.
                </p>
                <div className="rounded-lg bg-background/50 border border-border/40 p-3.5 text-[11px] space-y-2.5">
                  <div>
                    <span className="font-bold text-foreground uppercase tracking-wider block mb-1">Participating Banks & Channels:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {['Everest Bank Ltd.', 'Global IME Bank Ltd.', 'Himalayan Bank Ltd. *', 'Machhapuchchhre Bank Ltd.', 'Nabil Bank Ltd', 'Nepal SBI Bank Ltd.', 'NMB Bank Ltd. *', 'connectIPS'].map((item) => (
                        <span key={item} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/30 font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] text-black/70 mt-1.5 block">* Currently enabled for receiving transfers only</span>
                  </div>
                  <div className="space-y-1.5 text-black">
                    <p>
                      <strong>How to pay:</strong>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Log in to your mobile banking app or connectIPS app/portal.</li>
                      <li>Select <strong>Fund Transfer</strong> &rarr; <strong>Cross-Border Fund Transfer</strong> (India UPI).</li>
                      <li>Enter our payment UPI ID (visible when selecting UPI/QR payment during Razorpay checkout).</li>
                      <li>Enter the equivalent NPR amount (converted rate shown automatically) and authorize the payment.</li>
                    </ol>
                    <p className="text-[10px] italic mt-1 text-black/80">
                      Note: A flat service fee of NPR 240 is charged per transaction by NCHL.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: summary */}
        <aside className="lg:sticky lg:top-20 h-fit rounded-lg border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground">Order summary</h2>
          <div className="mt-6 p-6 rounded-lg bg-background border border-border/80">
            <div className="text-[11px] font-black uppercase tracking-wider text-primary">
              {description}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">SyncSocio Digital Automation</div>
            <div className="mt-4 text-3xl font-black text-foreground">
              ₹{baseAmount}
            </div>
          </div>

          <div className="mt-6 space-y-3.5 text-sm">
            <div className="flex justify-between items-center font-medium">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">₹{baseAmount}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-primary font-bold">
                <span>Discount ({appliedCoupon.code})</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}

            <div className="h-px bg-border my-2.5" />
            <div className="flex justify-between items-center font-bold">
              <span className="text-foreground">Total due today</span>
              <span className="text-xl text-foreground font-black">₹{total}</span>
            </div>
          </div>

          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className="mt-8 w-full h-14 rounded-lg bg-primary text-primary-foreground font-bold text-base hover:opacity-95 disabled:opacity-60 transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            {isProcessing ? "Processing..." : `Pay now — ₹${total}`}
          </button>
          <p className="mt-4 text-[11px] text-muted-foreground text-center font-medium">
            Secure payments powered by Razorpay
          </p>
        </aside>
      </div>
    </main>
  );
};
