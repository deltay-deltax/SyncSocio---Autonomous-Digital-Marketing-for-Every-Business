import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, CalendarClock, RefreshCw } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';

interface ScheduledPost {
  _id: string;
  userId: { _id: string; email: string; name?: string } | null;
  contentType: string;
  status: 'scheduled' | 'published' | 'failed' | 'analyzed';
  scheduledAt: string;
  createdAt: string;
  platforms?: { instagram?: boolean; facebook?: boolean };
  mediaUrls?: string[];
  mediaUrl?: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  analyzed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function ScheduledPosts() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await axios.get(`${API}/scheduled-posts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPosts(res.data.posts);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
          Scheduled Posts
        </h2>
        <p className="text-muted-foreground mt-1">Monitor users' scheduled and published posts — {pagination.total.toLocaleString()} total records.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: pagination.total.toLocaleString(), color: 'blue' },
          { label: 'Scheduled', value: posts.filter(p => p.status === 'scheduled').length, color: 'blue' },
          { label: 'Published', value: posts.filter(p => p.status === 'published').length, color: 'emerald' },
          { label: 'Failed', value: posts.filter(p => p.status === 'failed').length, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="glass-card border border-transparent rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${s.color}-400`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 glass-card border border-transparent p-4 rounded-xl">
        <select
          className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none w-full sm:w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={fetchPosts}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr className="divide-x divide-border/50">
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Content Type</th>
                <th className="px-6 py-4 font-semibold">Media Count</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Scheduled For</th>
                <th className="px-6 py-4 font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CalendarClock className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">No posts match your filters.</p>
                  </td>
                </tr>
              ) : posts.map((p) => {
                const mediaCount = (p.mediaUrls && p.mediaUrls.length > 0) ? p.mediaUrls.length : (p.mediaUrl ? 1 : 0);
                return (
                  <tr key={p._id} className="hover:bg-muted/10 transition-colors divide-x divide-border/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{p.userId?.email || 'Deleted User'}</div>
                      {p.userId?.name && <div className="text-xs text-muted-foreground">{p.userId.name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-0.5 text-xs rounded-full font-medium bg-violet-500/10 text-violet-400">
                        {p.contentType || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {mediaCount} {mediaCount === 1 ? 'file' : 'files'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full border font-medium capitalize ${STATUS_STYLES[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.scheduledAt ? (
                        <div className="flex flex-col whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {new Date(p.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.pages}</span> — {pagination.total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-border hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
