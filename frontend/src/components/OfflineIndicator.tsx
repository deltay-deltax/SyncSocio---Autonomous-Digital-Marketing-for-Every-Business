import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 shadow-md flex items-center justify-center gap-2"
        >
          <WifiOff size={18} />
          <span className="text-sm font-medium">You're offline. Changes will sync when you reconnect.</span>
        </motion.div>
      )}

      {isOnline && showOnlineToast && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 shadow-md flex items-center justify-center gap-2"
        >
          <Wifi size={18} />
          <span className="text-sm font-medium">You're back online!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
