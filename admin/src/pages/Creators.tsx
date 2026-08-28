import React, { useState, useEffect } from 'react';
import { Plus, Link2, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function Creators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [adding, setAdding] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

  const fetchCreators = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/creators`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCreators(data.creators);
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

  if (loading) return <div className="p-8">Loading creators...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Creators & Affiliates</h1>
        <p className="text-gray-500 mt-2">Manage referral partners and payouts.</p>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2">Add New Creator</h2>
        <p className="text-sm text-gray-500 mb-4">Generate a new promo link and dashboard for a creator.</p>
        <form onSubmit={handleAddCreator} className="flex gap-4 max-w-md">
          <input 
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Creator Name" 
            value={newCreatorName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCreatorName(e.target.value)}
            disabled={adding}
          />
          <button 
            type="submit" 
            disabled={adding || !newCreatorName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center disabled:opacity-50"
          >
            {adding ? "Adding..." : <><Plus className="w-4 h-4 mr-2" /> Add</>}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {creators.map(creator => {
          const promoUrl = `https://velocitydm.com/?ref=${creator.code}`;
          const dashboardUrl = `https://velocitydm.com/creator/${creator.dashboardToken}`;

          return (
            <div key={creator._id} className={`bg-white border rounded-lg shadow-sm overflow-hidden ${creator.payoutRequested ? "border-yellow-400 border-2" : ""}`}>
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between">
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {creator.name}
                        {creator.payoutRequested && (
                          <span className="text-xs font-semibold bg-yellow-400 text-yellow-950 px-2 py-1 rounded-full">
                            Payout Requested
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Code: {creator.code}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Link2 className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">Promo:</span> 
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 truncate max-w-[200px] md:max-w-md">
                          {promoUrl}
                        </code>
                        <button className="text-blue-600 hover:underline text-xs font-medium" onClick={() => copyToClipboard(promoUrl, "Promo")}>Copy</button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">Dashboard:</span> 
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-green-600 truncate max-w-[200px] md:max-w-md">
                          {dashboardUrl}
                        </code>
                        <button className="text-blue-600 hover:underline text-xs font-medium" onClick={() => copyToClipboard(dashboardUrl, "Dashboard")}>Copy</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg flex-1">
                    <div>
                      <div className="text-xs text-gray-500">Clicks</div>
                      <div className="text-lg font-semibold">{creator.clicks}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Signups</div>
                      <div className="text-lg font-semibold">{creator.signups}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Revenue Generated</div>
                      <div className="text-lg font-semibold">₹{creator.totalRevenue.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Commission Earned</div>
                      <div className="text-lg font-semibold text-green-600">₹{creator.totalEarned.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-end min-w-[150px] space-y-2 border-l pl-6">
                    <div className="text-right w-full">
                      <div className="text-xs text-gray-500">Pending Balance</div>
                      <div className={`text-2xl font-bold ${creator.pendingBalance > 0 ? (creator.payoutRequested ? 'text-yellow-500' : 'text-red-500') : 'text-green-500'}`}>
                        ₹{creator.pendingBalance.toFixed(2)}
                      </div>
                      {creator.pendingBalance <= 0 && <div className="text-xs text-green-600 flex items-center justify-end gap-1 mt-1"><CheckCircle2 className="w-3 h-3" /> All Paid</div>}
                    </div>
                    {creator.pendingBalance > 0 && (
                      <button 
                        className={`w-full py-2 px-4 rounded text-sm font-medium ${creator.payoutRequested ? "bg-yellow-500 text-white hover:bg-yellow-600" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => handleMarkPaid(creator._id, creator.pendingBalance)}
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {creators.length === 0 && (
          <div className="text-center p-12 text-gray-400 border rounded-lg border-dashed">
            No creators added yet.
          </div>
        )}
      </div>
    </div>
  );
}
