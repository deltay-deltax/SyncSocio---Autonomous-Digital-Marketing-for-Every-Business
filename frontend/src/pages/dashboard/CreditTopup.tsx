import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link, useOutletContext } from 'react-router-dom';
import { Checkout } from '@/components/Checkout';

const topups = [
  { credits: 100, price: 299, per_credit: 2.99 },
  { credits: 300, price: 799, per_credit: 2.66 },
  { credits: 700, price: 1699, per_credit: 2.42 },
];

export const CreditTopup = () => {
  const { toast } = useToast();
  const { profile } = useOutletContext<{ profile: any }>();
  const [buyingPack, setBuyingPack] = useState<number | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const isPlanExpired = profile?.userPlanExpiresAt && new Date(profile.userPlanExpiresAt) < new Date();

  const handleBuyTopup = async (creditsAmount: number, price: number) => {
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

    const isElite = currentPlan.toLowerCase().includes('elite');

    if (actionType === 'renew') {
       amount = isElite ? 3199 : 999;
       planStr = currentPlan;
       creditsAdded = isElite ? 700 : 200;
       typeStr = 'plan_renewal';
     } else if (actionType === 'upgrade') {
       amount = 3199; // Full Elite Plan price
       planStr = 'Elite';
       creditsAdded = 700; // Full Elite Plan credits
       typeStr = 'plan_upgrade';
     }

    setShowExpiredModal(false);
    setCheckoutData({
      baseAmount: amount,
      description: actionType === 'renew' ? `Renew ${planStr} Plan` : 'Upgrade to Elite Plan',
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
                const isElite = plan.includes('elite');

                if (!isElite) {
                  return (
                    <>
                      <Button 
                        onClick={() => handlePlanAction('renew', profile?.userPlan || 'Starter')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : 'Renew Starter Plan (₹999)'}
                      </Button>
                      <Button 
                        onClick={() => handlePlanAction('upgrade', profile?.userPlan || 'Starter')} 
                        disabled={processingPlan}
                        className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
                      >
                        {processingPlan ? 'Processing...' : 'Upgrade to Elite (₹3199)'}
                      </Button>
                    </>
                  );
                } else {
                  return (
                    <Button 
                      onClick={() => handlePlanAction('renew', profile?.userPlan || 'Elite')} 
                      disabled={processingPlan}
                      className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 shadow-lg"
                    >
                      {processingPlan ? 'Processing...' : 'Renew Elite Plan (₹3199)'}
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
