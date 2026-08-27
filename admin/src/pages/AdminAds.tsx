import { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, TrendingUp, DollarSign, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminAds() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api`;
      
      const res = await axios.get(`${API_URL}/admin/campaigns/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load ad stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const ads = data?.activeAds || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Global Ads Console
        </h1>
        <p className="text-gray-500 mt-1">Monitor AI ad recommendations and campaign performance across all brands.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-gray-900">Total Active Recommendations</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalAdRecommendations || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">AI Boost Recommendations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creative</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rationale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. ROI Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Analyzed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No active ad recommendations across brands.
                  </td>
                </tr>
              ) : (
                ads.map((ad: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {ad.imageUrl ? (
                        <img src={ad.imageUrl} alt="Ad creative" className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{ad.brandName}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {ad.reasoning || 'AI identified high viral momentum.'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ad.roiScore ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <DollarSign className="w-3 h-3" /> {ad.roiScore}/100
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ad.lastAnalysisAt ? format(new Date(ad.lastAnalysisAt), 'MMM d, HH:mm') : 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
