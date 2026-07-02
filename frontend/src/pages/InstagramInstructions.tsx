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
  Settings,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const FacebookIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

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
      title: "Switch to a Professional Account",
      description:
        "Your Instagram account must be a Business or Creator account before it can connect to a Facebook Page.",
      icon: <InstagramIcon className="text-pink-500" size={24} />,
      details:
        "Open Instagram → Profile → ☰ → Settings and activity → Account type and tools → Switch to Professional Account. Choose Business (recommended) or Creator."
    },
    {
      title: "Create a Facebook Page (If You Don't Have One)",
      description:
        "A Facebook Page is required to connect your Instagram account and use the Meta Graph API.",
      icon: <Layout className="text-blue-500" size={24} />,
      details:
        "Open Facebook → Menu → Pages → Create New Page. Enter a Page name, choose a category (such as Business or Internet Company), add an optional description, and publish it. A basic Page is enough—you don't need to add any posts."
    },
    {
      title: "Link Instagram & Facebook Page",
      description:
        "Connect your Instagram Professional account to your Facebook Page using either of the methods below.",
      icon: <FacebookIcon className="text-blue-600" size={24} />,
      details: `Method 1 (Recommended): From Instagram

1. Open the Instagram app.
2. Go to your Profile.
3. Tap ☰ → Settings and activity.
4. Open Accounts Center.
5. Tap Profiles → Add accounts if your Facebook account isn't already connected.
6. Return to Accounts Center.


Method 2: From Facebook

1. Open the Facebook app or website.
2. Switch to your Facebook Page.
3. Go to Page Settings.
4. Open Linked Accounts (or Instagram).
5. Click Connect Account.
6. Log in with your Instagram account.
7. Allow all requested permissions.`
    },
    {
      title: "Accept the Instagram Tester Invitation",
      description:
        "SyncSocio is currently undergoing Meta App Review, so your Instagram account must be added as a tester before it can connect.",
      icon: <UserCheck className="text-purple-500" size={24} />,
      details:
        "Our team will add your Instagram account as a tester. Once we notify you:\n\n1. Open Instagram in a web browser (instagram.com).\n2. Click More → Settings.\n3. Open Apps and Websites.\n4. Go to the Tester Invitations tab.\n5. Accept the invitation sent by our app.\n6. After accepting, return to SyncSocio and continue with Facebook Login."
    },
    {
      title: "Continue with Facebook Login",
      description:
        "Return to SyncSocio and sign in with Facebook to finish connecting your account.",
      icon: <ShieldCheck className="text-green-500" size={24} />,
      details:
        "Click 'Continue with Facebook', log in using the same Facebook account that owns your Facebook Page, keep all requested Pages, Instagram accounts, and permissions selected, then click Continue. Your connected Instagram Business account should appear automatically."
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
                  <div className="text-xs text-primary/80 leading-relaxed font-medium whitespace-pre-wrap">
                    <span className="font-bold uppercase tracking-tight mr-2">Tip:</span>
                    {step.details}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Call */}
        <div className="mt-12 text-center p-8 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-white/[0.05]">
          <h2 className="text-xl font-bold text-foreground mb-2">Finished all steps?</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            You are now ready to hit "Continue with Facebook". SyncSocio will be able to see your business assets and activate your agent immediately.
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
