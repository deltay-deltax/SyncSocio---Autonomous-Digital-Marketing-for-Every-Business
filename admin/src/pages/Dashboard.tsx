import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, UserCheck, Coins, IndianRupee, Tag, Ticket, ArrowUpRight,
  AlertTriangle, Plus, RefreshCw, Activity
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:5050/api/admin';

interface Transaction {
  _id: string;
  user: { _id: string; email: string; name?: string } | null;
  plan: string;
  amount: number;
  discountPercentage: number;
  discountAmount: number;
  couponCode?: string;
  createdAt: string;
}

interface Metrics {
  totalUsers: number;
  verifiedUsers: number;
  activeUsersToday: number;
  newSignupsThisWeek: number;
  assetsGeneratedToday: number;
  assetsGeneratedMonth: number;
  totalCredits: number;
  totalCreditsConsumed: number;
  totalRevenue: number;
  mrr: number;
  totalDiscounts: number;
  activeCoupons: number;
  apiCostToday: number;
  failedGenerations: number;
  topBrands: any[];
  recentTransactions: Transaction[];
  visitorsToday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  visitorsTotal: number;
}

// Tiny sparkline — generates a fake 7-point trend from a seed value
const Sparkline = ({ value, color }: { value: number; color: string }) => {
  const data = Array.from({ length: 7 }, (_, i) => ({
    v: Math.max(0, value * (0.5 + (i / 7) * 0.7 + (Math.sin(i * 1.2) * 0.15)))
  }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();

  const fetchMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMetrics(res.data.metrics);
        setLastRefreshed(new Date());
      } else {
        setError('Failed to fetch metrics');
      }
    } catch (err: any) {
      console.error('Failed to fetch metrics', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Your session might have expired or the server secret changed. Please log in again.');
      } else {
        setError('Failed to fetch metrics. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse text-lg">Loading platform overview...</div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 font-medium text-lg">{error}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total / Active Users',
      value: metrics?.totalUsers ?? 0,
      sub: `${metrics?.activeUsersToday ?? 0} active today · ${metrics?.newSignupsThisWeek ?? 0} new this week`,
      icon: Users,
      color: '#3b82f6',
      sparkValue: metrics?.totalUsers ?? 0,
      borderHover: 'hover:border-blue-500/30',
    },
    {
      label: 'Creatives Generated',
      value: metrics?.assetsGeneratedMonth ?? 0,
      sub: `${metrics?.assetsGeneratedToday ?? 0} generated today`,
      icon: UserCheck,
      color: '#22c55e',
      sparkValue: metrics?.assetsGeneratedMonth ?? 0,
      borderHover: 'hover:border-green-500/30',
    },
    {
      label: 'Credit Usage',
      value: `${(metrics?.totalCreditsConsumed ?? 0).toLocaleString()} used`,
      sub: `${(metrics?.totalCredits ?? 0).toLocaleString()} credits remaining`,
      icon: Coins,
      color: '#8b5cf6',
      sparkValue: metrics?.totalCreditsConsumed ?? 0,
      borderHover: 'hover:border-violet-500/30',
    },
    {
      label: 'SaaS Revenue & MRR',
      value: `₹${(metrics?.totalRevenue ?? 0).toLocaleString()}`,
      sub: `MRR: ₹${(metrics?.mrr ?? 0).toLocaleString()}`,
      icon: IndianRupee,
      color: '#10b981',
      sparkValue: metrics?.totalRevenue ?? 0,
      borderHover: 'hover:border-emerald-500/30',
    },
    {
      label: 'API Cost (Today)',
      value: `$${(metrics?.apiCostToday ?? 0).toFixed(2)}`,
      sub: metrics?.failedGenerations
        ? `⚠ ${metrics.failedGenerations} failed generations`
        : '✓ All APIs operational',
      icon: Tag,
      color: '#f43f5e',
      sparkValue: metrics?.apiCostToday ?? 0,
      borderHover: 'hover:border-rose-500/30',
    },
    {
      label: 'Discounts Applied',
      value: `₹${(metrics?.totalDiscounts ?? 0).toLocaleString()}`,
      sub: `${metrics?.activeCoupons ?? 0} active coupon codes`,
      icon: Ticket,
      color: '#f59e0b',
      sparkValue: metrics?.totalDiscounts ?? 0,
      borderHover: 'hover:border-amber-500/30',
    },
    {
      label: 'Website Traffic',
      value: (metrics?.visitorsTotal ?? 0).toLocaleString(),
      sub: `${(metrics?.visitorsToday ?? 0).toLocaleString()} today · ${(metrics?.visitorsMonth ?? 0).toLocaleString()} this month`,
      icon: ArrowUpRight,
      color: '#06b6d4',
      sparkValue: metrics?.visitorsTotal ?? 0,
      borderHover: 'hover:border-cyan-500/30',
    },
  ];

  // Platform alerts
  const alerts = [
    metrics?.failedGenerations && metrics.failedGenerations > 0
      ? { label: `${metrics.failedGenerations} failed API generations`, color: 'red', icon: AlertTriangle }
      : null,
    (metrics?.activeCoupons ?? 0) === 0
      ? { label: 'No active coupons — create one to drive conversions', color: 'amber', icon: Ticket }
      : null,
  ].filter(Boolean) as Array<{ label: string; color: string; icon: any }>;

  const quickActions = [
    { label: 'New Coupon', icon: Plus, color: 'blue', to: '/coupons' },
    { label: 'View Users', icon: Users, color: 'violet', to: '/users' },
    { label: 'Analytics', icon: Activity, color: 'emerald', to: '/analytics' },
    { label: 'System Health', icon: Activity, color: 'rose', to: '/system-health' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
            Platform Overview
          </h2>
          <p className="text-muted-foreground mt-1">Real-time statistics, SaaS billing performance, and user activity metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={() => { setLoading(true); fetchMetrics(); }}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs hover:bg-muted/20 transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Platform Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              alert.color === 'red'
                ? 'bg-red-500/5 border-red-500/20 text-red-400'
                : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
            }`}>
              <alert.icon size={16} />
              <span className="text-sm font-medium">{alert.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => navigate(qa.to)}
            className={`flex items-center gap-2.5 px-4 py-3 glass-card rounded-xl text-sm font-medium text-foreground hover:border-${qa.color}-500/40 hover:bg-${qa.color}-500/10 transition-all group hover-lift`}
          >
            <qa.icon size={16} className={`text-${qa.color}-400`} />
            {qa.label}
          </button>
        ))}
      </div>

      {/* KPI Grid with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`glass-card rounded-2xl p-6 flex flex-col justify-between ${kpi.borderHover} transition-all hover-lift`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{kpi.label}</h3>
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${kpi.color}18` }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
            <div className="mt-3 -mx-1">
              <Sparkline value={kpi.sparkValue} color={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions Table */}
      <div className="mt-4 glass-card rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Recent SaaS Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest subscription purchases. Auto-refreshes every 60s.</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Paid Amount</th>
                <th className="px-6 py-4 font-semibold">Coupon Used</th>
                <th className="px-6 py-4 font-semibold">Discount</th>
                <th className="px-6 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics?.recentTransactions?.map((t) => (
                <tr key={t._id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div>{t.user?.email || 'Deleted User'}</div>
                    {t.user?.name && <div className="text-xs text-muted-foreground font-normal">{t.user.name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`capitalize px-2 py-0.5 text-xs rounded-full font-medium ${
                      t.plan?.toLowerCase().includes('growth')
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">₹{t.amount}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {t.couponCode ? (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                        {t.couponCode}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {t.discountAmount > 0 ? (
                      <span className="text-amber-500">-₹{t.discountAmount} ({t.discountPercentage}%)</span>
                    ) : 'None'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {(!metrics?.recentTransactions || metrics.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
