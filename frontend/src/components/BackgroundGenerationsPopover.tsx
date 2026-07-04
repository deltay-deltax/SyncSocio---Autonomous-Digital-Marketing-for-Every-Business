import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Sparkles, X, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BgTask } from '@/pages/dashboard/DashboardLayout';

interface Props {
  tasks: BgTask[];
  onView: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}

export const BackgroundGenerationsPopover: React.FC<Props> = ({ tasks, onView, onRemove, onClearAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeTasks = tasks.filter(t => t.status === 'generating');
  const completedTasks = tasks.filter(t => t.status === 'success');

  if (tasks.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors mr-2">
          {activeTasks.length > 0 ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={18} className="text-primary" />
            </motion.div>
          ) : (
            <Sparkles size={18} className="text-primary" />
          )}
          
          {/* Badge */}
          {activeTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeTasks.length}
            </span>
          )}
          {activeTasks.length === 0 && completedTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {completedTasks.length}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl border-border/50">
        <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Generation Queue</h3>
          <div className="flex items-center gap-3">
            {tasks.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground">{tasks.length} total</span>
            )}
            {onClearAll && (completedTasks.length > 0 || tasks.some(t => t.status === 'error')) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                  if (activeTasks.length === 0) setIsOpen(false);
                }}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          <AnimatePresence>
            {tasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="group relative flex flex-col p-4 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {task.status === 'generating' ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 size={16} className="text-primary shrink-0" />
                      </motion.div>
                    ) : task.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-rose-500 shrink-0" />
                    )}
                    
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-tight">{task.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                        {task.status === 'generating' ? 'Processing...' : task.status === 'success' ? 'Completed' : 'Failed'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity rounded-full hover:bg-muted"
                  >
                    <X size={14} />
                  </button>
                </div>

                {task.status === 'success' && (
                  <button
                    onClick={() => {
                      onView(task.id);
                      setIsOpen(false);
                    }}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Eye size={14} />
                    View Results
                  </button>
                )}
                
                {task.status === 'error' && (
                  <p className="text-xs text-rose-500 mt-2 line-clamp-2 bg-rose-500/10 p-2 rounded">
                    {task.error}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No recent generations.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
