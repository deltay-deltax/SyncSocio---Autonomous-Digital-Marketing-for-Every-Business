import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, UserCheck, Coins, IndianRupee, Tag, Ticket, ArrowUpRight,
  AlertTriangle, RefreshCw, X, Globe, Calendar, Search, ChevronLeft, ChevronRight,
  Zap, TrendingUp, CreditCard, ImageIcon, Clock, CheckCircle2,
  Activity, BarChart2, ChevronDown, ShoppingCart, PieChart, Database, Info,
  Bot, Package, MessageSquare
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

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
  visitorsYesterday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  visitorsLastMonth: number;
  visitorsTotal: number;
  visitorUniqueSessions?: number;
  visitorUniqueSessionsYesterday?: number;
  visitorsByDate?: Array<{ _id: string; count: number }>;
  whatsappConnectedBrands?: number;
  instagramConnectedBrands?: number;
  nexaActiveConversations?: number;
  nexaClosedDeals?: number;
  nexaRevenue?: number;
  totalDMFlows?: number;
  activeDMFlows?: number;
  totalProducts?: number;
  pendingTemplates?: number;
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
  open, onClose, title, subtitle, iconColor, Icon, children, footerLeft
}: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  iconColor: string; Icon: any; children: React.ReactNode;
  footerLeft?: React.ReactNode;
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
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${iconColor}18` }}>
              <Icon size={18} style={{ color: iconColor }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500 font-medium">
            {footerLeft}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-xl text-sm hover:bg-slate-800 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const getAvatarColor = (char: string) => {
  const colors = [
    'bg-rose-500/10 text-rose-500',
    'bg-blue-500/10 text-blue-500',
    'bg-emerald-500/10 text-emerald-500',
    'bg-amber-500/10 text-amber-500',
    'bg-violet-500/10 text-violet-500',
    'bg-cyan-500/10 text-cyan-500',
  ];
  const charCode = (char || '?').charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const fmtDateOnly = (d: string) => {
  if (!d) return '—';
  const dateStr = d.endsWith('Z') || d.includes('+') ? d : `${d}Z`;
  return new Date(dateStr).toLocaleDateString('en-GB', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric' 
  });
};

const fmtTimeOnly = (d: string) => {
  if (!d) return '—';
  const dateStr = d.endsWith('Z') || d.includes('+') ? d : `${d}Z`;
  let timeStr = new Date(dateStr).toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit' 
  }).toLowerCase();
  timeStr = timeStr.replace(/([ap]m)/, (match) => match.toLowerCase());
  return `${timeStr} IST`;
};

const fmt = (d: string) => {
  if (!d) return '—';
  const dateStr = d.endsWith('Z') || d.includes('+') ? d : `${d}Z`;
  return new Date(dateStr).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
    day: '2-digit', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const PlanBadge = ({ plan }: { plan: string }) => {
  const lower = (plan || '').toLowerCase();
  const cls = lower.includes('pro')
    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    : lower.includes('growth')
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : lower.includes('starter')
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-muted/60 text-muted-foreground border-border';
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${cls}`}>
      {plan || 'Trial'}
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

  const [trafficFilter, setTrafficFilter] = useState<'This Week' | 'Today' | 'Last 30 Days' | 'All'>('This Week');
  const [showTrafficDropdown, setShowTrafficDropdown] = useState(false);

  const [discountData, setDiscountData] = useState<any[]>([]);
  const [apiData, setApiData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueCurrentPage, setRevenueCurrentPage] = useState(1);
  const [revenueItemsPerPage, setRevenueItemsPerPage] = useState(10);
  const [showRevenueLimitDropdown, setShowRevenueLimitDropdown] = useState(false);
  const [expandedRevenueId, setExpandedRevenueId] = useState<string | null>(null);

  const [creditData, setCreditData] = useState<any[]>([]);
  const [creativesData, setCreativesData] = useState<any[]>([]);
  const [creativesCurrentPage, setCreativesCurrentPage] = useState(1);
  const [creativesItemsPerPage, setCreativesItemsPerPage] = useState(10);
  const [showCreativesLimitDropdown, setShowCreativesLimitDropdown] = useState(false);
  const [activeUsersData, setActiveUsersData] = useState<any[]>([]);
  const [activeUsersCurrentPage, setActiveUsersCurrentPage] = useState(1);
  const [activeUsersItemsPerPage, setActiveUsersItemsPerPage] = useState(10);
  const [showActiveUsersLimitDropdown, setShowActiveUsersLimitDropdown] = useState(false);
  const [activeUsersExpandedId, setActiveUsersExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [apiSearchTerm, setApiSearchTerm] = useState('');
  const [apiDateFilter, setApiDateFilter] = useState('all');
  const [apiCurrentPage, setApiCurrentPage] = useState(1);
  const [apiItemsPerPage, setApiItemsPerPage] = useState(10);

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
    {
      label: 'WhatsApp Connected',
      value: metrics?.whatsappConnectedBrands ?? 0,
      sub: 'brands with WhatsApp',
      icon: MessageSquare,
      color: '#25d366',
      sparkValue: metrics?.whatsappConnectedBrands ?? 0,
      borderHover: 'hover:border-green-500/30',
      onClick: () => navigate('/brands'),
    },
    {
      label: 'Instagram Connected',
      value: metrics?.instagramConnectedBrands ?? 0,
      sub: 'brands with Instagram',
      icon: ImageIcon,
      color: '#e1306c',
      sparkValue: metrics?.instagramConnectedBrands ?? 0,
      borderHover: 'hover:border-pink-500/30',
      onClick: () => navigate('/brands'),
    },
    {
      label: 'Nexa Active Deals',
      value: metrics?.nexaActiveConversations ?? 0,
      sub: 'in sales pipeline',
      icon: Bot,
      color: '#8b5cf6',
      sparkValue: metrics?.nexaActiveConversations ?? 0,
      borderHover: 'hover:border-violet-500/30',
      onClick: () => navigate('/nexa-conversations'),
    },
    {
      label: 'Nexa Revenue',
      value: `₹${(metrics?.nexaRevenue ?? 0).toLocaleString()}`,
      sub: `${metrics?.nexaClosedDeals ?? 0} closed deals`,
      icon: IndianRupee,
      color: '#10b981',
      sparkValue: metrics?.nexaRevenue ?? 0,
      borderHover: 'hover:border-emerald-500/30',
      onClick: () => navigate('/nexa-conversations'),
    },
    {
      label: 'DM Automations',
      value: `${metrics?.activeDMFlows ?? 0} / ${metrics?.totalDMFlows ?? 0}`,
      sub: 'active flows',
      icon: MessageSquare,
      color: '#3b82f6',
      sparkValue: metrics?.activeDMFlows ?? 0,
      borderHover: 'hover:border-blue-500/30',
      onClick: () => navigate('/dm-automations'),
    },
    {
      label: 'Products',
      value: metrics?.totalProducts ?? 0,
      sub: 'across all brands',
      icon: Package,
      color: '#f59e0b',
      sparkValue: metrics?.totalProducts ?? 0,
      borderHover: 'hover:border-amber-500/30',
      onClick: () => navigate('/products'),
    },
  ];

  const alerts = [
    metrics?.failedGenerations && metrics.failedGenerations > 0
      ? { label: `${metrics.failedGenerations} failed API generations`, color: 'red', icon: AlertTriangle }
      : null,
    (metrics?.activeCoupons ?? 0) === 0
      ? { label: 'No active coupons — create one to drive conversions', color: 'amber', icon: Ticket, link: null }
      : null,
    (metrics?.pendingTemplates ?? 0) > 0
      ? { label: `${metrics?.pendingTemplates} pending WhatsApp templates need review`, color: 'amber', icon: AlertTriangle, link: '/whatsapp-templates' }
      : null,
  ].filter(Boolean) as Array<{ label: string; color: string; icon: any, link?: string | null }>;


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
            <div key={i} onClick={() => alert.link ? navigate(alert.link) : null} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${alert.link ? 'cursor-pointer hover:opacity-80' : ''} ${
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
                      t.plan?.toLowerCase().includes('pro')
                        ? 'bg-violet-500/10 text-violet-400'
                        : t.plan?.toLowerCase().includes('growth')
                        ? 'bg-blue-500/10 text-blue-400'
                        : t.plan?.toLowerCase().includes('starter')
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-500/10 text-slate-400'
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
                    {new Date(t.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
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

      <Modal
        open={trafficModal} onClose={() => setTrafficModal(false)}
        title="Website Traffic Details" subtitle="Live visitor metrics & daily trends"
        iconColor="#3b82f6" Icon={Globe}
        footerLeft={
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300/80 flex items-center justify-center p-[2px]">
              <div className="w-full h-full bg-slate-400/80 rounded-full" />
            </div>
            All times shown in IST (Asia/Kolkata)
          </div>
        }
      >
        <div className="p-4 sm:p-6 bg-white space-y-8">
          {/* Top Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const calcGrowth = (curr: number, prev: number) => {
                if (prev === 0) return { val: curr > 0 ? '100.0' : '0.0', up: curr >= prev };
                const pct = ((curr - prev) / prev) * 100;
                return { val: Math.abs(pct).toFixed(1), up: pct >= 0 };
              };
              
              const gTotal = calcGrowth(metrics?.visitorsTotal ?? 0, Math.max(0, (metrics?.visitorsTotal ?? 0) - (metrics?.visitorsToday ?? 0)));
              const gUnique = calcGrowth(metrics?.visitorUniqueSessions ?? 0, Math.max(0, (metrics?.visitorUniqueSessions ?? 0) - (metrics?.visitorUniqueSessionsYesterday ?? 0)));
              const gToday = calcGrowth(metrics?.visitorsToday ?? 0, metrics?.visitorsYesterday ?? 0);
              const gMonth = calcGrowth(metrics?.visitorsMonth ?? 0, metrics?.visitorsLastMonth ?? 0);

              return [
                { label: 'Total Hits', value: metrics?.visitorsTotal ?? 0, icon: Activity, wrapperClass: 'bg-blue-50/20 border-blue-50', iconClass: 'bg-blue-100 text-blue-600', valClass: 'text-slate-900', chartColor: '#3b82f6', vsText: `${gTotal.val}% vs prev`, vsClass: gTotal.up ? 'text-blue-600' : 'text-red-500', vsArrow: gTotal.up ? '↑' : '↓' },
                { label: 'Unique Sessions', value: metrics?.visitorUniqueSessions ?? metrics?.visitorsTotal ?? 0, icon: Users, wrapperClass: 'bg-teal-50/20 border-teal-50', iconClass: 'bg-teal-100 text-teal-600', valClass: 'text-slate-900', chartColor: '#10b981', vsText: `${gUnique.val}% vs prev`, vsClass: gUnique.up ? 'text-teal-600' : 'text-red-500', vsArrow: gUnique.up ? '↑' : '↓' },
                { label: 'Today', value: metrics?.visitorsToday ?? 0, icon: Calendar, wrapperClass: 'bg-purple-50/20 border-purple-50', iconClass: 'bg-purple-100 text-purple-600', valClass: 'text-slate-900', chartColor: '#8b5cf6', vsText: `${gToday.val}% vs prev`, vsClass: gToday.up ? 'text-purple-600' : 'text-red-500', vsArrow: gToday.up ? '↑' : '↓' },
                { label: 'This Month', value: metrics?.visitorsMonth ?? 0, icon: BarChart2, wrapperClass: 'bg-orange-50/20 border-orange-50', iconClass: 'bg-orange-100 text-orange-600', valClass: 'text-slate-900', chartColor: '#f97316', vsText: `${gMonth.val}% vs prev`, vsClass: gMonth.up ? 'text-orange-600' : 'text-red-500', vsArrow: gMonth.up ? '↑' : '↓' },
              ].map(s => {
                const IconComp = s.icon;
                return (
                <div key={s.label} className={`border rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[140px] ${s.wrapperClass}`}>
                  <div className="relative z-10 pb-2">
                    <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700">
                      <div className={`p-1.5 rounded-lg ${s.iconClass}`}><IconComp size={14} /></div>
                      {s.label}
                    </div>
                    <div className={`text-3xl font-bold ${s.valClass} tracking-tight`}>{s.value}</div>
                    <div className={`text-[10px] font-bold ${s.vsClass} mt-1 flex items-center gap-0.5 whitespace-nowrap`}>
                      <span className="text-[11px]">{s.vsArrow}</span> {s.vsText}
                    </div>
                  </div>
                  {/* Decorative sparkline at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 opacity-80 translate-y-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics?.visitorsByDate && metrics.visitorsByDate.length > 0 ? [...metrics.visitorsByDate].reverse() : [{_id:'1',count:1}, {_id:'2',count:3}, {_id:'3',count:2}, {_id:'4',count:5}, {_id:'5',count:4}]}>
                        <defs>
                          <linearGradient id={`grad-${s.label.replace(' ', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.chartColor} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={s.chartColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke={s.chartColor} 
                          fillOpacity={1} 
                          fill={`url(#grad-${s.label.replace(' ', '')})`} 
                          strokeWidth={2} 
                          isAnimationActive={false}
                          dot={(props: any) => {
                            const { cx, cy, index } = props;
                            // Only draw dot on the last data point
                            const totalPoints = metrics?.visitorsByDate && metrics.visitorsByDate.length > 0 ? metrics.visitorsByDate.length : 5;
                            if (index === totalPoints - 1) {
                              return (
                                <circle key={`dot-${index}`} cx={cx} cy={cy} r={3.5} fill={s.chartColor} stroke="#fff" strokeWidth={1.5} />
                              );
                            }
                            return null;
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            });
          })()}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Calendar size={18} className="text-blue-500" />
                Traffic by Date
              </div>
              <div className="relative">
                <div 
                  onClick={() => setShowTrafficDropdown(!showTrafficDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Calendar size={13} className="text-slate-400" />
                  {trafficFilter}
                  <ChevronDown size={14} className="text-slate-400 ml-1" />
                </div>
                {showTrafficDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {['Today', 'This Week', 'Last 30 Days', 'All'].map(opt => (
                      <div 
                        key={opt}
                        onClick={() => { setTrafficFilter(opt as any); setShowTrafficDropdown(false); }}
                        className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${trafficFilter === opt ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden divide-y divide-slate-100 shadow-sm">
              {(() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const filtered = (metrics?.visitorsByDate || []).filter(day => {
                  if (trafficFilter === 'All') return true;
                  const dayDate = new Date(day._id);
                  if (isNaN(dayDate.getTime())) return true;
                  const diffDays = Math.ceil((now.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
                  if (trafficFilter === 'Today') return diffDays <= 0;
                  if (trafficFilter === 'This Week') return diffDays <= 7;
                  if (trafficFilter === 'Last 30 Days') return diffDays <= 30;
                  return true;
                }).reverse();

                if (filtered.length === 0) return <div className="p-8 text-center text-sm font-medium text-slate-500">No traffic data found for this period.</div>;
                
                const maxCount = Math.max(...(filtered.map(d => d.count) || [1]));
                return filtered.map((day) => {
                  const pct = Math.min(100, Math.max(4, (day.count / maxCount) * 100));
                  let formattedDate = day._id;
                  let dayName = '';
                  try {
                    const dateObj = new Date(day._id);
                    if (!isNaN(dateObj.getTime())) {
                      formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
                    }
                  } catch (e) {}

                  return (
                    <div key={day._id} className="p-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-32 shrink-0">
                        <p className="text-sm font-bold text-slate-900">{formattedDate}</p>
                        <p className="text-xs text-slate-500 font-medium">{dayName}</p>
                      </div>
                      <div className="flex-1 w-full sm:max-w-xl">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right sm:text-left min-w-[70px] flex items-center justify-end gap-3">
                        <span className="px-3 py-1.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-100/50 whitespace-nowrap">
                          {day.count} {day.count === 1 ? 'hit' : 'hits'}
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Discounts Applied ── */}
      <Modal
        open={discountModal} onClose={() => setDiscountModal(false)}
        title="Discounts Applied" subtitle="Coupon usage per brand — who, what plan, how much saved, when"
        iconColor="#f59e0b" Icon={Ticket}
        footerLeft={`Showing 1 to ${discountData.length} of ${discountData.length} results`}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : discountData.length === 0 ? <EmptyState text="No discount transactions found." /> : (
          <div className="p-4 sm:p-6 bg-slate-50 space-y-3">
            {discountData.map((item, idx) => {
              const initial = (item.email ? item.email.charAt(0) : 'U').toUpperCase();
              const colors = [
                'bg-emerald-50 text-emerald-600',
                'bg-slate-100 text-slate-600',
                'bg-blue-50 text-blue-600',
                'bg-purple-50 text-purple-600'
              ];
              const colorCls = colors[idx % colors.length];
              
              const dateObj = new Date(item.createdAt);
              const dDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const dTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase() + ' IST';
              
              return (
                <div key={item._id} className="bg-white border border-slate-100 rounded-xl p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Left side: Avatar and Info */}
                  <div className="flex items-start gap-4 sm:w-1/3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 ${colorCls}`}>
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.email}</p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{item.name || 'Unknown User'}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 capitalize">{item.plan || 'Starter'}</span>
                        {item.couponCode && item.couponCode !== '—' && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-amber-50 text-amber-600 border border-amber-100">{item.couponCode}</span>
                        )}
                        {(item.status || 'completed') === 'completed' ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Bought</span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 capitalize">{item.status}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle side: Date and Time */}
                  <div className="hidden sm:flex flex-col gap-2 shrink-0 pr-8 border-r border-slate-100 sm:w-1/3 items-center">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Calendar size={14} className="text-slate-400" />
                        {dDate}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        {dTime}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Date and Time (shown when small) */}
                  <div className="flex sm:hidden items-center gap-4 text-xs text-slate-500 font-medium mt-2">
                     <div className="flex items-center gap-1.5"><Calendar size={14} />{dDate}</div>
                     <div className="flex items-center gap-1.5"><Clock size={14} />{dTime}</div>
                  </div>

                  {/* Right side: Amount and Discount */}
                  <div className="flex flex-col items-end shrink-0 pt-3 sm:pt-0 border-t border-slate-100 sm:border-0 w-full sm:w-1/4">
                    <div className="flex items-center gap-2 text-right justify-end">
                      <span className="text-lg font-bold text-amber-500">-₹{item.discountAmount}</span>
                      <span className="text-xs font-bold text-slate-400">({item.discountPercentage}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-600">Paid ₹{item.amount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── MODAL: API Cost ── */}
      <Modal
        open={apiModal} onClose={() => setApiModal(false)}
        title="API Cost Breakdown" subtitle="Per-call spend by user, provider & endpoint"
        iconColor="#f43f5e" Icon={Zap}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border/50 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search by email or endpoint..." 
              value={apiSearchTerm} 
              onChange={e => { setApiSearchTerm(e.target.value); setApiCurrentPage(1); }} 
              className="w-full bg-muted/30 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-border transition-colors"
            />
          </div>
          <div className="relative shrink-0 w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <select 
              value={apiDateFilter} 
              onChange={e => { setApiDateFilter(e.target.value); setApiCurrentPage(1); }}
              className="w-full sm:w-40 bg-card border border-border/50 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:border-border transition-colors cursor-pointer appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">▼</div>
          </div>
        </div>
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Fetching data...</span>
          </div>
        ) : apiData.length === 0 ? <EmptyState text="No API cost logs found." /> : (
          <div className="flex flex-col h-full">
            {(() => {
              const filteredApiData = apiData.filter(item => {
                if (apiSearchTerm && !item.email.toLowerCase().includes(apiSearchTerm.toLowerCase()) && !item.endpoint.toLowerCase().includes(apiSearchTerm.toLowerCase())) {
                  return false;
                }
                if (apiDateFilter !== 'all') {
                  const date = new Date(item.createdAt);
                  const today = new Date();
                  if (apiDateFilter === 'today') {
                    if (date.toDateString() !== today.toDateString()) return false;
                  } else if (apiDateFilter === 'yesterday') {
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    if (date.toDateString() !== yesterday.toDateString()) return false;
                  } else if (apiDateFilter === 'this-week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(today.getDate() - 7);
                    if (date < weekAgo) return false;
                  } else if (apiDateFilter === 'this-month') {
                    if (date.getMonth() !== today.getMonth() || date.getFullYear() !== today.getFullYear()) return false;
                  }
                }
                return true;
              });

              if (filteredApiData.length === 0) return <div className="p-8 text-center text-muted-foreground text-sm">No matching API logs found.</div>;

              const totalPages = Math.ceil(filteredApiData.length / apiItemsPerPage);
              const paginatedData = filteredApiData.slice((apiCurrentPage - 1) * apiItemsPerPage, apiCurrentPage * apiItemsPerPage);

              return (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-[73px] z-10 border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4 font-semibold">User / Endpoint</th>
                        <th className="px-6 py-4 font-semibold">Date &amp; Time</th>
                        <th className="px-6 py-4 font-semibold text-right">Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {paginatedData.map((item) => (
                        <tr key={item._id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${getAvatarColor(item.email ? item.email[0].toUpperCase() : '?')}`}>
                                {item.email ? item.email[0].toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{item.email}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.endpoint}</p>
                                <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-full font-bold tracking-wide uppercase ${
                                  item.provider === 'FAL' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : item.provider === 'CLAUDE' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                  : item.provider === 'OPENAI' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-muted/40 text-muted-foreground border-border'
                                }`}>{item.provider}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top pt-5">
                            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-medium">
                              <div className="flex items-center gap-2"><Calendar size={13} /> {fmtDateOnly(item.createdAt)}</div>
                              <div className="flex items-center gap-2"><Clock size={13} /> {fmtTimeOnly(item.createdAt)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top pt-5 text-right">
                            <p className="text-sm font-bold text-rose-500">${(item.costInCents / 100).toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{item.costInCents}¢</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-6 py-4 border-t border-border/50 bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      Showing {(apiCurrentPage - 1) * apiItemsPerPage + 1} to {Math.min(apiCurrentPage * apiItemsPerPage, filteredApiData.length)} of {filteredApiData.length} results
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setApiCurrentPage(p => Math.max(1, p - 1))}
                        disabled={apiCurrentPage === 1}
                        className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
                      ><ChevronLeft size={16} /></button>
                      <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-sm border border-blue-500/20">
                        {apiCurrentPage}
                      </div>
                      <button 
                        onClick={() => setApiCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={apiCurrentPage === totalPages}
                        className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
                      ><ChevronRight size={16} /></button>
                    </div>
                    <div className="relative shrink-0">
                      <select 
                        value={apiItemsPerPage}
                        onChange={e => { setApiItemsPerPage(Number(e.target.value)); setApiCurrentPage(1); }}
                        className="appearance-none bg-card border border-border/50 rounded-lg pl-3 pr-8 py-1.5 text-xs text-muted-foreground font-medium focus:outline-none focus:border-border transition-colors cursor-pointer"
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">▼</div>
                    </div>
                  </div>
                </>
              );
            })()}
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
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm font-medium">Fetching data...</span>
          </div>
        ) : revenueData.length === 0 ? <EmptyState text="No revenue transactions found." /> : (
          <div className="p-4 sm:p-6 bg-slate-50/30">
            <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="divide-y divide-slate-100 flex-1">
                {(() => {
                  const startIdx = (revenueCurrentPage - 1) * revenueItemsPerPage;
                  const endIdx = startIdx + revenueItemsPerPage;
                  const paginatedData = revenueData.slice(startIdx, endIdx);
                  
                  return paginatedData.map((item) => (
                    <div 
                      key={item._id} 
                      className="p-4 sm:px-6 sm:py-5 flex flex-col gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRevenueId(expandedRevenueId === item._id ? null : item._id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-50 text-emerald-600 shrink-0">
                            {item.email.substring(0, 2).toUpperCase()}
                          </div>
                          
                          {/* Name/Email and Badges */}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.email}</p>
                            <p className="text-xs text-slate-500 font-medium truncate mb-2">
                              {item.name || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <PlanBadge plan={item.plan} />
                              {item.type && (
                                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-100/50 capitalize">
                                  {item.type.replace(/_/g, ' ')}
                                </span>
                              )}
                              {item.couponCode && (
                                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-50 text-amber-500 border border-amber-100/50">
                                  {item.couponCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Date / Time */}
                        <div className="flex items-start gap-2 sm:w-40 shrink-0">
                          <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-semibold text-slate-500">
                              {fmtDateOnly(item.createdAt)}
                            </p>
                            <p className="text-[12px] font-semibold text-slate-500 mt-0.5">
                              {fmtTimeOnly(item.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Amount & Chevron */}
                        <div className="flex items-center gap-4 shrink-0 justify-end sm:min-w-[90px]">
                          <div className="text-right">
                            <p className="text-[15px] font-bold text-emerald-500">₹{item.amount}</p>
                            {item.discountAmount > 0 && <p className="text-[11px] font-bold text-amber-500 mt-0.5">-₹{item.discountAmount} off</p>}
                          </div>
                          <ChevronRight 
                            size={16} 
                            className={`text-slate-400 transition-transform duration-200 ${expandedRevenueId === item._id ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedRevenueId === item._id && (
                        <div className="pt-4 pb-2 px-1 border-t border-slate-100 mt-2 animate-in fade-in slide-in-from-top-2">
                          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                            <div className="min-w-[120px]">
                              <span className="text-slate-400 font-medium block mb-1">Transaction ID</span>
                              <p className="text-slate-700 font-mono font-medium truncate max-w-[160px]" title={item._id}>{item._id}</p>
                            </div>
                            <div className="min-w-[100px]">
                              <span className="text-slate-400 font-medium block mb-1">Status</span>
                              <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-700 rounded-md font-semibold capitalize border border-emerald-200/50">{item.status || 'Success'}</span>
                            </div>
                            <div className="min-w-[120px]">
                              <span className="text-slate-400 font-medium block mb-1">Discount Details</span>
                              <p className="text-slate-700 font-semibold">{item.discountPercentage ? `${item.discountPercentage}% OFF` : 'No Discount'}</p>
                            </div>
                            <div className="min-w-[120px]">
                              <span className="text-slate-400 font-medium block mb-1">User ID</span>
                              <p className="text-slate-700 font-mono font-medium truncate max-w-[160px]" title={item.user?._id || 'N/A'}>{item.user?._id || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
              
              {/* Pagination Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Calendar size={14} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {revenueData.length === 0 ? 0 : (revenueCurrentPage - 1) * revenueItemsPerPage + 1} to {Math.min(revenueCurrentPage * revenueItemsPerPage, revenueData.length)} of {revenueData.length} transactions
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Pagination Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRevenueCurrentPage(p => Math.max(1, p - 1))}
                      disabled={revenueCurrentPage === 1}
                      className="p-1 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-slate-600 min-w-[3rem] text-center">
                      {revenueCurrentPage} / {Math.max(1, Math.ceil(revenueData.length / revenueItemsPerPage))}
                    </span>
                    <button
                      onClick={() => setRevenueCurrentPage(p => Math.min(Math.ceil(revenueData.length / revenueItemsPerPage), p + 1))}
                      disabled={revenueCurrentPage >= Math.ceil(revenueData.length / revenueItemsPerPage) || revenueData.length === 0}
                      className="p-1 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Limit Dropdown */}
                  <div className="relative">
                    <div 
                      onClick={() => setShowRevenueLimitDropdown(!showRevenueLimitDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      {revenueItemsPerPage} per page
                      <ChevronDown size={14} className="text-slate-400 ml-1" />
                    </div>
                    {showRevenueLimitDropdown && (
                      <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                        {[10, 25, 50, 100].map(opt => (
                          <div 
                            key={opt}
                            onClick={() => { 
                              setRevenueItemsPerPage(opt); 
                              setRevenueCurrentPage(1);
                              setShowRevenueLimitDropdown(false); 
                            }}
                            className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${revenueItemsPerPage === opt ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {opt} per page
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm font-medium">Fetching data...</span>
          </div>
        ) : creditData.length === 0 ? <EmptyState text="No credit usage data found." /> : (
          <div className="p-4 sm:p-6 bg-slate-50/50 flex flex-col gap-4">
            {creditData.map((item) => {
              const pct = item.totalPurchased > 0
                ? Math.min(100, Math.round((item.totalConsumed / item.totalPurchased) * 100)) : 0;
              
              let theme = {
                color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', 
                border: 'border-orange-200', gradient: 'from-orange-400 to-orange-500', 
                fill: 'bg-orange-500', iconBg: 'bg-orange-50 text-orange-500'
              };
              if (pct >= 80) {
                theme = {
                  color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600', 
                  border: 'border-purple-200', gradient: 'from-purple-500 to-fuchsia-500', 
                  fill: 'bg-purple-500', iconBg: 'bg-purple-50 text-purple-500'
                };
              } else if (pct >= 30) {
                theme = {
                  color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', 
                  border: 'border-emerald-200', gradient: 'from-emerald-400 to-emerald-500', 
                  fill: 'bg-emerald-500', iconBg: 'bg-emerald-50 text-emerald-500'
                };
              }

              return (
                <div key={String(item._id)} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${theme.bg} ${theme.text}`}>
                        {item.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.email}</p>
                        <p className="text-[13px] text-slate-500 font-medium truncate mb-1">{item.name || 'Unknown User'}</p>
                        <PlanBadge plan={item.plan} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-slate-500 mb-0.5">Consumed</p>
                      <p className={`text-[17px] font-bold ${theme.text}`}>{item.totalConsumed.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Middle Grid */}
                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-3">
                    <div className="flex items-center justify-center gap-2 px-2">
                      <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.text}`}><ShoppingCart size={14} /></div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Purchased</p>
                        <p className="text-xs font-bold text-slate-700">{item.totalPurchased.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 px-2">
                      <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.text}`}><Clock size={14} /></div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Remaining</p>
                        <p className="text-xs font-bold text-slate-700">{item.creditsRemaining.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 px-2">
                      <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.text}`}><PieChart size={14} /></div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Usage</p>
                        <p className={`text-xs font-bold ${theme.text}`}>{pct}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Footer */}
                  <div className="space-y-3">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`bg-gradient-to-r ${theme.gradient} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme.bg} border ${theme.border}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${theme.fill}`} />
                        <span className={`text-[10px] font-bold ${theme.text}`}>{pct}% consumed</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} /> Last active: {fmt(item.lastActive)}
                      </p>
                    </div>
                  </div>
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
        iconColor="#10b981" Icon={ImageIcon}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm font-medium">Fetching data...</span>
          </div>
        ) : creativesData.length === 0 ? <EmptyState text="No creatives data found." /> : (
          <div className="bg-white border border-slate-100 rounded-2xl flex flex-col mt-4">
            <div className="divide-y divide-slate-100 flex-1">
              {(() => {
                const startIdx = (creativesCurrentPage - 1) * creativesItemsPerPage;
                const endIdx = startIdx + creativesItemsPerPage;
                const paginatedData = creativesData.slice(startIdx, endIdx);

                return paginatedData.map((item, idx) => {
                  const colors = [
                    { bg: 'bg-emerald-50', text: 'text-emerald-600' },
                    { bg: 'bg-indigo-50', text: 'text-indigo-600' },
                    { bg: 'bg-blue-50', text: 'text-blue-600' },
                    { bg: 'bg-orange-50', text: 'text-orange-600' },
                    { bg: 'bg-teal-50', text: 'text-teal-600' },
                    { bg: 'bg-pink-50', text: 'text-pink-600' }
                  ];
                  const colorIdx = item.email ? item.email.charCodeAt(0) % colors.length : idx % colors.length;
                  const theme = colors[colorIdx];

                  return (
                    <div key={String(item.userId) + idx} className="px-4 py-4 sm:px-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${theme.bg} ${theme.text}`}>
                          {item.email ? item.email.substring(0, 2).toUpperCase() : '??'}
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-slate-900 truncate mb-0.5">{item.email}</p>
                          {item.name && <p className="text-[12px] text-slate-500 truncate mb-1">{item.name}</p>}
                          {item.latest && (
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                              <Clock size={12} /> Last created: {fmtDateOnly(item.latest)}, {fmtTimeOnly(item.latest)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0 flex flex-col items-end justify-center">
                        <p className="text-2xl font-extrabold text-emerald-500 leading-none">{item.count}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">creatives</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-50/30 border-t border-slate-100 rounded-b-2xl">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                  <BarChart2 size={14} />
                </div>
                <span className="text-[12px] font-medium text-slate-500">
                  Showing {creativesData.length === 0 ? 0 : (creativesCurrentPage - 1) * creativesItemsPerPage + 1} to {Math.min(creativesCurrentPage * creativesItemsPerPage, creativesData.length)} of {creativesData.length} users
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-slate-500 hidden sm:block">Rows per page</span>
                  <div className="relative">
                    <div 
                      onClick={() => setShowCreativesLimitDropdown(!showCreativesLimitDropdown)}
                      className="flex items-center gap-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 bg-white shadow-sm"
                    >
                      {creativesItemsPerPage}
                      <ChevronDown size={14} className="text-slate-400" />
                    </div>
                    {showCreativesLimitDropdown && (
                      <div className="absolute right-0 bottom-full mb-1 w-24 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                        {[10, 25, 50, 100].map(opt => (
                          <div 
                            key={opt}
                            onClick={() => { 
                              setCreativesItemsPerPage(opt); 
                              setCreativesCurrentPage(1);
                              setShowCreativesLimitDropdown(false); 
                            }}
                            className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${creativesItemsPerPage === opt ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCreativesCurrentPage(p => Math.max(1, p - 1))}
                    disabled={creativesCurrentPage === 1}
                    className="p-1.5 bg-slate-50 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCreativesCurrentPage(p => Math.min(Math.ceil(creativesData.length / creativesItemsPerPage), p + 1))}
                    disabled={creativesCurrentPage >= Math.ceil(creativesData.length / creativesItemsPerPage) || creativesData.length === 0}
                    className="p-1.5 bg-slate-50 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: Active Users ── */}
      <Modal
        open={activeUsersModal} onClose={() => setActiveUsersModal(false)}
        title="Active Users" subtitle="Sorted by most recently active — plan, credits & verified status"
        iconColor="#3b82f6" Icon={Users}
        footerLeft={
          <div className="flex items-center gap-2 text-slate-400">
            <Info size={14} />
            <span className="text-xs font-medium">All times shown in IST (Asia/Kolkata)</span>
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm font-medium">Fetching data...</span>
          </div>
        ) : activeUsersData.length === 0 ? <EmptyState text="No user data found." /> : (
          <div className="p-4 sm:p-6 bg-slate-50/30 flex flex-col gap-3">
            {(() => {
              const startIdx = (activeUsersCurrentPage - 1) * activeUsersItemsPerPage;
              const endIdx = startIdx + activeUsersItemsPerPage;
              const paginatedData = activeUsersData.slice(startIdx, endIdx);

              return paginatedData.map((item) => {
                const isPro = item.plan?.toLowerCase() === 'pro';
                const theme = isPro ? {
                  bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', iconBg: 'bg-indigo-100/50'
                } : {
                  bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100/50'
                };

                return (
                  <div 
                    key={String(item._id)} 
                    className={`bg-white border ${activeUsersExpandedId === item._id ? 'border-slate-300 shadow-md' : 'border-slate-100 shadow-sm'} rounded-2xl p-4 sm:px-5 flex flex-col gap-2 cursor-pointer hover:border-slate-300 transition-all`}
                    onClick={() => setActiveUsersExpandedId(activeUsersExpandedId === item._id ? null : item._id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${theme.bg} ${theme.text}`}>
                          {item.email.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.email}</p>
                            {item.isVerified
                              ? <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5"><CheckCircle2 size={12} /> Verified</span>
                              : <span className="text-[10px] font-bold text-amber-500">Unverified</span>
                            }
                          </div>
                          <p className="text-[12px] text-slate-500 font-medium truncate mb-2">{item.name || 'Unknown User'}</p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <PlanBadge plan={item.plan} />
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full ${theme.bg} ${theme.text} border ${theme.border}`}>
                              <Database size={12} /> {(item.credits ?? 0).toLocaleString()} credits
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 sm:border-l sm:border-slate-100 sm:pl-6 sm:ml-2">
                        <div className="flex items-start gap-2.5 w-32">
                          <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.text} mt-0.5`}><Clock size={14} /></div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Last active</p>
                            <p className="text-[12px] font-bold text-slate-700 mt-0.5">{fmtDateOnly(item.lastActive)}</p>
                            <p className="text-[10px] font-medium text-slate-500">{fmtTimeOnly(item.lastActive)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2.5 w-28">
                          <div className={`p-1.5 rounded-lg ${theme.iconBg} ${theme.text} mt-0.5`}><Calendar size={14} /></div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Joined</p>
                            <p className="text-[12px] font-bold text-slate-700 mt-0.5">{fmtDateOnly(item.createdAt)}</p>
                          </div>
                        </div>
                        
                        <ChevronRight 
                          size={16} 
                          className={`text-slate-400 hidden sm:block transition-transform duration-200 ${activeUsersExpandedId === item._id ? 'rotate-90' : ''}`} 
                        />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {activeUsersExpandedId === item._id && (
                      <div className="pt-4 pb-2 px-1 border-t border-slate-100 mt-2 flex flex-wrap gap-6 bg-slate-50 rounded-xl p-4">
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">User ID</span>
                          <p className="text-xs font-medium text-slate-700 truncate max-w-[150px]" title={item._id}>{item._id}</p>
                        </div>
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Credits</span>
                          <p className="text-xs font-medium text-slate-700">{(item.credits ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account Status</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 w-fit">
                            Active
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Pagination Controls */}
            <div className="flex items-center justify-end gap-6 pt-2 pb-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">Rows per page</span>
                <div className="relative">
                  <div 
                    onClick={() => setShowActiveUsersLimitDropdown(!showActiveUsersLimitDropdown)}
                    className="flex items-center gap-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 bg-white shadow-sm"
                  >
                    {activeUsersItemsPerPage}
                    <ChevronDown size={14} className="text-slate-400" />
                  </div>
                  {showActiveUsersLimitDropdown && (
                    <div className="absolute right-0 bottom-full mb-1 w-24 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                      {[10, 25, 50, 100].map(opt => (
                        <div 
                          key={opt}
                          onClick={() => { 
                            setActiveUsersItemsPerPage(opt); 
                            setActiveUsersCurrentPage(1);
                            setShowActiveUsersLimitDropdown(false); 
                          }}
                          className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${activeUsersItemsPerPage === opt ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-600">
                  {activeUsersData.length === 0 ? 0 : (activeUsersCurrentPage - 1) * activeUsersItemsPerPage + 1}-{Math.min(activeUsersCurrentPage * activeUsersItemsPerPage, activeUsersData.length)} of {activeUsersData.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveUsersCurrentPage(p => Math.max(1, p - 1))}
                    disabled={activeUsersCurrentPage === 1}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActiveUsersCurrentPage(p => Math.min(Math.ceil(activeUsersData.length / activeUsersItemsPerPage), p + 1))}
                    disabled={activeUsersCurrentPage >= Math.ceil(activeUsersData.length / activeUsersItemsPerPage) || activeUsersData.length === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
}
