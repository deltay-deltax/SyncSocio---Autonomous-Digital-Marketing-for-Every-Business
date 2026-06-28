import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, Coins, IndianRupee, Tag, Ticket, ArrowUpRight } from 'lucide-react';

interface Transaction {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
  } | null;
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
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get('http://localhost:5050/api/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setMetrics(res.data.metrics);
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading platform overview...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Platform Overview</h2>
        <p className="text-muted-foreground mt-1">Real-time statistics, SaaS billing performance, and user activity metrics.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Customers */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Total / Active Users</h3>
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Users className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">{metrics?.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-emerald-500 font-medium">{metrics?.activeUsersToday || 0}</span> active today • <span className="text-blue-400 font-medium">{metrics?.newSignupsThisWeek || 0}</span> new this week</p>
          </div>
        </div>

        {/* Verified Users */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-green-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Creatives Generated</h3>
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <UserCheck className="text-green-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">{metrics?.assetsGeneratedMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-emerald-500 font-medium">{metrics?.assetsGeneratedToday || 0}</span> creatives generated today</p>
          </div>
        </div>

        {/* Total System Credits */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Credit Usage</h3>
            <div className="p-2.5 bg-violet-500/10 rounded-xl">
              <Coins className="text-violet-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">{(metrics?.totalCreditsConsumed || 0).toLocaleString()} <span className="text-lg text-muted-foreground font-medium">used</span></p>
            <p className="text-xs text-muted-foreground mt-1">{(metrics?.totalCredits || 0).toLocaleString()} total credits remaining in wallets</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">SaaS Revenue & MRR</h3>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <IndianRupee className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">₹{(metrics?.totalRevenue || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR: <span className="text-emerald-500 font-medium">₹{(metrics?.mrr || 0).toLocaleString()}</span></p>
          </div>
        </div>

        {/* API Cost Tracker */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">API Cost (Today)</h3>
            <div className="p-2.5 bg-rose-500/10 rounded-xl">
              <Tag className="text-rose-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">${(metrics?.apiCostToday || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.failedGenerations ? (
                <span className="text-red-500 font-bold animate-pulse">{metrics.failedGenerations} Failed Generations Alerts</span>
              ) : (
                <span className="text-emerald-500">All APIs Operational</span>
              )}
            </p>
          </div>
        </div>

        {/* Active Coupons */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Discounts Applied</h3>
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Ticket className="text-amber-500" size={20} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-foreground">₹{(metrics?.totalDiscounts || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics?.activeCoupons || 0} Active coupon codes</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="mt-10 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Recent SaaS Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">The latest subscription and credit purchases.</p>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            Realtime feed <ArrowUpRight size={14} className="text-emerald-500 animate-pulse" />
          </div>
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
                    <span className="capitalize px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">
                    ₹{t.amount}
                  </td>
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
                      <span className="text-amber-500">
                        -₹{t.discountAmount} ({t.discountPercentage}%)
                      </span>
                    ) : (
                      'None'
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(t.createdAt).toLocaleString()}
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
