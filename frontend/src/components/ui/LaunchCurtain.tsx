import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Rocket } from 'lucide-react';

export default function LaunchCurtain() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Stop scrolling while curtain is closed
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLaunch = () => {
    setIsOpen(true);
    
    // Fire confetti from bottom left and right
    const duration = 3500;
    const end = Date.now() + duration;

    // Define a heart shape for the confetti
    const heart = confetti.shapeFromPath ? confetti.shapeFromPath({
      path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
      matrix: [0.0333, 0, 0, 0.0333, -5.56, -5.56] as unknown as DOMMatrix
    }) : 'circle';

    const frame = () => {
      confetti({
        particleCount: 12,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.8 },
        colors: ['#ff0000', '#ff69b4', '#ffd700', '#26ccff', '#ff36ff'],
        shapes: ['star', heart as any],
        zIndex: 999999,
        scalar: 1.2
      });
      confetti({
        particleCount: 12,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.8 },
        colors: ['#ff0000', '#ff69b4', '#ffd700', '#26ccff', '#ff36ff'],
        shapes: ['star', heart as any],
        zIndex: 999999,
        scalar: 1.2
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // After animation, remove from DOM or pointer events
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 overflow-hidden ${isOpen ? 'pointer-events-none' : ''}`} style={{ zIndex: 99999 }}>
      {/* Left Curtain */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: isOpen ? '-100%' : '0%' }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 w-1/2 h-full shadow-2xl origin-left border-r-[12px] border-black/60 z-10"
        style={{
          backgroundColor: '#991b1b', // Deep red fallback
          backgroundImage: 'url("https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&q=80")',
          backgroundSize: '200% 100%',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          boxShadow: 'inset -20px 0 50px rgba(0,0,0,0.5)'
        }}
      >
         {/* Gold trim */}
         <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-b from-yellow-300 via-yellow-600 to-yellow-700 shadow-[0_0_20px_rgba(234,179,8,0.7)] z-10 border-l border-yellow-200/50"></div>
      </motion.div>

      {/* Right Curtain */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: isOpen ? '100%' : '0%' }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 right-0 w-1/2 h-full shadow-2xl origin-right border-l-[12px] border-black/60 z-10"
        style={{
          backgroundColor: '#991b1b', // Deep red fallback
          backgroundImage: 'url("https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&q=80")',
          backgroundSize: '200% 100%',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          boxShadow: 'inset 20px 0 50px rgba(0,0,0,0.5)'
        }}
      >
        {/* Gold trim */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-yellow-300 via-yellow-600 to-yellow-700 shadow-[0_0_20px_rgba(234,179,8,0.7)] z-10 border-r border-yellow-200/50"></div>
      </motion.div>

      {/* Launch Button Area */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 15 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          >
            <button
              onClick={handleLaunch}
              className="group relative px-12 py-6 bg-gradient-to-b from-white to-slate-200 text-slate-900 rounded-full font-black text-4xl uppercase tracking-widest shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:shadow-[0_0_80px_rgba(255,255,255,0.9)] hover:scale-105 transition-all duration-300 flex items-center gap-4 border border-white/50 pointer-events-auto"
            >
              <span>Launch</span>
              <Rocket className="w-10 h-10 group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform duration-300 text-primary" />
              
              {/* Outer Glow & Pulse */}
              <div className="absolute inset-0 rounded-full border-4 border-white/30 blur-md group-hover:border-white/60 transition-all duration-300"></div>
              <div className="absolute inset-[-20px] rounded-full bg-white/20 blur-2xl -z-10 animate-pulse"></div>
            </button>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-8 text-white/90 font-bold tracking-[0.4em] uppercase text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              SyncSocio is live
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark overlay behind curtains (optional depth effect) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-black/40 z-[-1]" 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
