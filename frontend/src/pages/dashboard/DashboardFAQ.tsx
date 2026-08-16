import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle, Mail, Phone, MapPin, MessageCircle } from "lucide-react";

const FAQS = [
  // ── About SyncSocio ───────────────────────────────────────────────────────
  {
    q: "What exactly is SyncSocio?",
    a: "SyncSocio is your all-in-one AI content workspace built for Instagram growth. It plans your weekly content mix, generates on-brand images, carousels, reels and captions, schedules your posts, runs DM automations, and surfaces real-time analytics — all from a single dashboard. No Canva, no ChatGPT, no third-party scheduler.",
  },
  {
    q: "Why should I use SyncSocio instead of ChatGPT or Canva?",
    a: "ChatGPT writes text. Canva designs manually. SyncSocio does both — automatically and on-brand. Your brand colors, tone, USP, and visual style are baked in from onboarding, so every output looks and sounds like you. It also handles strategy, scheduling, analytics, and DM automation, which no single general-purpose AI tool does.",
  },
  {
    q: "Who is SyncSocio built for?",
    a: "SyncSocio works for D2C brands, e-commerce stores, local businesses, SaaS companies, coaches, consultants, architects, real estate agents, and anyone who needs consistent, high-quality social content without hiring an agency. The AI reads your business category and adjusts its entire strategy accordingly.",
  },
  {
    q: "Do I need a website to get started?",
    a: "No website needed. SyncSocio is Instagram-first. All you need is an Instagram Business or Creator account. Everything else — strategy, visuals, captions, scheduling — is handled inside the platform.",
  },

  // ── Content Generation ────────────────────────────────────────────────────
  {
    q: "What types of content can I generate?",
    a: "You can generate Static Ad Images, Multi-slide Carousels, UGC-style Videos, Product Showcase Videos, E-commerce Listing Images, Festival Posts, WhatsApp campaign graphics, and Email campaign copy. Every output is tailored to your brand identity — not a generic template.",
  },
  {
    q: "How does the AI know what my brand looks like?",
    a: "During onboarding, you set your brand name, category, tone, primary and secondary colors, USP, and visual vibe. SyncSocio builds a Brand DNA profile from these inputs and passes it into every prompt, so generated content is consistent without you manually prompting anything.",
  },
  {
    q: "Can I generate content in regional languages?",
    a: "Yes. SyncSocio supports English, Hinglish, Hindi, Marathi, Bengali, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, and Nepali. If your brand targets Nepal, the platform automatically restricts choices to English and Nepali to keep messaging accurate.",
  },
  {
    q: "Do I need any design or marketing skills to use it?",
    a: "None at all. SyncSocio makes every creative and strategic decision for you — content format, posting time, visual layout, copy angle. Just describe your brand once and the AI handles everything from there.",
  },
  {
    q: "Can I upload my own images or use existing product photos?",
    a: "Yes. You can upload product images directly into any generation job, and the AI will incorporate them into the final creative. You can also import from your Product Library so your catalogue is always one click away.",
  },
  {
    q: "What is the Festival Calendar?",
    a: "The Festival Calendar is a built-in planner that shows upcoming Indian and global festivals. Click any festival to instantly generate a themed post — caption, image, and hashtags — branded to your business. Great for staying relevant without manually tracking dates.",
  },

  // ── Strategy & Planning ───────────────────────────────────────────────────
  {
    q: "How does SyncSocio decide the best time for me to post?",
    a: "We connect to the Instagram Graph API and analyze when your actual followers are online and most active. The 'Peak Hour' shown in your dashboard is specific to your audience — not a generic industry average.",
  },


  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    q: "What analytics does SyncSocio track?",
    a: "We pull live data from Instagram: Total Reach, Weekly Reach, Impressions, Engagement Rate, Likes This Week, Total Followers, Follower Growth over 30 days, and Posts This Month. All metrics are updated in real-time and include period-on-period comparison percentages.",
  },
  {
    q: "How is Engagement Rate calculated?",
    a: "Engagement Rate = ((Likes + Comments + Saves) ÷ Total Reach) × 100. We weight interactions, not just likes, to give you a more meaningful signal of how your audience actually responds to your content.",
  },
  {
    q: "What does a positive percentage change (e.g. +12.4%) mean?",
    a: "It means your metric this period (e.g. reach this week) is higher than the same metric in the previous period. A rising number means your content is working — a drop is a signal to try a different format or posting time.",
  },

  // ── DM Automation & Campaigns ─────────────────────────────────────────────
  {
    q: "What is DM Automation and how does it help me?",
    a: "DM Automation lets you build keyword-triggered reply flows on Instagram. When someone comments a word like 'price' on your post, or replies to your story, the bot instantly sends them a custom message — with a product link, offer, or lead form. It captures leads 24/7 without you being online.",
  },
  {
    q: "Can I use this for email and WhatsApp campaigns?",
    a: "Yes! The Campaign Generator lets you create full email and WhatsApp campaigns with AI-generated copy and creatives. You can upload contact lists, pick products, and send directly from the dashboard.",
  },

  // ── Plans, Credits & Billing ──────────────────────────────────────────────
  {
    q: "How do credits work?",
    a: "Credits are consumed each time you generate AI content — one image, one carousel, one video, or one caption batch each costs credits. The Starter plan comes with 80 credits/month (16 AI images), Growth comes with 400 credits/month (80 AI images), and Pro comes with 1,000 credits/month (125 HD images). If you run out, you can buy top-up packs of 50, 100, 300, or 700 credits at any time.",
  },
  {
    q: "Do unused credits roll over to the next month?",
    a: "Credits reset at the start of each billing cycle and don't carry over. We recommend using your credits actively throughout the month — the platform is designed to make daily generation fast and easy.",
  },
  {
    q: "Can I run multiple brands from one account?",
    a: "Starter and Growth plans support 1 brand profile with its own Brand DNA, color palette, and tone. If you manage multiple brands or an agency, bespoke agency accounts support up to 8 brand profiles.",
  },
  {
    q: "Is there a free trial available?",
    a: "Yes! We offer a Free Trial with 3 Free Creatives (15 credits) with no credit card required, so you can test our AI generation tools immediately.",
  },
  {
    q: "Is my content and data secure?",
    a: "Yes. Your brand data, uploaded media, prompts, and analytics are stored privately in your workspace and never shared or used to train models. You retain full ownership of everything you create inside SyncSocio.",
  },

  // ── Asset Library ─────────────────────────────────────────────────────────
  {
    q: "Where do my generated posts get saved?",
    a: "Every post you save is stored in the Asset Library — organized by type (image, carousel, video) and date. You can re-download, reuse, or schedule any saved asset at any time. Nothing expires.",
  },

  // ── Setup & Configuration ──────────────────────────────────────────────────
  {
    q: "How do I set up a business email for campaigns?",
    a: (
      <span>
        To set up a business email, you need to configure your SMTP settings or verify your domain to allow SyncSocio to send emails on your behalf. Watch the step-by-step video guide here:{" "}
        <a
          href="https://youtu.be/6C93iRe5l34"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-bold break-all"
        >
          https://youtu.be/6C93iRe5l34
        </a>
      </span>
    ),
  },
  {
    q: "How do I set up my Instagram Business or Creator account?",
    a: (
      <span>
        To connect SyncSocio, you need an Instagram Business or Creator account linked to a Facebook Page. You can follow our detailed setup guide at{" "}
        <a
          href="https://www.syncsocio.com/instagram-setup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-bold break-all"
        >
          https://www.syncsocio.com/instagram-setup
        </a>
      </span>
    ),
  },
];

function DashboardFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-5">
            <HelpCircle size={12} />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Frequently asked<br />
            <span className="text-primary">questions.</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto font-medium leading-relaxed">
            Everything you need to know about creating, scheduling and shipping content with SyncSocio.
          </p>
        </motion.div>

        <div className="space-y-4">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className={`rounded-[1.5rem] border transition-all overflow-hidden ${isOpen
                  ? "border-primary/20 bg-white shadow-xl shadow-primary/5"
                  : "border-border/40 bg-white/40 hover:border-border hover:bg-white/70"
                  }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-7 py-5 text-left"
                >
                  <span
                    className={`text-base font-bold tracking-tight transition-colors ${isOpen ? "text-foreground" : "text-foreground/90"
                      }`}
                  >
                    {item.q}
                  </span>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen
                      ? "bg-primary text-white rotate-45"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="px-7 pb-6 pt-0">
                        <div className="h-px bg-border/40 mb-4" />
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-16"
        >
          <div className="rounded-[2.5rem] border border-border/50 bg-white p-8 md:p-10 shadow-sm">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <MessageCircle size={12} />
                Get in touch
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Still have questions?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Our team usually replies within a few hours.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Mail,
                  label: "Email us",
                  value: "support@syncsocio.com",
                  href: "mailto:support@syncsocio.com",
                },
                {
                  icon: Phone,
                  label: "Call us",
                  value: "+91 89717 42263",
                  href: "tel:+918971742263",
                },
                {
                  icon: MapPin,
                  label: "Visit",
                  value: "AECS Layout ,Kundalahali, Bangalore, Karnataka, 560037",

                },
              ].map((c, i) => (
                <a
                  key={i}
                  href={c.href}
                  className="group flex flex-col items-start gap-4 p-4 lg:p-5 min-h-[145px] w-full rounded-2xl border border-border/50 bg-slate-50/50 hover:border-primary/30 hover:bg-white transition-all hover:shadow-md"
                >
                  <span className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors border border-border/50 shadow-sm">
                    <c.icon size={18} />
                  </span>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                      {c.label}
                    </div>
                    <div className="text-[11.5px] lg:text-[13px] font-bold text-foreground break-normal">
                      {c.value}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Mon–Sat · 9am – 9pm IST · We're just one message away.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default DashboardFAQ;
