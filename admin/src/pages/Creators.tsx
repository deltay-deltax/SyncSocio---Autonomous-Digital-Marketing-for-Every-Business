import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Link2, ExternalLink, CheckCircle2, Search, Filter, ArrowUpRight, DollarSign, Users, MousePointerClick, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Creators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [allConversions, setAllConversions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [adding, setAdding] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<'creators' | 'conversions'>('creators');

  let API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  if (!API_BASE.endsWith('/api')) API_BASE += '/api';

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/creators`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCreators(data.creators || []);
        setAllConversions(data.allConversions || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreatorName.trim()) return;
    setAdding(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/creators`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCreatorName })
      });
      const data = await res.json();
      if (data.success) {
        alert("Creator added successfully");
        setNewCreatorName("");
        fetchCreators();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      alert("Failed to add creator: " + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleMarkPaid = async (creatorId: string, amount: number) => {
    if (!confirm(`Are you sure you want to mark ₹${amount} as paid?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/creators/${creatorId}/mark-paid`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) {
        alert("Marked as paid");
        fetchCreators();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      alert("Failed: " + error.message);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} link copied to clipboard.`);
  };

  const filteredConversions = useMemo(() => {
    return allConversions.filter(c => {
      const matchesSearch = 
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plan.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCreator = creatorFilter === 'ALL' || c.creatorId === creatorFilter;
      
      return matchesSearch && matchesCreator;
    });
  }, [allConversions, searchQuery, creatorFilter]);

  if (loading && creators.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground animate-pulse flex items-center gap-2">
        <RefreshCw className="animate-spin w-4 h-4" /> Loading creators & affiliates...
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Affiliates & Creators</h1>
          <p className="text-slate-500 mt-2">Manage partners, view referred sales, and handle 25% commission payouts.</p>
        </div>
        <button 
          onClick={fetchCreators}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Creators</div>
            <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-blue-500" /> {summary.totalCreators}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clicks</div>
            <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <MousePointerClick size={20} className="text-amber-500" /> {summary.totalClicks}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Signups</div>
            <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ArrowUpRight size={20} className="text-teal-500" /> {summary.totalSignups}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Revenue</div>
            <div className="text-2xl font-black text-slate-900">
              ₹{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-emerald-500 p-5 rounded-2xl shadow-sm text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={40} /></div>
            <div className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2 relative z-10">Total 25% Commission</div>
            <div className="text-2xl font-black relative z-10">
              ₹{summary.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className={`p-5 rounded-2xl border shadow-sm ${summary.totalPending > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${summary.totalPending > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Pending Payouts</div>
            <div className={`text-2xl font-black ${summary.totalPending > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              ₹{summary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('creators')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'creators' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Creators & Payouts
        </button>
        <button
          onClick={() => setActiveTab('conversions')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'conversions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Referred Purchases ({allConversions.length})
        </button>
      </div>

      {activeTab === 'creators' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Creator</h2>
              <p className="text-sm text-slate-500">Generate a trackable promo link (25% commission) and a private dashboard.</p>
            </div>
            <form onSubmit={handleAddCreator} className="flex w-full md:w-auto gap-3">
              <input 
                className="flex-1 md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="Creator or Affiliate Name" 
                value={newCreatorName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCreatorName(e.target.value)}
                disabled={adding}
              />
              <button 
                type="submit" 
                disabled={adding || !newCreatorName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                {adding ? "Adding..." : "Add"}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {creators.map(creator => (
              <CreatorCard key={creator._id} creator={creator} onMarkPaid={handleMarkPaid} copyToClipboard={copyToClipboard} />
            ))}
            {creators.length === 0 && (
              <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900">No creators found</h3>
                <p className="text-sm text-slate-500 mt-1">Add your first creator partner above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'conversions' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search customers, brands..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                value={creatorFilter} 
                onChange={e => setCreatorFilter(e.target.value)}
                className="w-full sm:w-48 py-2 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 bg-white"
              >
                <option value="ALL">All Creators</option>
                {creators.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 whitespace-nowrap">Customer & Brand</th>
                  <th className="p-4 whitespace-nowrap">Referred By</th>
                  <th className="p-4 whitespace-nowrap">Purchased Plan</th>
                  <th className="p-4 whitespace-nowrap text-right">Plan Amount</th>
                  <th className="p-4 whitespace-nowrap text-right">25% Commission</th>
                  <th className="p-4 whitespace-nowrap">Date & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConversions.map((conv, i) => (
                  <tr key={conv._id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{conv.customerName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{conv.customerEmail}</div>
                      <div className="text-xs font-semibold text-blue-600 mt-1.5 flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3" /> {conv.brandName}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 text-sm">{conv.creatorName}</span>
                        <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                          {conv.creatorCode}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                        conv.plan?.toLowerCase().includes('pro') ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        conv.plan?.toLowerCase().includes('growth') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        conv.plan?.toLowerCase().includes('starter') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {conv.plan}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1 capitalize font-medium">{conv.type.replace('_', ' ')}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-black text-slate-900 text-base">₹{conv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1 py-0.5 rounded">25%</span>
                        <span className="font-black text-emerald-700 text-base">₹{conv.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(conv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-1">
                        {new Date(conv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        conv.isEligible 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {conv.isEligible ? 'Eligible' : 'Outside 60 Days'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredConversions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-6 h-6 text-slate-300" />
                        <span className="font-medium">No conversions found matching criteria.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

function CreatorCard({ creator, onMarkPaid, copyToClipboard }: { creator: any, onMarkPaid: (id: string, amount: number) => void, copyToClipboard: (text: string, type: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  
  const promoUrl = `https://syncsocio.com/?ref=${creator.code}`;
  const dashboardUrl = `https://syncsocio.com/creator/${creator.dashboardToken}`;

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${creator.payoutRequested ? "border-amber-300 ring-4 ring-amber-300/20" : "border-slate-200 hover:shadow-md"}`}>
      <div className="p-5 md:p-6">
        
        {/* Top Row: Info & Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              {creator.name}
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md tracking-wider">
                CODE: {creator.code}
              </span>
              {creator.payoutRequested && (
                <span className="text-xs font-bold bg-amber-400 text-amber-950 px-3 py-1 rounded-full animate-pulse">
                  Payout Requested
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Added on {new Date(creator.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Balance</div>
              <div className={`text-2xl md:text-3xl font-black tracking-tight ${creator.pendingBalance > 0 ? (creator.payoutRequested ? 'text-amber-500' : 'text-rose-500') : 'text-emerald-500'}`}>
                ₹{creator.pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {creator.pendingBalance > 0 ? (
              <button 
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap ${creator.payoutRequested ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/25" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"}`}
                onClick={() => onMarkPaid(creator._id, creator.pendingBalance)}
              >
                Mark as Paid
              </button>
            ) : (
              <div className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1.5"><CheckCircle2 className="w-5 h-5" /> All Paid</div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-xs font-bold text-slate-500 mb-1">Clicks</div>
            <div className="text-xl font-black text-slate-900">{creator.clicks}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-xs font-bold text-slate-500 mb-1">Signups</div>
            <div className="text-xl font-black text-slate-900">{creator.signups} <span className="text-xs text-slate-400 font-normal">({creator.eligibleSignups} paid)</span></div>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-xs font-bold text-slate-500 mb-1">Revenue</div>
            <div className="text-xl font-black text-slate-900">₹{creator.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-xs font-bold text-emerald-600 mb-1">25% Commission</div>
            <div className="text-xl font-black text-emerald-700">₹{creator.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Expand/Collapse Toggle */}
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors border-t border-slate-100 pt-4 mt-2"
        >
          {expanded ? 'Hide Links' : 'Show Links'} 
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Links section (Expanded) */}
        {expanded && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <Link2 className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">Promo Link:</span> 
              </div>
              <code className="text-xs font-medium bg-white border border-slate-200 px-3 py-2 rounded text-blue-600 truncate flex-1 block">
                {promoUrl}
              </code>
              <button className="text-blue-600 hover:text-blue-800 text-xs font-bold px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors shrink-0" onClick={() => copyToClipboard(promoUrl, "Promo")}>Copy Link</button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">Dashboard:</span> 
              </div>
              <code className="text-xs font-medium bg-white border border-slate-200 px-3 py-2 rounded text-emerald-600 truncate flex-1 block">
                {dashboardUrl}
              </code>
              <button className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors shrink-0" onClick={() => copyToClipboard(dashboardUrl, "Dashboard")}>Copy Link</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
