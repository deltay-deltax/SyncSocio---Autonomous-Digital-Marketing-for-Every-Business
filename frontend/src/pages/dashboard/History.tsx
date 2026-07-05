import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Video,
  Image as ImageIcon,
  Layers,
  Clock,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  CalendarClock,
  Trash2,
  Inbox,
  FileText,
  AlertCircle,
  Zap,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axios from "axios";
import type { ContentType } from "@/lib/content-plan";

const InstagramIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; tint: string }
> = {
  reel: { label: "Reel", icon: Video, tint: "bg-primary/10 text-primary" },
  image: { label: "Image", icon: ImageIcon, tint: "bg-sky-100 text-sky-600" },
  static: { label: "Image", icon: ImageIcon, tint: "bg-sky-100 text-sky-600" },
  carousel: { label: "Carousel", icon: Layers, tint: "bg-indigo-100 text-indigo-600" },
};

function formatDateTime(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(isoStr: string) {
  const ms = new Date(isoStr).getTime();
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  if (m < 60) return diff > 0 ? `in ${m}m` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return diff > 0 ? `in ${h}h` : `${h}h ago`;
  const days = Math.round(h / 24);
  return diff > 0 ? `in ${days}d` : `${days}d ago`;
}

const History: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/posts/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter items that have been through the publisher
  const processedItems = items.filter(i => i.status === 'published' || i.status === 'failed' || i.status === 'scheduled');

  const failed = processedItems.filter(i => i.status === 'failed');

  const scheduled = processedItems.filter(i => {
    if (i.status === 'failed') return false;
    // If explicitly scheduled status
    if (i.status === 'scheduled') return true;
    // If it has a future date, it belongs in scheduled regardless of status string
    if (i.scheduledAt && new Date(i.scheduledAt) > now) return true;
    return false;
  });

  const published = processedItems.filter(i => {
    if (i.status !== 'published') return false;
    // If it's a published post but has a future date, it's still "active" in scheduled
    if (i.scheduledAt && new Date(i.scheduledAt) > now) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-5xl mx-auto px-6 py-4">
        {/* Header Navigation */}
        <div className="flex items-center justify-end mb-4">
          <button onClick={fetchHistory} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
            Refresh Data
          </button>
        </div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight font-display">
            Post <span className="text-primary italic">History</span>
          </h1>
          <p className="mt-3 text-slate-500 text-sm md:text-base font-medium">
            Everything you've scheduled and published — in one timeline.
          </p>
        </motion.div>

        {/* Stat Cards */}
        {!loading && processedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard label="Scheduled" value={scheduled.length} icon={CalendarClock} tint="text-primary bg-primary/10" />
            <StatCard label="Published" value={published.length} icon={CheckCircle2} tint="text-emerald-600 bg-emerald-100" />
            <StatCard label="Total" value={processedItems.length} icon={FileText} tint="text-indigo-600 bg-indigo-100" />
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : processedItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
            <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No posts yet</h3>
            <p className="text-slate-500 text-sm mt-1">Start by optimizing a post in the Content Mix.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Scheduled Section */}
            {scheduled.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6 px-1">
                  <CalendarClock size={16} className="text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                    Scheduled
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400">— Going live soon</span>
                </div>
                <div className="space-y-3">
                  {scheduled.map(item => <HistoryRow key={item._id} entry={item} scheduled />)}
                </div>
              </div>
            )}

            {/* Published Section */}
            {published.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <div className="flex items-center gap-2 mb-6 px-1">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                  </div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                    Published
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400">— Already live</span>
                </div>
                <div className="space-y-4">
                  {published.map(item => <HistoryRow key={item._id} entry={item} />)}
                </div>
              </div>
            )}

            {failed.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                <div className="flex items-center gap-2 mb-6 mt-12 px-1">
                  <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertCircle size={12} className="text-rose-600" />
                  </div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">
                    Delivery Issues
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400">— Failed attempts</span>
                </div>
                <div className="space-y-4 opacity-80">
                  {failed.map(item => <HistoryRow key={item._id} entry={item} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: any; tint: string }) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", tint)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-3xl font-bold text-slate-900 leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}

function HistoryRow({ entry, scheduled }: { entry: any; scheduled?: boolean }) {
  const type = (entry.contentType || 'image') as ContentType;
  const meta = TYPE_META[type as keyof typeof TYPE_META] || TYPE_META.image;
  const Icon = meta.icon;
  const isFailed = entry.status === 'failed';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const thumbUrl = entry.permanentUrl || (type === 'carousel' ? entry.slides?.[0]?.image : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[1.5rem] border border-slate-200/60 shadow-sm overflow-hidden hover:border-primary/30 transition-all group"
    >
      <div className="p-4 md:p-5 flex items-center gap-4 md:gap-6">
        {/* Media Thumbnail - clickable for preview */}
        <div
          onClick={() => {
            if (thumbUrl) setPreviewUrl(thumbUrl);
          }}
          className={cn("w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 relative", thumbUrl && "cursor-zoom-in")}
        >
          {thumbUrl ? (
            type === 'reel' ? (
              <video src={thumbUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={thumbUrl} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Icon size={24} />
            </div>
          )}
          {entry.isAgentAssisted && (
            <div className="absolute top-1.5 right-1.5 bg-primary text-white p-1 rounded-lg shadow-lg">
              <Zap size={8} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
            <div className={cn("flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0", meta.tint)}>
              <Icon size={10} />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{meta.label}</span>
            </div>
            {isFailed ? (
              <Badge className="bg-rose-50 text-rose-600 border-0 text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
                Failed
              </Badge>
            ) : scheduled ? (
              <Badge className="bg-primary/10 text-primary border-0 text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
                Scheduled
              </Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
                Published
              </Badge>
            )}

            {/* Platform Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
              {entry.platforms?.instagram !== false && (
                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <InstagramIcon size={12} />
                </div>
              )}
              {entry.platforms?.facebook && (
                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-[15px] md:text-lg font-bold text-slate-900 truncate tracking-tight">
            {entry.description || "Untitled Post"}
          </h3>

          <div className="flex items-center gap-4 mt-1.5 text-slate-400 flex-wrap font-medium">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Calendar size={12} className="text-slate-300" /> {formatDateTime(entry.scheduledAt || entry.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <Clock size={12} className="text-slate-300" /> {relativeTime(entry.scheduledAt || entry.createdAt)}
            </span>
            {entry.mediaUrls && entry.mediaUrls.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] truncate max-w-[150px]">
                <FileText size={12} className="text-slate-300" /> {entry.mediaUrls[0].split('\\').pop().split('/').pop()}
              </span>
            )}
          </div>
        </div>

        {/* Actions/Link */}
        <div className="hidden sm:block">
          <ChevronRight size={20} className="text-slate-200 group-hover:text-primary transition-colors" />
        </div>
      </div>

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
              className="max-w-[90vw] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative bg-card flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {type === 'reel' ? (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh] object-contain max-w-full"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Post Preview"
                  className="w-full h-auto max-h-[80vh] object-contain max-w-full"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default History;
