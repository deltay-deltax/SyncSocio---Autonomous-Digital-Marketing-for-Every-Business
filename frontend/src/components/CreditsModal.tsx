import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';
import { CreditsContent } from './CreditsContent';

export const openCreditsModal = () => {
  window.dispatchEvent(new CustomEvent('open-credits-modal'));
};

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-[600px] max-h-[80vh] bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">What are Credits?</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">SyncSocio Credit System</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-border/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
              <CreditsContent />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default CreditsModal;
