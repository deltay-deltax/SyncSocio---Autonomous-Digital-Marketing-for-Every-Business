import { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Link as LinkIcon } from 'lucide-react';

interface BrandProfile {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
  } | null;
  Brand_Name: string;
  Industry_Niche: string;
  DM_Automation_Service: boolean;
  createdAt: string;
}

export default function Brands() {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        // We will fetch brands from a new endpoint or piggyback if we can, 
        // wait, we don't have a specific `getAllBrands` endpoint yet!
        // We might need to add it to adminController or just fetch users and aggregate.
        // Actually, let's create a generic API call to a `/api/admin/brands` route 
        // that I'll add to the backend right after this!
        const res = await axios.get('http://localhost:5050/api/admin/brands', {
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

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading brands...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Registered Brands</h2>
        <p className="text-muted-foreground mt-1">View all brand profiles created by users across the SaaS platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand) => (
          <div key={brand._id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-blue-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Briefcase className="text-blue-500" size={24} />
                </div>
                {brand.DM_Automation_Service && (
                  <span className="px-2.5 py-1 bg-violet-500/10 text-violet-500 text-xs rounded-full font-medium">DM Automation Active</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{brand.Brand_Name || 'Unnamed Brand'}</h3>
              <p className="text-sm text-muted-foreground mb-4">{brand.Industry_Niche || 'No niche specified'}</p>
            </div>
            
            <div className="pt-4 border-t border-border mt-2">
              <p className="text-xs text-muted-foreground mb-1">Owner:</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{brand.user?.email || 'Unknown User'}</span>
                <a href={`/users/${brand.user?._id}`} className="text-blue-500 hover:text-blue-400">
                  <LinkIcon size={16} />
                </a>
              </div>
            </div>
          </div>
        ))}

        {brands.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No brands registered yet.
          </div>
        )}
      </div>
    </div>
  );
}
