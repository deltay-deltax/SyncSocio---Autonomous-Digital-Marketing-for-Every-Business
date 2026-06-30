import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Trash2, Download, Users, ClipboardList } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';

interface WaitlistEntry {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_STYLES: Record<string, string> = {
  founder: 'bg-violet-500/10 text-violet-400',
  marketer: 'bg-blue-500/10 text-blue-400',
  agency: 'bg-amber-500/10 text-amber-400',
  freelancer: 'bg-emerald-500/10 text-emerald-400',
  default: 'bg-gray-500/10 text-gray-400',
};

export default function Waitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const res = await axios.get(`${API}/waitlist${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEntries(res.data.entries);
        setTotal(res.data.total);
      }
    } catch {
      console.error('Failed to fetch waitlist');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from the waitlist?`)) return;
    setDeleting(id);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API}/waitlist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEntries();
    } catch {
      alert('Failed to remove entry.');
    } finally {
      setDeleting(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Joined Date'];
    const rows = entries.map(e => [
      e.name,
      e.email,
      e.role,
      new Date(e.createdAt).toLocaleDateString('en-IN')
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(c => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syncsocio_waitlist_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Role distribution stats
  const roleStats = entries.reduce<Record<string, number>>((acc, e) => {
    const r = e.role?.toLowerCase() || 'other';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Waitlist Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} people waiting to join Sync Socio.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Role Stats */}
      {Object.keys(roleStats).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(roleStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([role, count]) => (
              <div key={role} className="glass-card border border-transparent rounded-xl p-4">
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {total > 0 ? Math.round((count / total) * 100) : 0}% of waitlist
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3 glass-card border border-transparent p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-muted-foreground" size={18} />
            <h3 className="text-lg font-bold text-foreground">Waitlist Entries</h3>
            <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
              {total}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading waitlist...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">
                      {search ? 'No entries match your search.' : 'No waitlist entries yet.'}
                    </p>
                  </td>
                </tr>
              ) : entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{entry.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{entry.email}</td>
                  <td className="px-6 py-4">
                    <span className={`capitalize px-2.5 py-1 text-xs rounded-full font-medium ${
                      ROLE_STYLES[entry.role?.toLowerCase()] || ROLE_STYLES.default
                    }`}>
                      {entry.role || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(entry._id, entry.name)}
                      disabled={deleting === entry._id}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                      title="Remove from waitlist"
                    >
                      <Trash2 size={15} />
                    </button>
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
