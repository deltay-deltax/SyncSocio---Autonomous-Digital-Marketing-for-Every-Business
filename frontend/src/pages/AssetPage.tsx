import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.warn('[Storage] LocalStorage setItem failed:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        // Clear all public asset caches first to free up space
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('velocity_public_asset_')) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error('[Storage] LocalStorage quota still exceeded after cleanup');
      }
    }
  }
}

interface AssetSection {
  type: 'text' | 'features' | 'testimonial' | 'pricing' | 'faq';
  heading?: string;
  body?: string;
  items?: Array<{ icon?: string; title?: string; description?: string }>;
}

interface AssetData {
  _id: string;
  username: string;
  slug: string;
  title: string;
  description: string;
  heroImageUrl: string;
  ctaText: string;
  ctaUrl: string;
  brandName: string;
  brandColor: string;
  brandSecondaryColor: string;
  sections: AssetSection[];
  stats: { views: number; ctaClicks: number };
  mainContent?: string;
  keyTakeaways?: string[];
  visualSuggestions?: string;
  ctaDescription?: string;
}

const AssetPage: React.FC = () => {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [asset, setAsset] = useState<AssetData | null>(() => {
    if (username && slug) {
      const cached = localStorage.getItem(`velocity_public_asset_${username}_${slug}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (username && slug) {
      const cached = localStorage.getItem(`velocity_public_asset_${username}_${slug}`);
      return !cached;
    }
    return true;
  });

  const [error, setError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      const cacheKey = `velocity_public_asset_${username}_${slug}`;
      const cached = localStorage.getItem(cacheKey);
      try {
        const res = await fetch(`${API_BASE}/assets/public/${username}/${slug}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setAsset(data);
        safeSetItem(cacheKey, JSON.stringify(data));
      } catch {
        if (!cached) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (username && slug) fetchAsset();
  }, [username, slug]);

  // Set page title dynamically
  useEffect(() => {
    if (asset?.title) {
      document.title = `${asset.title} | ${asset.brandName}`;
    }
  }, [asset]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <div className="text-6xl">🔗</div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-slate-400 text-sm">This asset link may have expired or been removed.</p>
        <Link to="/" className="mt-4 px-6 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  const brandColor = asset.brandColor || '#2563EB';
  const brandSecondary = asset.brandSecondaryColor || '#60A5FA';
  const ctaLink = asset.ctaUrl
    ? `${API_BASE}/assets/click/${asset._id}`
    : `https://instagram.com/${asset.username}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
                 style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandSecondary})` }}>
              {asset.brandName?.charAt(0)?.toUpperCase() || 'V'}
            </div>
            <span className="font-bold text-sm text-white/90">{asset.brandName}</span>
          </div>
          {asset.ctaText && (
            <a href={ctaLink} target="_blank" rel="noopener noreferrer"
               className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
               style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandSecondary})` }}>
              {asset.ctaText}
            </a>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/60 mb-8">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: brandColor }} />
              @{asset.username}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight">
              {asset.title}
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
              {asset.description}
            </p>
          </motion.div>

          {/* Hero Image */}
          {asset.heroImageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              onClick={() => setPreviewUrl(asset.heroImageUrl)}
              className="mt-12 rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-zoom-in group"
            >
              <img src={asset.heroImageUrl} alt={asset.title} className="w-full h-auto object-cover transition duration-300 group-hover:scale-[1.02]" />
            </motion.div>
          )}

          {/* Primary CTA */}
          {asset.ctaText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10"
            >
              <a href={ctaLink} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
                 style={{
                   background: `linear-gradient(135deg, ${brandColor}, ${brandSecondary})`,
                   boxShadow: `0 20px 60px ${brandColor}33`,
                 }}>
                {asset.ctaText}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </motion.div>
          )}
        </div>
      </section>

      {/* Main Content (Rich) */}
      {asset.mainContent && (
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative z-10 prose prose-invert max-w-none text-slate-300 leading-relaxed text-base whitespace-pre-line">
                {asset.mainContent}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Sections */}
      {asset.sections && asset.sections.length > 0 && asset.sections.map((section: any, idx) => (
        <motion.section
          key={idx}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
          className="py-12 px-6"
        >
          <div className="max-w-3xl mx-auto">
            {section.heading && (
              <h2 className="text-2xl md:text-3xl font-black mb-3 text-center tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                {section.heading}
              </h2>
            )}
            {section.body && section.type !== 'testimonial' && section.type !== 'pricing' && (
              <p className="text-slate-400 text-center max-w-2xl mx-auto mb-10 leading-relaxed text-sm">
                {section.body}
              </p>
            )}

            {/* Premium Content List (Actionable steps/tips) */}
            {(section.type === 'content_list' || section.type === 'features') && section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {section.items.map((item: any, i: number) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] rounded-2xl p-6 transition-all duration-300 flex flex-col items-center text-center gap-4 shadow-xl"
                  >
                    <div className="text-3xl shrink-0 w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                      {item.icon || '⚡'}
                    </div>
                    <div className="space-y-2 flex-1 flex flex-col items-center">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white/90 bg-white/10 uppercase tracking-widest">Step {i + 1}</span>
                      <h3 className="text-sm font-bold text-white line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 pt-1">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Expert Advice / Next Steps Section */}
            {(section.type === 'expert_advice' || section.type === 'text') && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-8 relative overflow-hidden group transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500" />
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    💡 Expert Authority Advice
                  </div>
                  {section.body && (
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line font-medium">
                      {section.body}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Testimonials Section */}
            {section.type === 'testimonial' && section.body && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 relative overflow-hidden text-center max-w-2xl mx-auto shadow-xl">
                <span className="text-4xl text-primary/30 font-serif absolute top-4 left-6">“</span>
                <p className="text-slate-300 italic text-base leading-relaxed relative z-10 pt-4">
                  {section.body}
                </p>
                {section.heading && (
                  <p className="text-xs font-black uppercase tracking-widest text-primary mt-6">— {section.heading}</p>
                )}
              </div>
            )}

            {/* Pricing Section */}
            {section.type === 'pricing' && (
              <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] rounded-3xl p-8 max-w-md mx-auto text-center shadow-xl space-y-4">
                {section.heading && <h3 className="text-lg font-bold text-white">{section.heading}</h3>}
                {section.body && <p className="text-slate-400 text-sm leading-relaxed">{section.body}</p>}
                {section.items && section.items.length > 0 && (
                  <ul className="space-y-2 pt-2 text-left">
                    {section.items.map((item: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-emerald-500 font-bold">✓</span> {item.title || item.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* FAQ Section */}
            {section.type === 'faq' && section.items && section.items.length > 0 && (
              <div className="space-y-4 max-w-2xl mx-auto">
                {section.items.map((item: any, i: number) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-2">
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      ))}

      {/* Key Takeaways */}
      {asset.keyTakeaways && asset.keyTakeaways.length > 0 && (
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl space-y-6"
            >
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 text-white">
                <span className="text-amber-500">✓</span> Key Takeaways
              </h2>
              <ul className="grid md:grid-cols-2 gap-4">
                {asset.keyTakeaways.map((takeaway: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300 text-sm bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 hover:border-white/[0.08] transition-colors animate-in fade-in">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="leading-relaxed">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>
      )}

      {/* Bottom CTA Block */}
      {asset.ctaText && (
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.08)_0,transparent_60%)]" style={{ transform: 'scale(1.2)' }} />
          <div className="max-w-2xl mx-auto text-center relative z-10 space-y-6">
            <h2 className="text-3xl font-black tracking-tight">Need expert help or personal guidance?</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed whitespace-pre-line">
              {asset.ctaDescription || `Take the next step with ${asset.brandName} and let us handle the heavy lifting for you.`}
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <a href={ctaLink} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-10 py-4.5 rounded-2xl text-base font-bold text-white shadow-2xl transition-all"
                 style={{
                   background: `linear-gradient(135deg, ${brandColor}, ${brandSecondary})`,
                   boxShadow: `0 20px 60px ${brandColor}33`,
                 }}>
                {asset.ctaText}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>Powered by VelocityDM</span>
          <span>@{asset.username}</span>
        </div>
      </footer>

      {/* Lightbox / Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
            onClick={() => setPreviewUrl(null)}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition shadow-lg z-50"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-[90vw] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-slate-900 flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt="Hero Preview"
                className="w-full h-auto max-h-[80vh] object-contain max-w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetPage;
