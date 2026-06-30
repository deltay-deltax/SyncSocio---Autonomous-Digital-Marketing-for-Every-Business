import { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, Plus, Trash2, Tag, Percent, Copy, Check, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';

const API = 'http://localhost:5050/api/admin';

interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
  expiryDate?: string;
  timesUsed?: number;
  maxUses?: number | null;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setCoupons(res.data.coupons);
    } catch {
      console.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim() || !discountPercentage) {
      setFormError('Please fill out all required fields.');
      return;
    }
    const discountNum = Number(discountPercentage);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      setFormError('Discount must be between 1% and 100%.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload: Record<string, any> = {
        code: code.toUpperCase().trim(),
        discountPercentage: discountNum,
      };
      if (expiryDate) payload.expiryDate = expiryDate;
      if (maxUses) payload.maxUses = Number(maxUses);

      const res = await axios.post(`${API}/coupons`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setCode('');
        setDiscountPercentage('');
        setExpiryDate('');
        setMaxUses('');
        fetchCoupons();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (couponId: string, couponCode: string) => {
    if (!window.confirm(`Delete coupon "${couponCode}"?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API}/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCoupons();
    } catch {
      alert('Failed to delete coupon.');
    }
  };

  const handleToggle = async (couponId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API}/coupons/${couponId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCoupons();
    } catch {
      alert('Failed to toggle coupon status.');
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (expiryDate?: string) =>
    expiryDate ? new Date(expiryDate) < new Date() : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse text-lg">Loading coupons...</div>
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.isActive && !isExpired(c.expiryDate));
  const inactiveCoupons = coupons.filter(c => !c.isActive || isExpired(c.expiryDate));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Coupon & Discount Management
        </h2>
        <p className="text-muted-foreground mt-1">
          {activeCoupons.length} active · {inactiveCoupons.length} inactive · {coupons.length} total promo codes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-6">
            <Ticket className="text-blue-500" size={20} />
            <h3 className="text-lg font-bold text-foreground">Create Coupon Code</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag size={12} /> Coupon Code *
              </label>
              <input
                type="text"
                placeholder="e.g. SYNCSOCIO50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm uppercase font-mono tracking-wider"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Percent size={12} /> Discount Percentage *
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                min="1"
                max="100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar size={12} /> Expiry Date (optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag size={12} /> Max Uses (optional, blank = unlimited)
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                min="1"
              />
            </div>

            {formError && (
              <div className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors mt-2"
            >
              <Plus size={16} /> {submitting ? 'Creating...' : 'Add Coupon Code'}
            </button>
          </form>
        </div>

        {/* Coupons Table */}
        <div className="lg:col-span-2 glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">All Promo Codes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage visibility and lifecycle of all coupon codes.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-semibold">Code</th>
                  <th className="px-5 py-4 font-semibold">Discount</th>
                  <th className="px-5 py-4 font-semibold">Uses</th>
                  <th className="px-5 py-4 font-semibold">Expires</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expiryDate);
                  const effectivelyActive = coupon.isActive && !expired;
                  return (
                    <tr key={coupon._id} className={`hover:bg-muted/10 transition-colors ${expired ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground tracking-wider text-xs">{coupon.code}</span>
                          <button
                            onClick={() => handleCopy(coupon.code, coupon._id)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Copy code"
                          >
                            {copiedId === coupon._id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-blue-400">{coupon.discountPercentage}% OFF</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {coupon.timesUsed ?? 0}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {coupon.expiryDate ? (
                          <span className={expired ? 'text-red-400 font-medium' : 'text-muted-foreground'}>
                            {expired ? '⚠ ' : ''}{new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No expiry</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {expired ? (
                          <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs rounded-full font-medium">Expired</span>
                        ) : effectivelyActive ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded-full font-medium">Active</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-xs rounded-full font-medium">Disabled</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(coupon._id)}
                            className={`p-1.5 rounded-md transition-colors ${
                              coupon.isActive ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-gray-400 hover:bg-gray-400/10'
                            }`}
                            title={coupon.isActive ? 'Disable coupon' : 'Enable coupon'}
                          >
                            {coupon.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleDelete(coupon._id, coupon.code)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Delete coupon"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No coupon codes yet. Create one to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
