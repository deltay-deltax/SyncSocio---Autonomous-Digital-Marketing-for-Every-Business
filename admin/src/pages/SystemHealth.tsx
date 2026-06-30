import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, Zap, TrendingUp, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';
const REFRESH_INTERVAL = 30_000; // 30s

interface ProviderStat {
  calls: number;
  errors: number;
  cost: string;
}

interface HealthData {
  totalCallsToday: number;
  errorsToday: number;
  errorRate: string;
  costToday: number;
  weekCost: number;
  allTimeCalls: number;
  allTimeErrors: number;
  providerStats: Record<string, ProviderStat>;
  recentErrors: Array<{
    _id: string;
    provider: string;
    endpoint: string;
    errorMessage: string;
    createdAt: string;
    user?: { email: string };
  }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  FAL: 'violet',
  OPENAI: 'emerald',
  GOOGLE: 'blue',
};

const PROVIDER_ICONS: Record<string, string> = {
  FAL: '🎨',
  OPENAI: '⚡',
  GOOGLE: '🔍',
};

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/system/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHealth(res.data.health);
        setLastRefresh(new Date());
      }
    } catch {
      console.error('Failed to fetch system health');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    intervalRef.current = setInterval(() => fetchHealth(), REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth]);

  const errorRate = parseFloat(health?.errorRate || '0');
  const statusColor = errorRate === 0 ? 'emerald' : errorRate < 5 ? 'amber' : 'red';
  const statusLabel = errorRate === 0 ? 'All Systems Operational' : errorRate < 5 ? 'Minor Issues' : 'Degraded Performance';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse text-lg">Loading system health...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            System Health Monitor
          </h2>
          <p className="text-muted-foreground mt-1">API performance, costs, and error tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 glass-card border border-transparent rounded-xl text-sm hover:bg-muted/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
        statusColor === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
        statusColor === 'amber' ? 'bg-amber-500/5 border-amber-500/20' :
        'bg-red-500/5 border-red-500/20'
      }`}>
        {statusColor === 'emerald' ? (
          <CheckCircle className="text-emerald-500 flex-shrink-0" size={24} />
        ) : (
          <AlertTriangle className={`flex-shrink-0 ${statusColor === 'amber' ? 'text-amber-500' : 'text-red-500'}`} size={24} />
        )}
        <div>
          <p className={`font-semibold ${
            statusColor === 'emerald' ? 'text-emerald-400' :
            statusColor === 'amber' ? 'text-amber-400' : 'text-red-400'
          }`}>{statusLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-refreshes every 30 seconds · Error rate today: <strong>{health?.errorRate}%</strong>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'API Calls Today', value: health?.totalCallsToday ?? 0, icon: Activity, color: 'blue', sub: `${health?.allTimeCalls ?? 0} all-time` },
          { label: 'Errors Today', value: health?.errorsToday ?? 0, icon: AlertTriangle, color: 'red', sub: `${health?.errorRate}% error rate` },
          { label: 'Cost Today', value: `$${(health?.costToday ?? 0).toFixed(2)}`, icon: Zap, color: 'violet', sub: `$${(health?.weekCost ?? 0).toFixed(2)} this week` },
          { label: 'Total All-Time', value: health?.allTimeCalls?.toLocaleString() ?? 0, icon: TrendingUp, color: 'emerald', sub: `${health?.allTimeErrors ?? 0} total errors` },
        ].map((kpi) => (
          <div key={kpi.label} className={`glass-card border border-transparent rounded-2xl p-5 hover:border-${kpi.color}-500/30 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <div className={`p-2 bg-${kpi.color}-500/10 rounded-lg`}>
                <kpi.icon className={`text-${kpi.color}-500`} size={16} />
              </div>
            </div>
            <p className={`text-3xl font-extrabold ${kpi.color === 'red' && (health?.errorsToday ?? 0) > 0 ? 'text-red-400' : 'text-foreground'}`}>
              {kpi.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Provider Breakdown */}
      <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-5">Provider Breakdown (Today)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {['FAL', 'CLAUDE', 'OPENAI', 'OTHER'].map((provider) => {
            const stat = health?.providerStats?.[provider] ?? { calls: 0, errors: 0, cost: '0.00' };
            const color = PROVIDER_COLORS[provider];
            return (
              <div key={provider} className={`border border-${color}-500/20 bg-${color}-500/5 rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{PROVIDER_ICONS[provider]}</span>
                  <span className="font-bold text-foreground">{provider}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calls</span>
                    <span className="font-semibold text-foreground">{stat.calls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Errors</span>
                    <span className={`font-semibold ${stat.errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{stat.errors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-semibold text-foreground">${stat.cost}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Recent API Errors</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 10 failed API calls</p>
          </div>
          {health?.errorsToday === 0 && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
              <CheckCircle size={16} /> No errors today
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Provider</th>
                <th className="px-6 py-4 font-semibold">Endpoint</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Error</th>
                <th className="px-6 py-4 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {health?.recentErrors?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <CheckCircle className="mx-auto mb-2 text-emerald-500" size={28} />
                    <p className="text-muted-foreground">No recent errors — all clean!</p>
                  </td>
                </tr>
              )}
              {health?.recentErrors?.map((err) => (
                <tr key={err._id} className="hover:bg-red-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2">
                      <XCircle size={14} className="text-red-500 flex-shrink-0" />
                      <span className="font-mono text-xs font-semibold text-foreground">{err.provider}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{err.endpoint}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{err.user?.email || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-red-400 font-medium line-clamp-1 max-w-xs">
                      {err.errorMessage || 'Unknown error'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(err.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
