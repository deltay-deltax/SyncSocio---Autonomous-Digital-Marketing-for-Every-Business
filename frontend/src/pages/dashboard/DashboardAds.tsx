import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, TrendingUp, Users, Clock, IndianRupee, Sparkles, Rocket,
  Loader2, ChevronDown, ChevronUp, Eye,
  BarChart2, Zap, CheckCircle2, ArrowRight, ExternalLink,
  Info, Calendar, Globe, Star, Award, ShieldCheck, BadgeCheck,
  MapPin, Heart, Activity, Monitor, Languages, MousePointerClick,
  UserCheck, Film, Lightbulb, Tag, Radio
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOutletContext } from 'react-router-dom';
import ConnectInstagramFallback from '@/components/ConnectInstagramFallback';
import { getFriendlyErrorMessage } from '@/lib/errorHandler';

interface MetaTargeting {
  objective?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
  placements?: string[];
  language?: string[];
  customAudience?: string;
  callToAction?: string;
  adFormat?: string;
  campaignNote?: string;
}

interface Recommendation {
  id: string;
  emoji: string;
  caption: string;
  engagement: string;
  reasoning: string;
  budget: string;
  duration: string;
  reach: string;
  audience: string;
  imageUrl?: string;
  targeting?: MetaTargeting;
}

const parseEngagement = (e: string) => parseFloat(e?.replace('%', '') || '0');

