import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const topups = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

export const CreditTopup = () => {
  const { toast } = useToast();
  const [buyingPack, setBuyingPack] = useState<number | null>(null);

  const handleBuyTopup = async (creditsAmount: number, price: number) => {
    setBuyingPack(creditsAmount);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      
      const res = await fetch(`${API_BASE}/credits/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: creditsAmount })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local storage
        localStorage.setItem('syncsocio_credits', String(data.credits));
        // Dispatch storage event to update layout immediately
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'syncsocio_credits',
          newValue: String(data.credits)
        }));
        
        toast({
          title: "🎉 Payment Successful!",
          description: `Successfully added ${creditsAmount} credits to your account.`,
        });
      } else {
        const errorData = await res.json();
        toast({
          title: "Payment failed",
          description: errorData.message || "Something went wrong during purchase.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('[Credits] Purchase topup error:', err);
      toast({
        title: "Connection error",
        description: "Failed to process purchase. Please check your network.",
        variant: "destructive"
      });
    } finally {
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
