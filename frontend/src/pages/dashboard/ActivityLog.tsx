import React from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, TrendingUp, Zap, MessageSquare, Clock, Sparkles, Target, Trash2, CheckSquare } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ActivityLog: React.FC = () => {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle2;
      case 'insight': return TrendingUp;
      case 'agent': return Zap;
      case 'comment': return MessageSquare;
      case 'scheduled': return Clock;
      case 'alert': return Sparkles;
      case 'billing': return Target;
      default: return Zap;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'success': return "bg-emerald-500/10 text-emerald-600";
      case 'insight': return "bg-amber-500/10 text-amber-600";
      case 'alert': return "bg-rose-500/10 text-rose-600";
      case 'billing': return "bg-blue-500/10 text-blue-600";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-display">
              Activity <span className="text-primary italic">Log</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium uppercase tracking-widest">
              Real-time Agent Operations & Alerts
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="rounded-xl border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50"
            >
              <CheckSquare size={14} className="mr-2" /> Mark All Read
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
             <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-900">Quiet for now</h3>
             <p className="text-slate-500 text-sm mt-1">When the agent takes action, you'll see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n, index) => {
              const Icon = getIcon(n.type);
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={cn(
                    "bg-white p-5 rounded-[2rem] border transition-all cursor-pointer group hover:border-primary/30 flex items-center gap-5 shadow-sm",
                    !n.isRead ? "border-primary/20 bg-primary/[0.01]" : "border-slate-200/60 opacity-80"
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", getColorClass(n.type))}>
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors">
                        {n.title}
                      </h3>
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-2 font-medium">
                      {n.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", !n.isRead ? "text-primary" : "text-slate-400")}>
                        {n.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-rose-500 rounded-full h-8 w-8">
                       <Trash2 size={16} />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
