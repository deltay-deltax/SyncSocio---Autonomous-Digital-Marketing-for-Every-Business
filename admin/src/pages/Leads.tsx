import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download, Users, ClipboardList } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';

interface LeadEntry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessCategory: string;
  intent: string;
  createdAt: string;
}

const INTENT_STYLES: Record<string, string> = {
  creatives: 'bg-violet-500/10 text-violet-400',
  demo: 'bg-emerald-500/10 text-emerald-400',
  default: 'bg-gray-500/10 text-gray-400',
};

export default function Leads() {
  const [entries, setEntries] = useState<LeadEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEntries(res.data.leads);
        setTotal(res.data.leads.length);
      }
    } catch {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Business Name', 'Category', 'Intent', 'Submitted Date'];
    const rows = entries.map(e => [
      e.name,
      e.email,
      e.phone,
      e.businessName,
      e.businessCategory,
      e.intent,
      new Date(e.createdAt).toLocaleDateString('en-IN')
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(c => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syncsocio_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const intentStats = entries.reduce<Record<string, number>>((acc, e) => {
    const r = e.intent?.toLowerCase() || 'other';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            Leads Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} leads collected from the website.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {Object.keys(intentStats).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(intentStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([intent, count]) => (
              <div key={intent} className="glass-card border border-transparent rounded-xl p-4">
                <p className="text-xs text-muted-foreground capitalize">{intent}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {total > 0 ? Math.round((count / total) * 100) : 0}% of leads
                </p>
              </div>
            ))}
        </div>
      )}

      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-muted-foreground" size={18} />
            <h3 className="text-lg font-bold text-foreground">Lead Entries</h3>
            <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
              {total}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr className="divide-x divide-border/50">
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Contact Info</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Business</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Category</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Intent</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Submitted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading leads...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">
                      No leads entries yet.
                    </p>
                  </td>
                </tr>
              ) : entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-muted/10 transition-colors divide-x divide-border/50">
                  <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{entry.name}</td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    <div>{entry.email}</div>
                    <div className="text-xs mt-1 text-muted-foreground">{entry.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{entry.businessName}</td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{entry.businessCategory}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`capitalize px-2.5 py-1 text-xs rounded-full font-medium ${
                      INTENT_STYLES[entry.intent?.toLowerCase()] || INTENT_STYLES.default
                    }`}>
                      {entry.intent || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
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
