import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorContextType {
  hasError: boolean;
  setError: (val: boolean) => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  // Only match requests to our own Node backend (port 5050).
  // Explicitly excludes localhost:8000 (AI service), localhost:5173 (Vite),
  // and all external URLs (Facebook, Razorpay, Google, etc.)
  const isNodeBackend = (url: string): boolean => {
    try {
      const u = new URL(url, window.location.href);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const apiOrigin = new URL(API_BASE).origin; // e.g. "http://localhost:5050"
      return u.origin === apiOrigin;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // ── Axios interceptor: only 5xx from our Node backend ──────────────────
    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || '';
        if (isNodeBackend(url) && (!error.response || error.response.status >= 500)) {
          setHasError(true);
        }
        return Promise.reject(error);
      }
    );

    // ── Fetch interceptor: only 5xx from our Node backend ──────────────────
    // ALL other URLs (localhost:8000, facebook.com, razorpay, etc.) are silently passed through.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      try {
        const response = await originalFetch(...args);
        if (isNodeBackend(url) && response.status >= 500) {
          setHasError(true);
        }
        return response;
      } catch (err) {
        // AbortError = intentional cancellation (AbortController.abort()) — never a server fault.
        // Only surface genuine network-level failures from our own backend.
        const isAbort = (err as Error).name === 'AbortError';
        if (!isAbort && isNodeBackend(url)) {
          setHasError(true);
        }
        throw err;
      }
    };

    return () => {
      axios.interceptors.response.eject(axiosInterceptor);
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <GlobalErrorContext.Provider value={{ hasError, setError: setHasError }}>
      {children}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center border border-slate-200"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-rose-500/10 rounded-[2rem] animate-pulse" />
                <AlertTriangle size={40} className="text-rose-500 relative z-10" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-3">System Interruption</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-10 font-medium">
                We are facing a problem with our servers. <br/>
                <span className="text-slate-900 font-bold">We are working on it.</span>
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setHasError(false);
                    window.location.reload();
                  }}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  <RefreshCw size={18} /> Retry Connection
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                   Neural Engine Offline
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlobalErrorContext.Provider>
  );
};

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) throw new Error('useGlobalError must be used within GlobalErrorProvider');
  return context;
};
