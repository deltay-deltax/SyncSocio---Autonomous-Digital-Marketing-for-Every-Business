import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Link, 
  ShieldCheck, 
  Layout, 
  ChevronRight,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const InstagramIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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

const InstagramInstructions = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: "Switch to Professional Account",
      description: "Meta Graph API cannot 'see' personal accounts. Open Instagram > Settings > Account Type and switch to 'Business' or 'Creator'.",
      icon: <InstagramIcon className="text-pink-500" size={24} />,
      details: "Choose a category that fits your brand. Creator is perfect for influencers, Business for brands."
    },
    {
      title: "Link to a Facebook Page",
      description: "Your Instagram must be tethered to a Facebook Page to use the Graph API.",
      icon: <Layout className="text-blue-500" size={24} />,
      details: "Go to IG Profile > Edit Profile > Page. If you don't have one, create a simple 'Internet Company' page."
    },
    {
      title: "Meta Business Suite Assignment",
      description: "Ensure your Page and Instagram account are in the same Meta Business Portfolio.",
      icon: <Settings className="text-gray-400" size={24} />,
      details: "Go to business.facebook.com > Settings > Accounts. Both assets must be 'Owned by' the same Business Portfolio."
    },
    {
      title: "Grant 'Manage Business' Scope",
      description: "When the Facebook login popup appears, you MUST select 'Manage your Business'.",
      icon: <ShieldCheck className="text-green-500" size={24} />,
      details: "Without this, Meta hides your business assets (Pages) from the VelocityDM app."
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/setup')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Setup</span>
        </button>

        {/* Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold uppercase tracking-widest mb-4 border border-amber-500/20">
            <AlertCircle size={12} /> Pre-Connection Checklist
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Instagram Success Guide</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Meta's "Business" security is strict. Complete these 4 steps to ensure a flawless connection on the first try.
          </p>
        </header>

        {/* Steps Grid */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 sm:p-8 flex items-start gap-6 relative group border-white/[0.05] hover:border-white/[0.1] transition-all"
            >
              {/* Step Number */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm">
                0{index + 1}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 shadow-inner">
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                  {step.title}
                  <CheckCircle2 size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <p className="text-xs text-primary/80 leading-relaxed font-medium">
                    <span className="font-bold uppercase tracking-tight mr-2">Tip:</span>
                    {step.details}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Call */}
        <div className="mt-12 text-center p-8 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-white/[0.05]">
          <h2 className="text-xl font-bold text-foreground mb-2">Finished all steps?</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            You are now ready to hit "Continue with Facebook". VelocityDM will be able to see your business assets and activate your agent immediately.
          </p>
          <Button 
            onClick={() => navigate('/setup')} 
            className="gradient-bg text-primary-foreground h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02]"
          >
            I'm Ready, Let's Connect <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstagramInstructions;
