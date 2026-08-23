import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link, useOutletContext } from 'react-router-dom';
import { Checkout } from '@/components/Checkout';
import { useCurrency } from '@/contexts/CurrencyContext';

const topups = [
  { 
    name: 'Starter Top-up',
    credits: 50, 
    prices: {
      INR: { price: 250, per_credit: 5.00 },
      USD: { price: 3.5, per_credit: 0.07 }
    }
  },
  { 
    name: 'Value Pack',
    credits: 100, 
    prices: {
      INR: { price: 475, per_credit: 4.75 },
      USD: { price: 6.5, per_credit: 0.065 }
    }
  },
  { 
    name: 'Growth Pack',
    credits: 300, 
    prices: {
      INR: { price: 1275, per_credit: 4.25 },
      USD: { price: 16, per_credit: 0.053 }
    }
  },
  { 
    name: 'Pro Pack',
    credits: 700, 
    prices: {
      INR: { price: 2730, per_credit: 3.90 },
      USD: { price: 35, per_credit: 0.05 }
    }
  },
];

const planPrices = {
  Starter: { INR: 799, USD: 10 },
  Growth: { INR: 1499, USD: 19 },
  Pro: { INR: 3499, USD: 45 }
};

export const CreditTopup = () => {
  const { toast } = useToast();
  const { profile } = useOutletContext<{ profile: any }>();
  const { currency, symbol, setCurrency } = useCurrency();
  const [buyingPack, setBuyingPack] = useState<number | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const isTrial = !profile?.userPlan || profile?.userPlan === 'Free Trial';
  const isPlanExpired = profile?.userPlanExpiresAt && new Date(profile.userPlanExpiresAt) < new Date();

  const handleBuyTopup = async (creditsAmount: number, price: number) => {
    if (isTrial) {
       toast({ title: 'Active Plan Required', description: 'You must have an active paid plan to purchase credit top-ups.', variant: 'destructive' });
       return;
    }
    if (isPlanExpired) {
       setShowExpiredModal(true);
       return;
    }

    setCheckoutData({
      baseAmount: price,
      description: `Top-up ${creditsAmount} Credits`,
      type: 'topup',
      creditsAdded: creditsAmount
    });
  };

  const handleCheckoutSuccess = (verifyData: any) => {
    localStorage.setItem('syncsocio_credits', String(verifyData.credits));
    window.dispatchEvent(new StorageEvent('storage', { key: 'syncsocio_credits', newValue: String(verifyData.credits) }));
    toast({ title: "🎉 Payment Successful!", description: "Credits added to your account." });
    setCheckoutData(null);
  };

  const handlePlanAction = async (actionType: 'renew' | 'upgrade', currentPlan: string) => {
    let amount = 0;
    let planStr = '';
    let creditsAdded = 0;
    let typeStr = '';

    const isPro = currentPlan.toLowerCase().includes('pro');
    const isGrowth = currentPlan.toLowerCase().includes('growth');

    if (actionType === 'renew') {
       amount = isPro ? planPrices.Pro[currency] : isGrowth ? planPrices.Growth[currency] : planPrices.Starter[currency];
       planStr = currentPlan;
       creditsAdded = isPro ? 1000 : isGrowth ? 400 : 80;
       typeStr = 'plan_renewal';
     } else if (actionType === 'upgrade') {
       amount = isPro ? planPrices.Pro[currency] : planPrices.Growth[currency];
       planStr = isPro ? 'Pro' : 'Growth';
       creditsAdded = isPro ? 1000 : 400;
       typeStr = 'plan_upgrade';
     }

    setShowExpiredModal(false);
    setCheckoutData({
      baseAmount: amount,
      description: actionType === 'renew' ? `Renew ${planStr} Plan` : `Upgrade to ${planStr} Plan`,
      type: typeStr,
      planName: planStr,
      creditsAdded: creditsAdded
    });
  };

  if (checkoutData) {
    return (
      <Checkout
        baseAmount={checkoutData.baseAmount}
        description={checkoutData.description}
        type={checkoutData.type}
        planName={checkoutData.planName}
        creditsAdded={checkoutData.creditsAdded}
        onSuccess={(data) => {
           if (checkoutData.type === 'topup') {
             handleCheckoutSuccess(data);
           } else {
             toast({ title: 'Success!', description: `Successfully processed your plan. You can now buy top-ups.` });
             setTimeout(() => window.location.reload(), 1500);
           }
        }}
        onBack={() => setCheckoutData(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 pt-4">
      {/* Header Info */}
      <div className="mb-6 border-b border-border/40 pb-4">
        <h2 className="text-xl font-bold text-foreground">Credits Balance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Top up your account or review how credits are used</p>
      </div>

      <div className="flex justify-end items-center gap-2 mb-4">
        <span className={`text-sm font-semibold ${currency === 'INR' ? 'text-foreground' : 'text-muted-foreground'}`}>INR (₹)</span>
        <button 
          onClick={() => setCurrency(currency === 'INR' ? 'USD' : 'INR')}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/20 transition-colors focus:outline-none"
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${currency === 'USD' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-semibold ${currency === 'USD' ? 'text-foreground' : 'text-muted-foreground'}`}>USD ($)</span>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {topups.map((topup) => {
            const topupPrices = topup.prices[currency];
            return (
              <div key={topup.credits} className="glass-card bg-background/50 border border-border/60 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2 block">{topup.name}</span>
                  <h4 className="text-2xl font-black text-foreground mb-1">{topup.credits} Credits</h4>
                  <p className="text-xs text-muted-foreground mb-4">{symbol}{topupPrices.per_credit} / credit</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground mb-4">{symbol}{topupPrices.price}</p>
                  <Button 
                    variant="outline" 
                    disabled={buyingPack !== null}
                    className="w-full rounded-xl py-4 font-semibold text-xs border-border hover:bg-primary hover:text-white transition-all h-10 flex items-center justify-center cursor-pointer"
                    onClick={() => handleBuyTopup(topup.credits, topupPrices.price)}
                  >
                    {buyingPack === topup.credits ? 'Processing...' : 'Buy Top-up'}
                  </Button>
                </div>
              </div>
            );
          })}
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

      {/* Plan Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-lg rounded-[2rem] p-8 border border-border/50 shadow-2xl relative"
          >
            <button 
              onClick={() => setShowExpiredModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground mb-2">Plan Expired</h2>
              <p className="text-sm text-muted-foreground">Your 30-day plan cycle has expired. You must renew or upgrade your current plan before purchasing additional top-ups.</p>
            </div>

            <div className="space-y-4">
              {(() => {
                const plan = (profile?.userPlan || '').toLowerCase();
                const isPro = plan.includes('pro');
                const isGrowth = plan.includes('growth');

                if (!isPro && !isGrowth) {
                  return (
                    <>
                      <Button 
                        onClick={() => handlePlanAction('renew', profile?.userPlan || 'Starter')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : `Renew Starter Plan (${symbol}${planPrices.Starter[currency]})`}
                      </Button>
                      <Button 
                        onClick={() => handlePlanAction('upgrade', profile?.userPlan || 'Starter')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : `Upgrade to Growth (${symbol}${planPrices.Growth[currency]})`}
                      </Button>
                    </>
                  );
                } else if (isGrowth) {
                  return (
                    <>
                      <Button 
                        onClick={() => handlePlanAction('renew', profile?.userPlan || 'Growth')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : `Renew Growth Plan (${symbol}${planPrices.Growth[currency]})`}
                      </Button>
                      <Button 
                        onClick={() => handlePlanAction('upgrade', profile?.userPlan || 'Growth')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : `Upgrade to Pro (${symbol}${planPrices.Pro[currency]})`}
                      </Button>
                    </>
                  );
                } else {
                  return (
                    <Button 
                      onClick={() => handlePlanAction('renew', profile?.userPlan || 'Pro')} 
                      disabled={processingPlan}
                      className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 shadow-lg"
                    >
                      {processingPlan ? 'Processing...' : `Renew Pro Plan (${symbol}${planPrices.Pro[currency]})`}
                    </Button>
                  );
                }
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreditTopup;
