import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Briefcase, ExternalLink, Utensils, ShoppingBag, Heart, Tag, ChevronLeft, ChevronRight } from 'lucide-react';

interface BrandProfile {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
    plan?: string;
  } | null;
  brandName: string;
  businessCategory: string;
  DM_Automation_Service: boolean;
  createdAt: string;
  logo?: string;
  instagramIsConnected?: boolean;
  whatsappIsConnected?: boolean;
  email_domain_verified?: boolean;
  email_domain?: string;
  nexa?: {
    nexa_enabled: boolean;
  };
  neuralState?: string;
}

const getCategoryIcon = (category: string) => {
  if (!category) return <Tag size={14} />;
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('beverage')) return <Utensils size={14} />;
  if (cat.includes('fashion') || cat.includes('apparel') || cat.includes('clothing')) return <ShoppingBag size={14} />;
  if (cat.includes('health') || cat.includes('wellness') || cat.includes('skincare') || cat.includes('nutrition') || cat.includes('care')) return <Heart size={14} />;
  return <Tag size={14} />;
};

export default function Brands() {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // Default 9 per page for 3x3 grid

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/brands`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setBrands(res.data.brands);
        }
      } catch (err) {
        console.error('Failed to fetch brands', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  const totalPages = Math.ceil(brands.length / pageSize);
  const pagedBrands = useMemo(() => {
    return brands.slice((page - 1) * pageSize, page * pageSize);
  }, [brands, page, pageSize]);

  if (loading) {
    return <div className="text-slate-500 animate-pulse">Loading brands...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registered Brands</h2>
          <p className="text-sm text-slate-500 mt-1">View all brand profiles created by users across the SaaS platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedBrands.map((brand) => (
          <div key={brand._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between group">
            <div>
              <div className="mb-4">
                {brand.logo ? (
                  <div className="h-14 w-14 rounded-xl border border-slate-100 flex items-center justify-center p-1.5 bg-white overflow-hidden shadow-sm">
                    <img src={brand.logo} alt={`${brand.brandName} logo`} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                    <Briefcase className="text-blue-500" size={24} />
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">{brand.brandName || 'Unnamed Brand'}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
                {getCategoryIcon(brand.businessCategory)}
                <span>{brand.businessCategory || 'No niche specified'}</span>
              </div>

              {/* Connections & Badges */}
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Plan Badge */}
                {brand.user?.plan && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                    brand.user.plan.toLowerCase() === 'pro' ? 'bg-violet-100 text-violet-700' :
                    brand.user.plan.toLowerCase() === 'growth' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {brand.user.plan}
                  </span>
                )}
                {/* Nexa Agent Badge */}
                {brand.nexa?.nexa_enabled && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full font-bold uppercase bg-indigo-100 text-indigo-700 flex items-center gap-1">
                    🤖 Nexa {brand.neuralState ? `(${brand.neuralState})` : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-medium mt-3">
                <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${brand.instagramIsConnected ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  IG {brand.instagramIsConnected ? '✅' : '❌'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${brand.whatsappIsConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  WA {brand.whatsappIsConnected ? '✅' : '❌'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${brand.email_domain_verified ? 'bg-blue-50 text-blue-700 border-blue-200' : brand.email_domain ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  Email {brand.email_domain_verified ? '✅' : brand.email_domain ? '⏳' : '❌'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-1.5">Owner</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{brand.user?.email || 'Unknown User'}</span>
                <a href={`/users/${brand.user?._id}`} className="text-blue-500 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 md:opacity-100">
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        ))}

        {brands.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No brands registered yet.
          </div>
        )}
      </div>

      {brands.length > 0 && (
        <div className="mt-4 pt-4 flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, brands.length)} of {brands.length} brands
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <select 
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 font-medium text-xs cursor-pointer"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="9">9 per page</option>
                <option value="18">18 per page</option>
                <option value="36">36 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (totalPages > 5) {
                  if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                    if (p === 2 || p === totalPages - 1) return <span key={p} className="text-slate-400 text-xs px-1">...</span>;
                    return null;
                  }
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
