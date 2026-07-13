import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Zap, TrendingUp, RefreshCw,
  CheckCircle, XCircle, Clock, X, DollarSign, BarChart2, ChevronRight,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;
const REFRESH_INTERVAL = 30_000;

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

type CardType = 'api-calls' | 'errors' | 'cost' | 'all-time' | null;

// Only providers actually used in production
const PROVIDER_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  FAL:    { bg: 'bg-violet-500/5',  border: 'border-violet-500/20',  label: 'FAL (Image Gen)' },
  OPENAI: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', label: 'OpenAI (GPT)' },
  OTHER:  { bg: 'bg-blue-500/5',    border: 'border-blue-500/20',    label: 'Gemini / Other' },
};

const PROVIDER_ICONS: Record<string, string> = {
  FAL:    '🎨',
  OPENAI: '⚡',
  OTHER:  '🔍',
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const d = new Date(typeof iso === 'string' ? iso.replace(/Z$/, '') : iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ card, health, onClose }: {
  card: CardType;
  health: HealthData | null;
  onClose: () => void;
}) {
  if (!card || !health) return null;

  const titles: Record<NonNullable<CardType>, string> = {
    'api-calls': "API Calls — Today's Breakdown",
    'errors':    'Errors Today — Full Log',
    'cost':      'Cost Breakdown',
    'all-time':  'All-Time Statistics',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 flex flex-col bg-background border-l border-border shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20 shrink-0">
          <h2 className="text-base font-bold text-foreground">{titles[card]}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── API Calls ── */}
          {card === 'api-calls' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {(['FAL', 'OPENAI', 'OTHER'] as const).map((p) => {
                  const stat = health.providerStats?.[p] ?? { calls: 0, errors: 0, cost: '0.00' };
                  const s = PROVIDER_STYLES[p];
                  return (
                    <div key={p} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{PROVIDER_ICONS[p]}</span>
                        <span className="text-xs font-bold text-foreground">{p}</span>
                      </div>
                      <p className="text-2xl font-extrabold text-foreground">{stat.calls}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">calls today</p>
                    </div>
                  );
                })}
              </div>
              <div className="glass-card border border-transparent rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Calls Today</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">{health.totalCallsToday}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium">All-Time Total</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{health.allTimeCalls?.toLocaleString()}</p>
                </div>
              </div>
              <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                parseFloat(health.errorRate) === 0 ? 'bg-emerald-500/5 border-emerald-500/20'
                  : parseFloat(health.errorRate) < 5 ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                {parseFloat(health.errorRate) === 0
                  ? <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                  : <AlertTriangle className="text-amber-500 shrink-0" size={20} />}
                <div>
                  <p className="text-sm font-semibold text-foreground">Error rate: <span className="font-black">{health.errorRate}%</span></p>
                  <p className="text-xs text-muted-foreground">{health.errorsToday} failed out of {health.totalCallsToday} calls today</p>
                </div>
              </div>
            </>
          )}

          {/* ── Errors ── */}
          {card === 'errors' && (
            health.errorsToday === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="text-emerald-500 mb-4" size={48} />
                <h3 className="text-lg font-bold text-foreground">Zero Errors Today</h3>
                <p className="text-sm text-muted-foreground mt-1">All API calls are running cleanly.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                    <XCircle className="text-red-500" size={16} />
                    <span className="text-sm font-bold text-red-400">{health.errorsToday} errors today</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{health.errorRate}% error rate</span>
                </div>
                <div className="rounded-2xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        {['Provider', 'Endpoint', 'User', 'Error', 'Time'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {health.recentErrors?.map((err) => {
                        const t = formatTime(err.createdAt);
                        return (
                          <tr key={err._id} className="hover:bg-red-500/5 transition-colors">
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                <XCircle size={12} className="text-red-500 shrink-0" />
                                <span className="font-mono text-xs font-semibold text-foreground">{err.provider}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">{err.endpoint}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{err.user?.email || 'Anon'}</td>
                            <td className="px-4 py-3 text-xs text-red-400 font-medium max-w-[160px] truncate">{err.errorMessage || 'Unknown'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs text-foreground">{t.date}</span>
                                <span className="text-[10px] text-muted-foreground">{t.time}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Showing last 10 errors across all time</p>
              </>
            )
          )}

          {/* ── Cost ── */}
          {card === 'cost' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card border border-transparent rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg"><Zap className="text-violet-500" size={16} /></div>
                    <p className="text-xs text-muted-foreground font-medium">Today's Cost</p>
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">${health.costToday?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Accumulated so far today</p>
                </div>
                <div className="glass-card border border-transparent rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><BarChart2 className="text-blue-500" size={16} /></div>
                    <p className="text-xs text-muted-foreground font-medium">This Week's Cost</p>
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">${health.weekCost?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Cost by Provider (Today)</h3>
                <div className="space-y-2">
                  {(['FAL', 'OPENAI', 'OTHER'] as const).map((p) => {
                    const stat = health.providerStats?.[p] ?? { calls: 0, errors: 0, cost: '0.00' };
                    const s = PROVIDER_STYLES[p];
                    const costNum = parseFloat(stat.cost);
                    const totalCost = health.costToday || 0.001;
                    const pct = Math.round((costNum / totalCost) * 100);
                    return (
                      <div key={p} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{PROVIDER_ICONS[p]}</span>
                            <span className="text-sm font-semibold text-foreground">{s.label}</span>
                          </div>
                          <span className="text-base font-extrabold text-foreground">${stat.cost}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, costNum > 0 ? 2 : 0)}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{stat.calls} calls · {pct}% of today's cost</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs text-muted-foreground">
                <DollarSign size={12} className="inline mr-1 text-primary" />
                Daily average this week: <strong className="text-foreground">${(health.weekCost / 7).toFixed(2)}</strong>
              </div>
            </>
          )}

          {/* ── All-Time ── */}
          {card === 'all-time' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total API Calls',   value: health.allTimeCalls?.toLocaleString(),  icon: Activity,      color: 'blue',    desc: 'All time across all providers' },
                  { label: 'Total Errors',       value: health.allTimeErrors?.toLocaleString(), icon: XCircle,       color: 'red',     desc: 'All-time failed API calls' },
                  { label: 'Overall Error Rate', value: health.allTimeCalls > 0 ? `${((health.allTimeErrors / health.allTimeCalls) * 100).toFixed(2)}%` : '0.00%', icon: AlertTriangle, color: 'amber', desc: 'Errors ÷ total calls' },
                  { label: 'Successful Calls',   value: (health.allTimeCalls - health.allTimeErrors)?.toLocaleString(), icon: CheckCircle, color: 'emerald', desc: 'Calls without errors' },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card border border-transparent rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 bg-${stat.color}-500/10 rounded-lg`}>
                        <stat.icon className={`text-${stat.color}-500`} size={16} />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    </div>
                    <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Today's Provider Snapshot</h3>
                <div className="space-y-2">
                  {(['FAL', 'OPENAI', 'OTHER'] as const).map((p) => {
                    const stat = health.providerStats?.[p] ?? { calls: 0, errors: 0, cost: '0.00' };
                    const s = PROVIDER_STYLES[p];
                    return (
                      <div key={p} className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{PROVIDER_ICONS[p]}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{s.label}</p>
                            <p className="text-xs text-muted-foreground">{stat.calls} calls · {stat.errors} errors</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">${stat.cost}</p>
                          <p className="text-[10px] text-muted-foreground">cost today</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/system/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setHealth(res.data.health);
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError('Server returned an error response.');
      }
    } catch (err: any) {
      console.error('Failed to fetch system health', err);
      setError(
        err?.response?.status === 401
          ? 'Admin session expired. Please log in again.'
          : 'Could not reach the backend. Check if the server is running.'
      );
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="text-red-500" size={40} />
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground">Failed to Load Health Data</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Retry
        </button>
      </div>
    );
  }

  const kpiCards: Array<{ id: NonNullable<CardType>; label: string; value: string | number; icon: typeof Activity; color: string; sub: string }> = [
    { id: 'api-calls', label: 'API Calls Today', value: health?.totalCallsToday ?? 0,                icon: Activity,      color: 'blue',    sub: `${health?.allTimeCalls?.toLocaleString() ?? 0} all-time` },
    { id: 'errors',    label: 'Errors Today',     value: health?.errorsToday ?? 0,                    icon: AlertTriangle, color: 'red',     sub: `${health?.errorRate}% error rate` },
    { id: 'cost',      label: 'Cost Today',        value: `$${(health?.costToday ?? 0).toFixed(2)}`,  icon: Zap,           color: 'violet',  sub: `$${(health?.weekCost ?? 0).toFixed(2)} this week` },
    { id: 'all-time',  label: 'Total All-Time',    value: health?.allTimeCalls?.toLocaleString() ?? 0, icon: TrendingUp,   color: 'emerald', sub: `${health?.allTimeErrors ?? 0} total errors` },
  ];

  return (
    <>
      <DetailPanel card={selectedCard} health={health} onClose={() => setSelectedCard(null)} />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              System Health Monitor
            </h2>
            <p className="text-muted-foreground mt-1">API performance, costs, and error tracking.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
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

        {/* Status Banner */}
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
          statusColor === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
          statusColor === 'amber'   ? 'bg-amber-500/5 border-amber-500/20' :
                                      'bg-red-500/5 border-red-500/20'
        }`}>
          {statusColor === 'emerald'
            ? <CheckCircle className="text-emerald-500 flex-shrink-0" size={24} />
            : <AlertTriangle className={`flex-shrink-0 ${statusColor === 'amber' ? 'text-amber-500' : 'text-red-500'}`} size={24} />}
          <div>
            <p className={`font-semibold ${statusColor === 'emerald' ? 'text-emerald-400' : statusColor === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
              {statusLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-refreshes every 30 seconds · Error rate today: <strong>{health?.errorRate}%</strong>
            </p>
          </div>
        </div>

        {/* KPI Cards — CLICKABLE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <button
              key={kpi.id}
              onClick={() => setSelectedCard(kpi.id)}
              className={`glass-card border border-transparent rounded-2xl p-5 text-left hover:border-${kpi.color}-500/30 hover:bg-muted/10 transition-all cursor-pointer group focus:outline-none`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <div className={`p-2 bg-${kpi.color}-500/10 rounded-lg group-hover:scale-110 transition-transform`}>
                  <kpi.icon className={`text-${kpi.color}-500`} size={16} />
                </div>
              </div>
              <p className={`text-3xl font-extrabold ${kpi.color === 'red' && (health?.errorsToday ?? 0) > 0 ? 'text-red-400' : 'text-foreground'}`}>
                {kpi.value}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                <ChevronRight size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>

        {/* Provider Breakdown — only actual providers */}
        <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-1">Provider Breakdown (Today)</h3>
          <p className="text-xs text-muted-foreground mb-5">Only providers actively used in production are shown.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['FAL', 'OPENAI', 'OTHER'] as const).map((provider) => {
              const stat = health?.providerStats?.[provider] ?? { calls: 0, errors: 0, cost: '0.00' };
              const s = PROVIDER_STYLES[provider];
              return (
                <div key={provider} className={`border ${s.border} ${s.bg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{PROVIDER_ICONS[provider]}</span>
                    <div>
                      <span className="font-bold text-foreground text-sm">{s.label}</span>
                      <p className="text-[10px] text-muted-foreground">Logged as: {provider}</p>
                    </div>
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
          <p className="text-[10px] text-muted-foreground mt-4">
            ℹ️ Gemini Flash (Google AI) calls are logged under <strong>OTHER</strong>. CLAUDE is not used in production.
          </p>
        </div>

        {/* Recent Errors Table */}
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
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                <tr className="divide-x divide-border/50">
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Provider</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Endpoint</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">User</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Error</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Time</th>
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
                {health?.recentErrors?.map((err) => {
                  const t = formatTime(err.createdAt);
                  return (
                    <tr key={err._id} className="hover:bg-red-500/5 transition-colors divide-x divide-border/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <XCircle size={14} className="text-red-500 flex-shrink-0" />
                          <span className="font-mono text-xs font-semibold text-foreground">{err.provider}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{err.endpoint}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{err.user?.email || 'Anonymous'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-red-400 font-medium line-clamp-1 max-w-xs">{err.errorMessage || 'Unknown error'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{t.date}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} /> {t.time}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

