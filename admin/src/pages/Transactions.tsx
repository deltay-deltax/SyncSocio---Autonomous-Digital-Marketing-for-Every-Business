import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, ReceiptText, RefreshCw, RotateCcw } from 'lucide-react';

const API = `\${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

interface Transaction {
  _id: string;
  user: { _id: string; email: string; name?: string; plan?: string } | null;
  plan: string;
  amount: number;
  discountPercentage: number;
  discountAmount: number;
  couponCode?: string;
  status: 'completed' | 'refunded' | 'failed';
  createdAt: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  refunded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const location = useLocation();
  
  // If the admin navigated to the dedicated /refunds page, default to refunded
  const isRefundRoute = location.pathname === '/refunds';
  const [statusFilter, setStatusFilter] = useState(isRefundRoute ? 'refunded' : (location.state?.statusFilter || ''));
  const [page, setPage] = useState(1);

  // Keep filter in sync if route changes
  useEffect(() => {
    if (location.pathname === '/refunds') setStatusFilter('refunded');
    else if (location.pathname === '/transactions' && statusFilter === 'refunded') setStatusFilter('');
  }, [location.pathname]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await axios.get(`${API}/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setPagination(res.data.pagination);
      }
    } catch {
      console.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleRefund = async (txnId: string) => {
    if (!window.confirm('Mark this transaction as refunded?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API}/transactions/${txnId}/refund`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransactions();
    } catch {
      alert('Failed to process refund.');
    }
  };

  const totalRevenue = useMemo(
    () => transactions.filter(t => t.status === 'completed').reduce((a, t) => a + t.amount, 0),
    [transactions]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
          Transactions Log
        </h2>
        <p className="text-muted-foreground mt-1">Complete billing history — {pagination.total.toLocaleString()} total transactions.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: pagination.total.toLocaleString(), color: 'blue' },
          { label: 'Page Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'emerald' },
          { label: 'Completed', value: transactions.filter(t => t.status === 'completed').length, color: 'green' },
          { label: 'Refunded', value: transactions.filter(t => t.status === 'refunded').length, color: 'amber' },
        ].map((s) => (
          <div key={s.label} className="glass-card border border-transparent rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${s.color}-400`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 glass-card border border-transparent p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search by email, name, or coupon code..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none w-full sm:w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={fetchTransactions}
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
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Coupon</th>
                <th className="px-6 py-4 font-semibold">Discount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <ReceiptText className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">No transactions match your filters.</p>
                  </td>
                </tr>
              ) : transactions.map((t) => (
                <tr key={t._id} className="hover:bg-muted/10 transition-colors divide-x divide-border/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{t.user?.email || 'Deleted User'}</div>
                    {t.user?.name && <div className="text-xs text-muted-foreground">{t.user.name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`capitalize px-2 py-0.5 text-xs rounded-full font-medium ${
                      t.plan?.toLowerCase().includes('elite')
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {t.plan || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400 whitespace-nowrap">₹{t.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {t.couponCode ? (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 whitespace-nowrap">
                        {t.couponCode}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                    {t.discountAmount > 0 ? (
                      <span className="text-amber-500">-₹{t.discountAmount} ({t.discountPercentage}%)</span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs rounded-full border font-medium capitalize ${STATUS_STYLES[t.status] || ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(t._id)}
                        className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                        title="Mark as Refunded"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
