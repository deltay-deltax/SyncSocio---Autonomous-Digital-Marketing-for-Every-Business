import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditsContent } from '@/components/CreditsContent';

export const CreditsExplainer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const handleBack = () => {
    if (isDashboard) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className={isDashboard ? "max-w-4xl mx-auto space-y-8 pb-12 pt-4" : "min-h-screen bg-gradient-to-b from-background via-background to-muted/10 text-foreground px-6 py-10 md:py-14"}>
      <div className={isDashboard ? "" : "mx-auto w-full max-w-4xl"}>
        {/* Render back button and page header only when NOT in dashboard */}
        {!isDashboard && (
          <>
            {/* Back Button */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={14} /> Back To Home
              </button>
            </motion.div>

            {/* Page Title Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.05 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <HelpCircle size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">What are Credits?</h1>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black">SyncSocio Credit System</p>
              </div>
            </motion.div>
          </>
        )}

        {/* Main Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm"
        >
          {isDashboard && (
            <div className="mb-6 border-b border-border/40 pb-4">
              <h2 className="text-xl font-bold text-foreground">Credits Explainer</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Understand how resource credits are calculated & spent</p>
            </div>
          )}
          <CreditsContent />
        </motion.div>
      </div>
    </div>
  );
};

export default CreditsExplainer;
