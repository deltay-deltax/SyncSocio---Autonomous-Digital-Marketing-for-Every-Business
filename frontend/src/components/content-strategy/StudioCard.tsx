import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Studio, Mode } from '../../pages/dashboard/ContentStrategy';

export const StudioCard: React.FC<{ s: Studio; i: number; onPick: (id: Mode) => void; isLocked: boolean }> = ({ s, i, onPick, isLocked }) => {
  const Icon = s.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.04 }}
      className={cn("h-full", s.wide ? "md:col-span-2 lg:col-span-3" : "md:col-span-1 lg:col-span-2")}
    >
      <button
        onClick={() => onPick(s.id as Mode)}
        className={cn(
          "group relative flex flex-col w-full h-full min-h-[230px] text-left overflow-hidden rounded-3xl border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant",
          s.featured
            ? "border-transparent bg-gradient-to-br from-indigo-50/60 via-white to-white"
            : "border-transparent",
          s.hoverBorder
        )}
      >
        {s.badge ? (
          <div className={cn("absolute top-4 right-4 z-20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm", s.badge.tint)}>
            {s.badge.label}
          </div>
        ) : null}
        {/* Right image — absolutely positioned so it never affects left column height */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 w-[120px] sm:w-[140px] xl:w-[170px] flex items-center justify-center pointer-events-none",
          s.id === "photoshoot" && "p-3 sm:p-4"
        )}>
          <img
            src={s.image}
            alt={`${s.title} preview`}
            loading="lazy"
            className={cn(
              "h-full w-full transition-transform duration-500",
              s.id === "photoshoot" ? "object-cover rounded-2xl shadow-sm" : "object-contain",
              s.id === "video" && "rotate-3",
              isLocked && "opacity-75 grayscale-[30%]"
            )}
          />
        </div>

        {/* Left content — pr ensures it never overlaps the image */}
        <div className="flex flex-col flex-1 min-w-0 pr-[120px] sm:pr-[150px] xl:pr-[180px] relative z-10">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner shrink-0 relative",
              s.iconBg,
            )}
          >
            <Icon size={20} className={s.iconTint} />
            {isLocked && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Lock size={10} />
              </div>
            )}
          </div>
          <div className="mt-3 flex items-start gap-1.5 pr-2">
            <h3 className="font-display text-base font-black tracking-tight text-foreground leading-tight line-clamp-2">
              {s.title}
            </h3>
            <div title={s.description || s.subtitle} className="mt-[2px] shrink-0 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" onClick={(e) => e.stopPropagation()}>
              <Info size={14} />
            </div>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {s.subtitle}
          </p>

          {/* Pills — wrap gracefully */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {s.tags.map((t) => (
              <span
                key={t.label}
                className={cn(
                  "whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 shrink-0",
                  t.tint,
                )}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4">
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-600">
                <Lock size={12} /> Unlock with Growth / Pro
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[12px] font-bold",
                  s.cta.tint,
                )}
              >
                {s.cta.label}
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
};
