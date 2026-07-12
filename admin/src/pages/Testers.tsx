import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';

const API = `\${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

interface TesterRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  brandId: {
    _id: string;
    brandName: string;
  } | null;
  igHandle: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function Testers() {
  const [requests, setRequests] = useState<TesterRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const res = await axios.get(`${API}/meta-testers${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRequests(res.data.entries);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch tester requests:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    setUpdating(id);
    try {
      const token = localStorage.getItem('adminToken');
      const nextApprovedState = !currentApproved;
      
      const res = await axios.put(
        `${API}/meta-testers/${id}/approve`,
        { approved: nextApprovedState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        // Optimistically update or re-fetch
        setRequests(prev => 
          prev.map(r => r._id === id ? { ...r, status: nextApprovedState ? 'approved' : 'pending' } : r)
        );
      }
    } catch (error) {
      console.error('Failed to update tester request status:', error);
      alert('Failed to update tester approval status.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            Meta Tester Access
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage Facebook/Instagram Developer Tester requests to bypass app review connection block.
          </p>
        </div>
      </div>

      {/* Info Alert Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl p-4 flex gap-3 text-xs leading-relaxed max-w-4xl">
        <HelpCircle size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">How it works:</span> Approving a tester request will automatically set <code className="bg-blue-500/25 px-1 py-0.5 rounded font-semibold text-blue-300">isTesterEnabled: true</code> on the user's active brand profile. This bypasses the Meta App Review connection restriction on the onboarding setup wizard for that specific brand profile.
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 glass-card border border-transparent p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search by username, email, name, or brand..."
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
            <ShieldAlert className="text-muted-foreground" size={18} />
            <h3 className="text-lg font-bold text-foreground">Tester Requests</h3>
            <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
              {total}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr className="divide-x divide-border/50">
                <th className="px-6 py-4 font-semibold whitespace-nowrap">User Details</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Brand Profile</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Instagram Handle</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Request Date</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Access Status</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Approve Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading tester requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <ShieldCheck className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">
                      {search ? 'No tester requests match your search.' : 'No tester requests yet.'}
                    </p>
                  </td>
                </tr>
              ) : requests.map((request) => {
                const isApproved = request.status === 'approved';
                return (
                  <tr key={request._id} className="hover:bg-muted/10 transition-colors divide-x divide-border/50">
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      <div>{request.userId?.name || 'No Name'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{request.userId?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {request.brandId?.brandName ? (
                        <span className="font-semibold text-foreground bg-white/5 border border-white/10 rounded px-2 py-1 text-xs">
                          {request.brandId.brandName}
                        </span>
                      ) : (
                        <span className="italic text-xs text-muted-foreground/60">No associated brand</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-blue-400 whitespace-nowrap">
                      {request.igHandle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {new Date(request.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleApproval(request._id, isApproved)}
                        disabled={updating === request._id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none cursor-pointer border-0 ${
                          isApproved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-zinc-700 hover:bg-zinc-600'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isApproved ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
