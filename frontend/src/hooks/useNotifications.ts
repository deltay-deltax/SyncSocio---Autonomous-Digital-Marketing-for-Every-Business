import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  _id: string;
  type: 'success' | 'insight' | 'agent' | 'comment' | 'scheduled' | 'alert' | 'billing' | 'support';
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/notifications`, { credentials: 'include',
        headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
      });
      if (res.ok) {
        const _rawJson9 = await res.json();
          const data = _rawJson9 && _rawJson9.success !== undefined ? (_rawJson9.success ? _rawJson9.data : _rawJson9) : _rawJson9;
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, { credentials: 'include',
        method: 'PATCH',
        headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${API_BASE}/notifications/read-all`, { credentials: 'include',
        method: 'PATCH',
        headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds so support replies appear promptly
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
};
