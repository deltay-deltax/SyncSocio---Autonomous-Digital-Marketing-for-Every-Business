import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  CreditCard,
  UserPlus,
  MessageSquare,
  AlertCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

const getIcon = (type: string, severity: string) => {
  switch (type) {
    case 'new_user': return <UserPlus className="h-5 w-5 text-blue-500" />;
    case 'payment': return <CreditCard className="h-5 w-5 text-emerald-500" />;
    case 'failed_gen': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'nexa_escalation': return <MessageSquare className="h-5 w-5 text-rose-500" />;
    default:
      if (severity === 'critical') return <AlertCircle className="h-5 w-5 text-red-500" />;
      if (severity === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getSeverityStyles = (severity: string, isRead: boolean) => {
  const base = isRead ? 'bg-white opacity-70' : 'bg-white shadow-sm ring-1 ring-black/5';
  
  if (!isRead) {
    switch (severity) {
      case 'critical': return `${base} border-l-4 border-red-500`;
      case 'warning': return `${base} border-l-4 border-amber-500`;
      default: return `${base} border-l-4 border-blue-500`;
    }
  }
  return base;
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await axios.get(`${API_URL}/admin/notifications?page=${pageNum}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (append) {
        setNotifications(prev => [...prev, ...res.data.notifications]);
      } else {
        setNotifications(res.data.notifications);
      }
      
      setUnreadCount(res.data.unreadCount);
      setHasMore(pageNum < res.data.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.put(`${API_URL}/admin/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.put(`${API_URL}/admin/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-gray-400" />
            Notification Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            System alerts, user activity, and important events
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 && !loading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up</h3>
            <p className="mt-1 text-sm text-gray-500">No new notifications right now.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-4 rounded-xl transition-all ${getSeverityStyles(notif.severity, notif.isRead)}`}
              >
                <div className="flex gap-4">
                  <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                    notif.isRead ? 'bg-gray-100' : 'bg-gray-50'
                  }`}>
                    {getIcon(notif.type, notif.severity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm font-medium ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notif.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                        </span>
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead(notif._id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => fetchNotifications(page + 1, true)}
              disabled={loading}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
