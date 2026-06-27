import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface ConnectInstagramFallbackProps {
  title?: string;
  description?: string;
}

const InstagramIcon = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const ConnectInstagramFallback: React.FC<ConnectInstagramFallbackProps> = ({
  title = "Connect Instagram to Unlock",
  description = "SyncSocio requires a linked Instagram Business account to analyze your feed, track live analytics, launch optimization loops, and preview ads."
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="max-w-md w-full rounded-[2.5rem] border border-border/60 bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)] overflow-hidden relative">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

        <CardContent className="p-8 sm:p-10 text-center space-y-6 relative z-10 flex flex-col items-center">
          {/* Logo container */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10" 
               style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)' }}>
            <InstagramIcon className="text-white" size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {description}
            </p>
          </div>

          <div className="h-px w-full bg-border/50" />

          {/* Call to action */}
          <Button
            onClick={() => window.location.href = '/setup'}
            className="w-full h-12 text-xs font-black uppercase tracking-widest gradient-bg text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
          >
            <Sparkles size={14} className="mr-2 animate-pulse" />
            Connect Account
          </Button>

          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-60">
            Link in under 2 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectInstagramFallback;
