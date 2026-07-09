import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, IndianRupee, Crown } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyRevenue {
  _id: { year: number; month: number };
  revenue: number;
  transactions: number;
  discounts: number;
}

interface MonthlySignups {
  _id: { year: number; month: number };
  count: number;
}

interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

interface TopSpender {
  _id: string;
  totalSpent: number;
  transactions: number;
  user?: { email: string; name?: string; plan?: string };
}

interface AnalyticsData {
  revenueByMonth: MonthlyRevenue[];
  signupsByMonth: MonthlySignups[];
  planDistribution: PlanDistribution[];
  topSpenders: TopSpender[];
}

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card border border-transparent rounded-xl p-3 shadow-xl text-sm">
        <p className="text-muted-foreground font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-semibold">
            {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('₹') ? `₹${entry.value?.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card border border-transparent rounded-xl p-3 shadow-xl text-sm">
        <p className="font-semibold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} users</p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/analytics/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setData(res.data.data);
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Normalize to 6 months for charts
  const buildMonthlyArray = <T extends Record<string, any>>(raw: T[], valueKey: string) => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const match = raw.find(
        (r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
      );
      return {
        month: MONTHS[d.getMonth()],
        [valueKey]: match ? (match as any)[valueKey] : 0,
        ...(valueKey === 'revenue' && match ? { discounts: (match as any).discounts || 0, transactions: (match as any).transactions || 0 } : {})
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const revenueChartData = buildMonthlyArray(data?.revenueByMonth || [], 'revenue');
  const signupsChartData = buildMonthlyArray(data?.signupsByMonth || [], 'count');
  const totalRevenue = revenueChartData.reduce((a, d) => a + ((d as any).revenue as number || 0), 0);
  const totalSignups = signupsChartData.reduce((a, d) => a + ((d as any).count as number || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Revenue & Growth Analytics
        </h2>
        <p className="text-muted-foreground mt-1">6-month trends, plan distribution, and top customers.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '6-Month Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'emerald', sub: 'Completed transactions', path: '/transactions', state: { statusFilter: 'completed' } },
          { label: 'New Signups', value: totalSignups, icon: Users, color: 'blue', sub: 'Last 6 months', path: '/users', state: {} },
          { label: 'Starter Plan Users', value: data?.planDistribution?.find(p => p.name.includes('Starter'))?.value ?? 0, icon: TrendingUp, color: 'violet', sub: '₹999/month', path: '/users', state: { planFilter: 'starter' } },
          { label: 'Elite Plan Users', value: data?.planDistribution?.find(p => p.name.includes('Elite'))?.value ?? 0, icon: Crown, color: 'amber', sub: '₹3199/month', path: '/users', state: { planFilter: 'elite' } },
        ].map((kpi) => (
          <div 
            key={kpi.label} 
            onClick={() => navigate(kpi.path, { state: kpi.state })}
            className={`glass-card border border-transparent rounded-2xl p-5 hover:border-${kpi.color}-500/30 transition-all cursor-pointer hover:bg-muted/10`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <div className={`p-2 bg-${kpi.color}-500/10 rounded-lg`}>
                <kpi.icon className={`text-${kpi.color}-500`} size={16} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Area Chart */}
      <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-foreground">Monthly Revenue</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gross revenue from subscriptions over the last 6 months</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue (₹)"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6, fill: '#6366f1' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Signups Bar + Plan Pie side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups Bar */}
        <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-foreground">New Signups per Month</h3>
            <p className="text-xs text-muted-foreground mt-0.5">User registrations over the last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={signupsChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Signups" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution Donut */}
        <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-foreground">Plan Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Breakdown of users by subscription plan</p>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={data?.planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data?.planDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {data?.planDistribution?.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.value} users</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Spenders Table */}
      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Top 10 Customers by Spend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Users who have generated the most revenue</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">#</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Transactions</th>
                <th className="px-6 py-4 font-semibold">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.topSpenders?.map((spender, i) => (
                <tr key={spender._id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono">#{i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{spender.user?.email || 'Unknown'}</div>
                    {spender.user?.name && <div className="text-xs text-muted-foreground">{spender.user.name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`capitalize px-2 py-0.5 text-xs rounded-full font-medium ${
                      spender.user?.plan?.toLowerCase().includes('elite') 
                        ? 'bg-violet-500/10 text-violet-400' 
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {spender.user?.plan || 'No Plan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{spender.transactions}</td>
                  <td className="px-6 py-4 font-bold text-emerald-400">₹{spender.totalSpent?.toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.topSpenders || data.topSpenders.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No transaction data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
