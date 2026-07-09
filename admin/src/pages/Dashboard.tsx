import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, UserCheck, Coins, IndianRupee, Tag, Ticket, ArrowUpRight,
  AlertTriangle, RefreshCw, X, Globe, Calendar,
  Zap, TrendingUp, CreditCard, ImageIcon, Clock
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
  status?: string;
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
  visitorUniqueSessions?: number;
  visitorsByDate?: Array<{ _id: string; count: number }>;
}

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

const Modal = ({
  open, onClose, title, subtitle, iconColor, Icon, children
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  iconColor: string; Icon: any; children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-card w-full max-w-2xl max-h-[88vh] flex flex-col rounded-[2.5rem] shadow-[0_25px_80px_-20px_hsl(221_83%_53%/0.15),0_0_0_1px_hsl(220_15%_90%/0.8)] dark:shadow-[0_25px_80px_-20px_hsl(221_83%_53%/0.25),0_0_0_1px_hsl(220_15%_10%/0.8)] border border-border/50 overflow-hidden relative"
        style={{ animation: 'modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${iconColor}18` }}>
              <Icon size={18} style={{ color: iconColor }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-3 bg-muted/10 border-t border-border/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-foreground text-background font-black uppercase tracking-widest rounded-xl text-[10px] hover:opacity-90 transition-all active:scale-95 shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const fmt = (d: string) => {
  const safeDate = typeof d === 'string' ? d.replace(/Z$/, '') : d;
  return new Date(safeDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PlanBadge = ({ plan }: { plan: string }) => {
  const lower = (plan || '').toLowerCase();
  const cls = lower.includes('elite')
    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    : lower.includes('pro') || lower.includes('growth')
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : lower.includes('starter')
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-muted/60 text-muted-foreground border-border';
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${cls}`}>
      {plan || 'Free'}
    </span>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="p-4 bg-muted/30 rounded-2xl text-muted-foreground">
      <AlertTriangle size={28} />
    </div>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();

  const [trafficModal, setTrafficModal] = useState(false);
  const [discountModal, setDiscountModal] = useState(false);
  const [apiModal, setApiModal] = useState(false);
  const [revenueModal, setRevenueModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [creativesModal, setCreativesModal] = useState(false);
  const [activeUsersModal, setActiveUsersModal] = useState(false);

  const [discountData, setDiscountData] = useState<any[]>([]);
  const [apiData, setApiData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [creditData, setCreditData] = useState<any[]>([]);
  const [creativesData, setCreativesData] = useState<any[]>([]);
  const [activeUsersData, setActiveUsersData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/metrics`, authHeaders());
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

  const openModal = async (
    setter: (v: boolean) => void,
    dataSetter: (v: any[]) => void,
    endpoint: string
  ) => {
    setter(true);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}${endpoint}`, authHeaders());
      if (res.data.success) dataSetter(res.data.items);
    } catch (e) {
      console.error('Failed to fetch detail data', e);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
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
    const isAuthError = error.includes('Authentication failed');
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <div className="text-red-500 font-medium text-lg max-w-md">{error}</div>
        <div className="flex gap-3">
          {isAuthError ? (
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                navigate('/login');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Log Out &amp; Login Again
            </button>
          ) : (
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors">
              Retry
            </button>
          )}
        </div>
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
      onClick: () => openModal(setActiveUsersModal, setActiveUsersData, '/details/active-users'),
    },
    {
      label: 'Creatives Generated',
      value: metrics?.assetsGeneratedMonth ?? 0,
      sub: `${metrics?.assetsGeneratedToday ?? 0} generated today`,
      icon: UserCheck,
      color: '#22c55e',
      sparkValue: metrics?.assetsGeneratedMonth ?? 0,
      borderHover: 'hover:border-green-500/30',
      onClick: () => openModal(setCreativesModal, setCreativesData, '/details/creatives'),
    },
    {
      label: 'Credit Usage',
      value: `${(metrics?.totalCreditsConsumed ?? 0).toLocaleString()} used`,
      sub: `${(metrics?.totalCredits ?? 0).toLocaleString()} credits remaining`,
      icon: Coins,
      color: '#8b5cf6',
      sparkValue: metrics?.totalCreditsConsumed ?? 0,
      borderHover: 'hover:border-violet-500/30',
      onClick: () => openModal(setCreditModal, setCreditData, '/details/credits'),
    },
    {
      label: 'SaaS Revenue & MRR',
      value: `₹${(metrics?.totalRevenue ?? 0).toLocaleString()}`,
      sub: `MRR: ₹${(metrics?.mrr ?? 0).toLocaleString()}`,
      icon: IndianRupee,
      color: '#10b981',
      sparkValue: metrics?.totalRevenue ?? 0,
      borderHover: 'hover:border-emerald-500/30',
      onClick: () => openModal(setRevenueModal, setRevenueData, '/details/revenue'),
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
      onClick: () => openModal(setApiModal, setApiData, '/details/api-cost'),
    },
    {
      label: 'Discounts Applied',
      value: `₹${(metrics?.totalDiscounts ?? 0).toLocaleString()}`,
      sub: `${metrics?.activeCoupons ?? 0} active coupon codes`,
      icon: Ticket,
      color: '#f59e0b',
      sparkValue: metrics?.totalDiscounts ?? 0,
      borderHover: 'hover:border-amber-500/30',
      onClick: () => openModal(setDiscountModal, setDiscountData, '/details/discounts'),
    },
    {
      label: 'Website Traffic',
      value: (metrics?.visitorsTotal ?? 0).toLocaleString(),
      sub: `${(metrics?.visitorsToday ?? 0).toLocaleString()} today · ${(metrics?.visitorsMonth ?? 0).toLocaleString()} this month`,
      icon: ArrowUpRight,
      color: '#06b6d4',
      sparkValue: metrics?.visitorsTotal ?? 0,
      borderHover: 'hover:border-cyan-500/30',
      onClick: () => setTrafficModal(true),
    },
  ];

  const alerts = [
    metrics?.failedGenerations && metrics.failedGenerations > 0
      ? { label: `${metrics.failedGenerations} failed API generations`, color: 'red', icon: AlertTriangle }
      : null,
    (metrics?.activeCoupons ?? 0) === 0
      ? { label: 'No active coupons — create one to drive conversions', color: 'amber', icon: Ticket }
      : null,
  ].filter(Boolean) as Array<{ label: string; color: string; icon: any }>;


  return (
    <div className="relative w-full rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_25px_80px_-20px_hsl(221_83%_53%/0.08),0_0_0_1px_hsl(220_15%_90%/0.5)] dark:shadow-[0_25px_80px_-20px_hsl(221_83%_53%/0.15),0_0_0_1px_hsl(220_15%_10%/0.5)] p-6 md:p-10 overflow-hidden z-10 transition-all duration-500 min-h-[85vh]">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[100px] pointer-events-none" />

      <div className="relative z-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              Platform Overview
            </h2>
            <p className="text-xs font-black text-muted-foreground mt-2 uppercase tracking-widest">Real-time statistics, SaaS billing performance, and user activity metrics.</p>
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


      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            onClick={kpi.onClick}
            className={`bg-card/80 backdrop-blur-md rounded-[2rem] p-7 flex flex-col justify-between border border-border/50 shadow-sm transition-all cursor-pointer hover:bg-muted/10 hover:shadow-xl hover:shadow-${kpi.color}/5 hover:border-${kpi.color}/30 active:scale-[0.98] relative group overflow-hidden`}
          >
            {/* Subtle inner glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${kpi.color}15 0%, transparent 60%)` }} />
            
            <div className="relative z-10 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</h3>
              <div className="p-3 rounded-2xl shadow-sm border border-border/50 transition-transform group-hover:scale-110 group-hover:rotate-3 bg-card" style={{ boxShadow: `0 4px 20px -5px ${kpi.color}40` }}>
                <kpi.icon size={22} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="relative z-10 mt-5">
              <p className="text-4xl font-black text-foreground tracking-tight">{kpi.value}</p>
              <p className="text-xs font-bold text-muted-foreground mt-2 opacity-80">{kpi.sub}</p>
            </div>
            <div className="relative z-10 mt-4 -mx-2">
              <Sparkline value={kpi.sparkValue} color={kpi.color} />
            </div>
            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <ArrowUpRight size={18} className="text-foreground/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions Table */}
      <div className="mt-8 bg-card/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-border/50 overflow-hidden transition-all hover:shadow-md">
        <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-muted/10">
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground">Recent SaaS Transactions</h3>
            <p className="text-[10px] font-black text-muted-foreground mt-1.5 uppercase tracking-widest">Latest subscription purchases. Auto-refreshes every 60s.</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all active:scale-95"
          >
            View all <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-black uppercase tracking-widest bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Plan</th>
                <th className="px-8 py-4">Paid Amount</th>
                <th className="px-8 py-4">Coupon Used</th>
                <th className="px-8 py-4">Discount</th>
                <th className="px-8 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {metrics?.recentTransactions?.map((t) => (
                <tr key={t._id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-8 py-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                    <div>{t.user?.email || 'Deleted User'}</div>
                    {t.user?.name && <div className="text-xs text-muted-foreground font-normal">{t.user.name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`capitalize px-2 py-0.5 text-xs rounded-full font-medium ${
                      t.plan?.toLowerCase().includes('elite')
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

      {/* ── MODAL: Website Traffic ── */}
      <Modal
        open={trafficModal} onClose={() => setTrafficModal(false)}
        title="Website Traffic Details" subtitle="Live visitor metrics & daily trends"
        iconColor="#06b6d4" Icon={Globe}
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Hits', value: metrics?.visitorsTotal ?? 0, color: 'text-foreground' },
              { label: 'Unique Sessions', value: metrics?.visitorUniqueSessions ?? metrics?.visitorsTotal ?? 0, color: 'text-cyan-400' },
              { label: 'Today', value: metrics?.visitorsToday ?? 0, color: 'text-foreground' },
              { label: 'This Month', value: metrics?.visitorsMonth ?? 0, color: 'text-foreground' },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 border border-border/50 rounded-2xl p-4">
                <span className="text-xs text-muted-foreground font-medium block">{s.label}</span>
                <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Calendar size={13} /><span>Traffic by Date</span>
            </div>
            <div className="border border-border/50 rounded-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-border bg-muted/10">
              {metrics?.visitorsByDate && metrics.visitorsByDate.length > 0 ? (
                [...metrics.visitorsByDate].reverse().map((day) => {
                  const maxCount = Math.max(...(metrics?.visitorsByDate?.map(d => d.count) || [1]));
                  const pct = Math.min(100, Math.max(4, (day.count / maxCount) * 100));
                  return (
                    <div key={day._id} className="p-3.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-foreground">{day._id}</span>
                        <span className="font-bold text-cyan-400 text-xs px-2 py-0.5 bg-cyan-500/10 rounded-full">
                          {day.count} {day.count === 1 ? 'hit' : 'hits'}
                        </span>
                      </div>
                      <div className="w-full bg-muted-foreground/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No traffic data found.</div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Discounts Applied ── */}
      <Modal
        open={discountModal} onClose={() => setDiscountModal(false)}
        title="Discounts Applied" subtitle="Coupon usage per brand — who, what plan, how much saved, when"
        iconColor="#f59e0b" Icon={Ticket}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : discountData.length === 0 ? <EmptyState text="No discount transactions found." /> : (
          <div className="divide-y divide-border/50">
            {discountData.map((item) => (
              <div key={item._id} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                    {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PlanBadge plan={item.plan} />
                      {item.couponCode && item.couponCode !== '—' && (
                        <span className="px-2 py-0.5 text-xs font-mono rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">{item.couponCode}</span>
                      )}
                      {(item.status || 'completed') === 'completed' ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bought</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 capitalize">{item.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-400">-₹{item.discountAmount} <span className="text-xs text-muted-foreground">({item.discountPercentage}%)</span></p>
                    <p className="text-xs text-emerald-400 mt-0.5">Paid ₹{item.amount}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock size={11} /> {fmt(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── MODAL: API Cost ── */}
      <Modal
        open={apiModal} onClose={() => setApiModal(false)}
        title="API Cost Breakdown" subtitle="Per-call spend by user, provider & endpoint — last 100 calls"
        iconColor="#f43f5e" Icon={Zap}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : apiData.length === 0 ? <EmptyState text="No API cost logs found." /> : (
          <div className="divide-y divide-border/50">
            {apiData.map((item) => (
              <div key={item._id} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{item.endpoint}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${
                        item.provider === 'FAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : item.provider === 'CLAUDE' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : item.provider === 'OPENAI' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-muted/40 text-muted-foreground border-border'
                      }`}>{item.provider}</span>
                      {item.isError && (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-500/10 text-red-400 border border-red-500/20">⚠ Failed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-rose-400">${(item.costInCents / 100).toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{item.costInCents}¢</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock size={11} /> {fmt(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── MODAL: SaaS Revenue ── */}
      <Modal
        open={revenueModal} onClose={() => setRevenueModal(false)}
        title="SaaS Revenue Details" subtitle="All completed transactions — user, plan, amount & timeline"
        iconColor="#10b981" Icon={TrendingUp}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : revenueData.length === 0 ? <EmptyState text="No revenue transactions found." /> : (
          <div className="divide-y divide-border/50">
            {revenueData.map((item) => (
              <div key={item._id} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                    {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PlanBadge plan={item.plan} />
                      {item.type && (
                        <span className="px-2 py-0.5 text-xs rounded-full border capitalize bg-muted/40 text-muted-foreground border-border">
                          {item.type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {item.couponCode && (
                        <span className="px-2 py-0.5 text-xs font-mono rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">{item.couponCode}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">₹{item.amount}</p>
                    {item.discountAmount > 0 && <p className="text-xs text-amber-400 mt-0.5">-₹{item.discountAmount} off</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock size={11} /> {fmt(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── MODAL: Credit Usage ── */}
      <Modal
        open={creditModal} onClose={() => setCreditModal(false)}
        title="Credit Usage per User" subtitle="Purchased, consumed & remaining credits with usage %"
        iconColor="#8b5cf6" Icon={CreditCard}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : creditData.length === 0 ? <EmptyState text="No credit usage data found." /> : (
          <div className="divide-y divide-border/50">
            {creditData.map((item) => {
              const pct = item.totalPurchased > 0
                ? Math.min(100, Math.round((item.totalConsumed / item.totalPurchased) * 100)) : 0;
              return (
                <div key={String(item._id)} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                      {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                      <div className="mt-1"><PlanBadge plan={item.plan} /></div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Consumed</p>
                      <p className="text-sm font-bold text-violet-400">{item.totalConsumed.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Purchased: {item.totalPurchased.toLocaleString()}</span>
                      <span>Remaining: <span className="text-violet-300 font-medium">{item.creditsRemaining.toLocaleString()}</span></span>
                    </div>
                    <div className="w-full bg-muted-foreground/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{pct}% consumed</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock size={11} /> Last active: {fmt(item.lastActive)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── MODAL: Creatives Generated ── */}
      <Modal
        open={creativesModal} onClose={() => setCreativesModal(false)}
        title="Creatives Generated" subtitle="Per-user creative count — sorted by most generated"
        iconColor="#22c55e" Icon={ImageIcon}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : creativesData.length === 0 ? <EmptyState text="No creatives data found." /> : (
          <div className="divide-y divide-border/50">
            {creativesData.map((item, idx) => (
              <div key={String(item.userId) + idx} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                    {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                    {item.latest && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock size={11} /> Last created: {fmt(item.latest)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-extrabold text-green-400">{item.count}</p>
                    <p className="text-xs text-muted-foreground">creatives</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── MODAL: Active Users ── */}
      <Modal
        open={activeUsersModal} onClose={() => setActiveUsersModal(false)}
        title="Active Users" subtitle="Sorted by most recently active — plan, credits & verified status"
        iconColor="#3b82f6" Icon={Users}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : activeUsersData.length === 0 ? <EmptyState text="No user data found." /> : (
          <div className="divide-y divide-border/50">
            {activeUsersData.map((item) => (
              <div key={String(item._id)} className="px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{item.email}</p>
                      {item.isVerified
                        ? <span className="text-xs text-emerald-400">✓ Verified</span>
                        : <span className="text-xs text-amber-400">Unverified</span>
                      }
                    </div>
                    {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PlanBadge plan={item.plan} />
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/40 rounded-full border border-border">
                        {(item.credits ?? 0).toLocaleString()} credits
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    Joined: {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock size={11} /> Last active: {fmt(item.lastActive)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
}
