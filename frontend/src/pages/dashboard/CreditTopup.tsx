import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useRazorpay } from '../../hooks/useRazorpay';

const topups = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

export const CreditTopup = () => {
  const { toast } = useToast();
  const [buyingPack, setBuyingPack] = useState<number | null>(null);
  const isRazorpayLoaded = useRazorpay();

  const handleBuyTopup = async (creditsAmount: number, price: number) => {
    if (!isRazorpayLoaded) {
      toast({ title: "Error", description: "Payment gateway is loading. Please try again.", variant: "destructive" });
      return;
    }

    setBuyingPack(creditsAmount);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      
      // 1. Create order
      const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: price })
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // 2. Open Razorpay modal
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "SyncSocio",
        description: `Top-up ${creditsAmount} Credits`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            // 4. Assign Credits
            const topupRes = await fetch(`${API_BASE}/credits/topup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ amount: creditsAmount })
            });

            if (topupRes.ok) {
              const data = await topupRes.json();
              localStorage.setItem('syncsocio_credits', String(data.credits));
              window.dispatchEvent(new StorageEvent('storage', { key: 'syncsocio_credits', newValue: String(data.credits) }));
              
              toast({ title: "🎉 Payment Successful!", description: `Successfully added ${creditsAmount} credits.` });
            } else {
               const errorData = await topupRes.json();
               toast({ title: "Credit Assignment Failed", description: errorData.message || "Please contact support.", variant: "destructive" });
            }
          } catch (err: any) {
             console.error('[Verify/Topup Error]', err);
             toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
          } finally {
             setBuyingPack(null);
          }
        },
        prefill: {
          name: "User",
          email: "user@example.com",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {
            setBuyingPack(null);
            toast({ title: "Payment Cancelled", description: "You closed the payment modal." });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setBuyingPack(null);
        toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
      });
      rzp.open();

    } catch (err: any) {
      console.error('[Credits] Purchase topup error:', err);
      toast({
        title: "Connection error",
        description: err.message || "Failed to process purchase.",
        variant: "destructive"
      });
      setBuyingPack(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 pt-4">
      {/* Header Info */}
      <div className="mb-6 border-b border-border/40 pb-4">
        <h2 className="text-xl font-bold text-foreground">Credits Balance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Top up your account or review how credits are used</p>
      </div>

      {/* Credit Topups Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto text-center py-8 bg-card border border-border/40 rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden"
      >
        <h3 className="text-2xl font-bold mb-2">Need extra credits?</h3>
        <p className="text-sm text-muted-foreground mb-10 max-w-lg mx-auto">
          Get instant top-ups to power your creative campaigns without upgrading your monthly plan.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {topups.map((topup) => (
            <div key={topup.credits} className="glass-card bg-background/50 border border-border/60 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 block">Value Pack</span>
                <h4 className="text-2xl font-black text-foreground mb-1">{topup.credits} Credits</h4>
                <p className="text-xs text-muted-foreground mb-4">₹{topup.per_credit} / credit</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground mb-4">₹{topup.price}</p>
                <Button 
                  variant="outline" 
                  disabled={buyingPack !== null}
                  className="w-full rounded-xl py-4 font-semibold text-xs border-border hover:bg-primary hover:text-white transition-all h-10 flex items-center justify-center cursor-pointer"
                  onClick={() => handleBuyTopup(topup.credits, topup.price)}
                >
                  {buyingPack === topup.credits ? 'Processing...' : 'Buy Top-up'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Credits Explained Link */}
        <div className="flex flex-col items-center justify-center mt-12">
          <Link
            to="/dashboard/credits"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 hover:underline cursor-pointer group"
          >
            <HelpCircle size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            Learn how credits are spent
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CreditTopup;
