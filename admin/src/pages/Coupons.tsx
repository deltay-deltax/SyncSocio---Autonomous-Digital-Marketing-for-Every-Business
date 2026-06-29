import { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, Plus, Trash2, Tag, Percent } from 'lucide-react';

interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('http://localhost:5050/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setCoupons(res.data.coupons);
      }
    } catch (err) {
      console.error('Failed to fetch coupons', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!code.trim() || !discountPercentage) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const discountNum = Number(discountPercentage);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      setFormError('Discount percentage must be a number between 1 and 100.');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post('http://localhost:5050/api/admin/coupons', 
        { 
          code: code.toUpperCase().trim(), 
          discountPercentage: discountNum 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setCode('');
        setDiscountPercentage('');
        fetchCoupons(); // Refresh the list
      }
    } catch (err: any) {
      console.error('Failed to create coupon', err);
      setFormError(err.response?.data?.message || 'Failed to create coupon.');
    }
  };

  const handleDelete = async (couponId: string, couponCode: string) => {
    if (!window.confirm(`Are you sure you want to delete the coupon "${couponCode}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`http://localhost:5050/api/admin/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCoupons(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete coupon', err);
      alert('Failed to delete coupon.');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading coupons...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Coupon & Discount Management</h2>
        <p className="text-muted-foreground mt-1">Add and manage SaaS promotional coupons to drive brand subscription sales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Coupon Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-6">
            <Ticket className="text-blue-500" size={20} />
            <h3 className="text-lg font-bold text-foreground">Create Coupon Code</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag size={14} /> Coupon Code
              </label>
              <input
                type="text"
                placeholder="e.g. VELOCITY50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm uppercase font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Percent size={14} /> Discount Percentage
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

            {formError && (
              <div className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors mt-6"
            >
              <Plus size={16} /> Add Coupon Code
            </button>
          </form>
        </div>

        {/* Right Column: Coupons List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Active Promos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Coupon codes currently available for onboarding users.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Promo Code</th>
                  <th className="px-6 py-4 font-semibold">Discount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-foreground text-sm tracking-wider">
                      {coupon.code}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-400">
                      {coupon.discountPercentage}% OFF
                    </td>
                    <td className="px-6 py-4">
                      {coupon.isActive ? (
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Active</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-xs rounded-full font-medium">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(coupon.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(coupon._id, coupon.code)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No active coupons found. Create one to get started!
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
