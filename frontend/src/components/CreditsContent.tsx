import React, { useState } from 'react';
import { 
  PenTool, Hash, FileText, ShoppingBag, Calendar, 
  Sparkles, Clock, Fingerprint, BarChart3, Zap, 
  Image as ImageIcon, Video as VideoIcon, Layers, 
  CheckCircle2, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { IMAGE_CREDITS, VIDEO_CREDITS, ALLINONE_CREDITS, FREE_FEATURES } from '@/lib/creditsConfig';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<any>> = {
  PenTool,
  Hash,
  FileText,
  ShoppingBag,
  Calendar,
  Sparkles,
  Clock,
  Fingerprint,
  BarChart3,
};

export const CreditsContent = () => {
  const [activeTab, setActiveTab] = useState<'brand' | 'growth'>('brand');

  return (
    <div className="space-y-12">
      {/* Introduction Banner */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex gap-4 items-start relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="text-primary animate-pulse" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-2">How Credits Work</p>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Credits power AI image and video generation on SyncSocio. Everything related to AI writing—including captions, hashtags, scripts, content strategy, scheduling, analytics, and text generation—is always free. Credits are only consumed when generating images or videos.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 - Image Generation */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
          <ImageIcon size={18} className="text-blue-500" />
          Image Generation
        </h4>
        
        {/* Table for larger screens / Cards for mobile */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/60 bg-card">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold">
                <th className="p-4">Feature</th>
                <th className="p-4 text-right">Credits Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {IMAGE_CREDITS.map((item) => (
                <tr key={item.feature} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium text-foreground">{item.feature}</td>
                  <td className="p-4 text-right font-mono font-bold text-primary">{item.credits} Credits</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {IMAGE_CREDITS.map((item) => (
            <div key={item.feature} className="glass-card p-4 rounded-xl flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">{item.feature}</span>
              <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">{item.credits} Cr</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 - Video Generation */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
          <VideoIcon size={18} className="text-violet-500" />
          Video Generation
        </h4>
        <p className="text-xs text-muted-foreground -mt-2">
          SyncSocio currently supports only 8-second videos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIDEO_CREDITS.map((item) => (
            <div key={item.feature} className="rounded-2xl p-5 border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-violet-500/30 transition-all group">
              <div>
                <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest block mb-2">High Quality Video</span>
                <p className="text-xs font-bold text-foreground leading-tight group-hover:text-violet-500 transition-colors">{item.feature}</p>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-violet-500">{item.credits}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Credits</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2.5 leading-normal">
          <span className="text-amber-500 shrink-0">⚠️</span>
          <p>Both Product Videos and AI UGC Videos currently generate 8-second videos and consume 80 credits each.</p>
        </div>
      </div>

      {/* Section 3 - All-in-One Drop */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
          <Layers size={18} className="text-amber-500" />
          All-in-One Drop
        </h4>

        <div className="grid grid-cols-1 gap-4">
          {ALLINONE_CREDITS.map((item, idx) => (
            <div key={item.feature} className="rounded-2xl p-5 border border-border/60 bg-card hover:border-amber-500/30 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-xs font-bold text-foreground max-w-xl leading-relaxed">{item.feature}</p>
              </div>
              <div className="flex items-baseline gap-1 sm:justify-end shrink-0">
                <span className="text-2xl font-black text-amber-500">{item.credits}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Credits</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-600 flex items-center gap-2.5 font-medium">
          <span className="text-base">💡</span>
          <p>All-in-One Drop saves approximately 15% credits compared to generating every asset individually.</p>
        </div>
      </div>

      {/* Section 4 - Always Free */}
      <div className="space-y-4">
        <div className="rounded-3xl p-4 sm:p-6 md:p-8 bg-emerald-500/[0.03] border border-emerald-500/20 shadow-md">
          <h4 className="text-base font-bold text-emerald-600 flex items-center gap-2 mb-6">
            <CheckCircle2 size={20} className="text-emerald-500" />
            Always Free — Never Uses Credits
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {FREE_FEATURES.map((item) => {
              const IconComp = iconMap[item.iconName] || PenTool;
              return (
                <div key={item.title} className="p-3.5 sm:p-4 rounded-2xl bg-background border border-border/40 flex items-center gap-3 hover:border-emerald-500/20 hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComp size={16} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 5 - What Can I Create With My Credits? */}
      <div className="space-y-5">
        <h4 className="text-base font-bold text-foreground">
          What Can I Create With My Credits?
        </h4>

        {/* Custom Premium Tabs */}
        <div className="flex p-1 rounded-2xl bg-muted/50 border border-border/40 max-w-sm">
          <button
            onClick={() => setActiveTab('brand')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'brand' 
                ? "bg-card text-foreground shadow-sm border border-border/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Starter Plan (200 Cr)
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'growth' 
                ? "bg-card text-foreground shadow-sm border border-border/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Elite Plan (700 Cr)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTab === 'brand' ? (
            <>
              {/* Brand - Option A */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-3">Option A</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">Content Focus</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>40 Static Ads</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or</li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>50 Stories</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or</li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>16 Carousels (3 slides each)</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or Mix</li>
                    <li className="flex items-start gap-2 text-foreground font-medium bg-muted/30 p-2.5 rounded-xl border border-border/40">
                      <span>20 Static Ads + 5 Carousels + 10 Stories</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Brand - Option B */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest block mb-3">Option B</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">With Video</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>1 Product Video (8 sec) + 24 Static Ads</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or</li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>1 AI UGC Video (8 sec) + 24 Static Ads</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Brand - Option C */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-3">Option C</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">All-in-One</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span className="font-bold text-foreground">1 Full Drop</span>
                    </li>
                    <li className="border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Includes:</p>
                      <p>• 2 Images</p>
                      <p>• 2 Carousels (3 slides each)</p>
                      <p>• 4 Ecomm Listings</p>
                      <p>• 1 AI UGC Video</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 italic">+ 12 Static Ads with remaining credits</p>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Growth - Option A */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-3">Option A</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">Content Heavy</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>140 Static Ads</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or</li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>58 Full Carousels</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or Mix</li>
                    <li className="flex items-start gap-2 text-foreground font-medium bg-muted/30 p-2.5 rounded-xl border border-border/40">
                      <span>60 Static Ads + 20 Carousels + 20 Stories</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Growth - Option B */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest block mb-3">Option B</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">With Video</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>5 Product Videos (8 sec) + 60 Static Ads</span>
                    </li>
                    <li className="text-[10px] uppercase font-bold text-muted-foreground/45 pl-3">Or</li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>5 AI UGC Videos (8 sec) + 60 Static Ads</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Growth - Option C */}
              <div className="rounded-2xl p-5 border border-border/60 bg-card/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-3">Option C</span>
                  <h5 className="text-sm font-bold text-foreground mb-4">All-in-One</h5>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span className="font-bold text-foreground">5 Full Drops</span>
                    </li>
                    <li className="border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Includes:</p>
                      <p>• 10 Images</p>
                      <p>• 10 Carousels (3 slides each)</p>
                      <p>• 20 Ecomm Listings</p>
                      <p>• 5 AI UGC Videos</p>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Credits Counter / Summary */}
      <div className="border-t border-border/40 pt-8 space-y-4">
        <h4 className="text-sm font-bold text-foreground">Monthly Plan Credits Summary</h4>
        
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card text-xs max-w-md">
          <div className="grid grid-cols-2 bg-muted/40 border-b border-border/40 p-4 font-semibold text-muted-foreground">
            <div>Plan</div>
            <div className="text-right">Monthly Credits</div>
          </div>
          <div className="divide-y divide-border/40">
            <div className="grid grid-cols-2 p-4">
              <div className="font-bold text-foreground">Starter</div>
              <div className="text-right font-mono font-bold text-primary">200 Credits</div>
            </div>
            <div className="grid grid-cols-2 p-4">
              <div className="font-bold text-foreground">Elite</div>
              <div className="text-right font-mono font-bold text-primary">700 Credits</div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          Need more? Purchase additional credit packs anytime. Top-up credits never expire.
        </p>
      </div>
    </div>
  );
};