const getEngagementBadge = (rate: number) => {
  if (rate >= 8) return { label: 'Viral', color: 'text-purple-600 bg-purple-500/10 border-purple-500/25' };
  if (rate >= 5) return { label: 'High', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
  if (rate >= 2) return { label: 'Avg', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
  return { label: 'Low', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
};

const parseBudget = (b: string) => parseInt(b?.replace(/[^\d]/g, '') || '0', 10);

const estimateROI = (budget: number, reach: string) => {
  const maxReach = parseInt(reach?.split('-')[1]?.replace(/[^\d]/g, '') || '0', 10);
  if (!budget || !maxReach) return null;
  const cpm = (budget / maxReach) * 1000;
  if (cpm < 30) return '4x-6x ROI potential';
  if (cpm < 60) return '2x-4x ROI potential';
  return '1x-2x ROI potential';
};

const parseDuration = (d: string) => parseInt(d?.match(/\d+/)?.[0] || '0', 10);

const dailyBudget = (budget: number, duration: number) =>
  duration > 0 ? `Rs.${Math.round(budget / duration)}/day` : null;

const StatPill = ({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors ${
    highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/40'
  }`}>
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <Icon size={11} />
      {label}
    </span>
    <span className={`text-[12px] font-black ${highlight ? 'text-primary' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

const BOOST_STEPS = [
  { icon: ExternalLink, step: '1', text: 'Open Meta Ads Manager in your browser' },
  { icon: Target, step: '2', text: 'Find your post and tap "Boost Post" on Instagram' },
  { icon: Users, step: '3', text: 'Set the AI-suggested audience and location' },
  { icon: IndianRupee, step: '4', text: 'Set budget and duration as recommended' },
  { icon: CheckCircle2, step: '5', text: 'Review and launch your campaign!' },
];

const BoostModal = ({ rec, onClose }: { rec: Recommendation; onClose: () => void }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="w-full max-w-md bg-background border border-border/60 rounded-3xl shadow-2xl overflow-hidden"
      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Rocket size={16} className="text-primary" />
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Launch Ad Boost</h3>
        </div>
        <p className="text-xs text-muted-foreground">Follow these steps in Meta Ads Manager</p>
      </div>

      <div className="px-6 py-4 space-y-2.5">
        {BOOST_STEPS.map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-black text-primary">{step}</span>
            </div>
            <p className="text-xs text-foreground/80 font-medium leading-snug">{text}</p>
          </div>
        ))}
      </div>
      <div className="px-6 pb-4">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-semibold">
            AI recommends <span className="font-black">{rec.budget}</span> over{' '}
            <span className="font-black">{rec.duration}</span> for{' '}
            <span className="font-black">{rec.reach}</span> estimated reach.
          </p>
        </div>
      </div>
      <div className="px-6 pb-6 flex gap-2">
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-bold" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
          onClick={() => { window.open('https://adsmanager.facebook.com/', '_blank'); onClose(); }}
        >
          Open Ads Manager <ArrowRight size={12} className="ml-1.5" />
        </Button>
      </div>
    </motion.div>
  </motion.div>
);

const AudienceTags = ({ audience }: { audience: string }) => {
  const parts = audience?.split('·').map(s => s.trim()).filter(Boolean) || [];
  const icons = [Globe, Users, Target];
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((tag, i) => {
        const Icon = icons[i] || Target;
        return (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/15 text-[10px] font-bold text-primary/80">
            <Icon size={9} />
            {tag}
          </span>
        );
      })}
    </div>
  );
};

const EngagementBar = ({ rate }: { rate: number }) => {
  const pct = Math.min((rate / 15) * 100, 100);
  const color = rate >= 8 ? '#a855f7' : rate >= 5 ? '#10b981' : rate >= 2 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground font-semibold">Engagement Rate</span>
        <span className="text-[11px] font-black" style={{ color }}>{rate.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
};

const RANK_GRADIENTS = [
  'linear-gradient(90deg, #a855f7, #6366f1)',
  'linear-gradient(90deg, #3b82f6, #06b6d4)',
  'linear-gradient(90deg, #10b981, #34d399)',
];

/* ── small reusable section label ───────────────────────── */
const SectionLabel = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
    <Icon size={10} /> {label}
  </p>
);

/* ── 3-up chip card for objective / format / CTA ─────────── */
const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-500/8 border-purple-500/20 text-purple-700',
  blue:   'bg-blue-500/8   border-blue-500/20   text-blue-700',
  emerald:'bg-emerald-500/8 border-emerald-500/20 text-emerald-700',
};
const MetaChipCard = ({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center ${COLOR_MAP[color] || COLOR_MAP.purple}`}>
    <Icon size={14} className="mb-1.5 opacity-80" />
    <p className="text-sm font-black leading-tight">{value}</p>
    <p className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">{label}</p>
  </div>
);

const AdCard = ({ rec, index }: { rec: Recommendation; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const engRate = parseEngagement(rec.engagement);
  const badge = getEngagementBadge(engRate);
  const budgetNum = parseBudget(rec.budget);
  const durationNum = parseDuration(rec.duration);
  const daily = dailyBudget(budgetNum, durationNum);
  const roi = estimateROI(budgetNum, rec.reach);

  return (
    <>
      <AnimatePresence>{showModal && <BoostModal rec={rec} onClose={() => setShowModal(false)} />}</AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
      >
        <Card className="border-border/50 overflow-hidden group bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="h-1 w-full" style={{ background: RANK_GRADIENTS[index] || RANK_GRADIENTS[2] }} />
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Thumbnail */}
              <div className="relative w-full lg:w-[100px] h-[100px] rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/10 group-hover:scale-[1.02] transition-transform duration-300">
                {rec.imageUrl ? (
                  <img src={rec.imageUrl} alt="Post" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">{rec.emoji}</div>
                )}
                {index === 0 && (
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-yellow-400/90 backdrop-blur-sm flex items-center justify-center">
                    <Star size={10} className="text-yellow-900 fill-yellow-900" />
                  </div>
                )}
              </div>

              {/* Center content */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {index === 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-400/15 text-yellow-600 border border-yellow-400/30">
                        <Award size={9} /> Top Pick
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge.color}`}>
                      <TrendingUp size={10} /> {badge.label} · {rec.engagement}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{rec.caption}</p>
                </div>
                <EngagementBar rate={engRate} />
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <Sparkles size={13} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium">{rec.reasoning}</p>
                </div>
              </div>

              {/* Right panel */}
              <div className="lg:w-52 shrink-0 space-y-2">
                <StatPill icon={IndianRupee} label="Budget" value={rec.budget} />
                {daily && <StatPill icon={Calendar} label="Daily spend" value={daily} />}
                <StatPill icon={Clock} label="Duration" value={rec.duration} />
                <StatPill icon={Eye} label="Est. reach" value={rec.reach} highlight />
                {roi && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <Zap size={11} className="text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-black text-emerald-700">{roi}</span>
                  </div>
                )}
                <Button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-primary/20 border-0 mt-1"
                >
                  <Rocket size={11} className="mr-1.5" /> Boost This Post
                </Button>
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {expanded ? <><ChevronUp size={12} /> Less detail</> : <><ChevronDown size={12} /> More detail</>}
                </button>
              </div>
            </div>

            {/* Expanded panel */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-border/40 space-y-5">

                    {/* Section header */}
                    <div className="flex items-center gap-2">
                      <BarChart2 size={13} className="text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Full Meta Ads Setup</p>
                    </div>

                    {/* Why Boost */}
                    <div className="space-y-2">
                      <SectionLabel icon={Sparkles} label="Why Boost?" />
                      <div className="p-3.5 rounded-2xl bg-muted/25 border border-border/40 space-y-2">
                        {rec.reasoning.split('. ').filter(Boolean).map((sentence, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <BadgeCheck size={13} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                              {sentence.trim()}{!sentence.endsWith('.') ? '.' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {rec.targeting && (
                      <div className="space-y-4">

                        {/* Objective + Format + CTA row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <MetaChipCard
                            icon={Target}
                            label="Campaign Objective"
                            value={rec.targeting.objective || '—'}
                            color="purple"
                          />
                          <MetaChipCard
                            icon={Film}
                            label="Ad Format"
                            value={rec.targeting.adFormat || '—'}
                            color="blue"
                          />
                          <MetaChipCard
                            icon={MousePointerClick}
                            label="Call to Action"
                            value={rec.targeting.callToAction || '—'}
                            color="emerald"
                          />
                        </div>

                        {/* Demographics */}
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-3">
                          <SectionLabel icon={Users} label="Demographics" />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2.5 rounded-xl bg-white border border-border/40">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Age Range</p>
                              <p className="text-sm font-black text-foreground">
                                {rec.targeting.ageMin ?? '?'}–{rec.targeting.ageMax ?? '?'}
                              </p>
                            </div>
                            <div className="text-center p-2.5 rounded-xl bg-white border border-border/40">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Gender</p>
                              <p className="text-sm font-black text-foreground">{rec.targeting.gender || 'All'}</p>
                            </div>
                            <div className="text-center p-2.5 rounded-xl bg-white border border-border/40">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Language</p>
                              <p className="text-sm font-black text-foreground leading-tight">
                                {rec.targeting.language?.join(', ') || '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Locations */}
                        {rec.targeting.locations && rec.targeting.locations.length > 0 && (
                          <div className="space-y-2">
                            <SectionLabel icon={MapPin} label="Locations" />
                            <div className="flex flex-wrap gap-1.5">
                              {rec.targeting.locations.map((loc, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/8 border border-blue-500/20 text-[11px] font-bold text-blue-700">
                                  <MapPin size={9} />{loc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interests */}
                        {rec.targeting.interests && rec.targeting.interests.length > 0 && (
                          <div className="space-y-2">
                            <SectionLabel icon={Heart} label="Interests" />
                            <div className="flex flex-wrap gap-1.5">
                              {rec.targeting.interests.map((interest, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/8 border border-pink-500/20 text-[11px] font-bold text-pink-700">
                                  <Tag size={9} />{interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Behaviors */}
                        {rec.targeting.behaviors && rec.targeting.behaviors.length > 0 && (
                          <div className="space-y-2">
                            <SectionLabel icon={Activity} label="Behaviors" />
                            <div className="flex flex-wrap gap-1.5">
                              {rec.targeting.behaviors.map((b, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[11px] font-bold text-amber-700">
                                  <UserCheck size={9} />{b}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Placements */}
                        {rec.targeting.placements && rec.targeting.placements.length > 0 && (
                          <div className="space-y-2">
                            <SectionLabel icon={Monitor} label="Placements" />
                            <div className="flex flex-wrap gap-1.5">
                              {rec.targeting.placements.map((p, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/8 border border-violet-500/20 text-[11px] font-bold text-violet-700">
                                  <Radio size={9} />{p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom Audience */}
                        {rec.targeting.customAudience && rec.targeting.customAudience !== 'None' && (
                          <div className="space-y-2">
                            <SectionLabel icon={UserCheck} label="Custom / Lookalike Audience" />
                            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-500/8 border border-indigo-500/20">
                              <UserCheck size={12} className="text-indigo-600 shrink-0" />
                              <span className="text-[11px] font-bold text-indigo-700">{rec.targeting.customAudience}</span>
                            </div>
                          </div>
                        )}

                        {/* Creative Tip */}
                        {rec.targeting.campaignNote && (
                          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/15">
                            <Lightbulb size={14} className="text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Creative Tip</p>
                              <p className="text-xs text-foreground/80 font-medium leading-relaxed">{rec.targeting.campaignNote}</p>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Disclaimer */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <Info size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Reach estimates are AI projections based on your account's historical performance and Meta's typical CPM for your category. Actual results may vary.
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

const SummaryStats = ({ recs }: { recs: Recommendation[] }) => {
  const totalBudget = recs.reduce((s, r) => s + parseBudget(r.budget), 0);
  const avgEngagement = recs.length
    ? (recs.reduce((s, r) => s + parseEngagement(r.engagement), 0) / recs.length).toFixed(1)
    : '0';
  const maxReach = recs.reduce((max, r) => {
    const n = parseInt(r.reach?.split('-')[1]?.replace(/[^\d]/g, '') || '0', 10);
    return Math.max(max, n);
  }, 0);

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: IndianRupee, label: 'Total budget needed', value: `Rs.${totalBudget.toLocaleString('en-IN')}` },
        { icon: TrendingUp, label: 'Avg engagement', value: `${avgEngagement}%` },
        { icon: Eye, label: 'Combined max reach', value: maxReach > 1000 ? `${(maxReach / 1000).toFixed(0)}K+` : `${maxReach}` },
      ].map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-border/50 shadow-sm text-center">
          <Icon size={14} className="text-primary mb-1.5" />
          <p className="text-base font-black text-foreground">{value}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
};

const DashboardAds = () => {
  const { profile } = useOutletContext<{ profile: any }>() || {};
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextScan, setNextScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/promotions/recommendations`,
          { headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) } }
        );
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        const _rawJson54 = await res.json();
          const data = _rawJson54 && _rawJson54.success !== undefined ? (_rawJson54.success ? _rawJson54.data : _rawJson54) : _rawJson54;
        setRecommendations(data.recommendations || []);
        if (data.nextAnalysisAt) {
          setNextScan(
            new Date(data.nextAnalysisAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
          );
        }
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (profile && !profile.instagramIsConnected) {
    return (
      <ConnectInstagramFallback
        title="Connect Instagram to View Ad Recommendations"
        description="SyncSocio needs a connected Instagram account to scan your top-performing organic posts and recommend high-ROI paid boost campaigns."
        metaTesterStatus={profile?.metaTesterStatus}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="w-48 h-6 bg-muted rounded"></div>
            <div className="w-64 h-4 bg-muted/60 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-muted rounded-full"></div>
        </div>

        {/* Summary Stats Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/60 border border-border/50"></div>
          ))}
        </div>

        {/* Ad Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/60 border border-border/50 flex">
               <div className="w-[100px] h-[100px] rounded-2xl bg-muted/80 m-6"></div>
               <div className="flex-1 p-6 pl-0 space-y-4">
                 <div className="w-3/4 h-4 bg-muted rounded"></div>
                 <div className="w-1/2 h-4 bg-muted rounded"></div>
                 <div className="w-full h-12 bg-muted/80 rounded-xl mt-4"></div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-white/60">
        <CardContent className="py-16 text-center">
          <p className="text-sm font-bold text-foreground mb-1">Something went wrong</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket size={18} className="text-primary" />
            <h2 className="text-lg font-black text-foreground">Boost Recommendations</h2>
          </div>
          <p className="text-sm text-muted-foreground">AI-identified high-ROI posts personalised for your brand</p>
          {nextScan && (
            <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest mt-1.5">
              Next refresh: {nextScan}
            </p>
          )}
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Sparkles size={11} /> Ads Agent Active
        </span>
      </div>

      {recommendations.length === 0 ? (
        <Card className="border-border/50 bg-white/50 backdrop-blur-sm">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="text-muted-foreground" size={28} />
            </div>
            <p className="text-lg font-bold text-foreground">No boost candidates yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              The Ads Agent only recommends posts with "Viral Momentum". Keep posting to find your next winner!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <SummaryStats recs={recommendations} />
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <AdCard key={rec.id || i} rec={rec} index={i} />
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted/20 border border-border/30">
            <ShieldCheck size={13} className="text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Recommendations are refreshed every 3 days using live Instagram metrics. Budget and reach figures are AI estimates — your actual results will depend on Meta's real-time auction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAds;
