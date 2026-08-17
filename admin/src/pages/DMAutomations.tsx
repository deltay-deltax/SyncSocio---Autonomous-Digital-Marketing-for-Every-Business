import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Search, Zap, MousePointerClick, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DMAutomations() {
  const [flows, setFlows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterActive, setFilterActive] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api`;
      
      let url = `${API_URL}/admin/dm-flows`;
      const queryParams = [];
      if (filterActive !== 'ALL') queryParams.push(`active=${filterActive}`);
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFlows(res.data.flows);
      setStats(res.data.stats);
    } catch (error) {
      toast.error('Failed to load DM flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterActive, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            DM Automations Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">Global view of all triggered messaging flows</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Flows</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalFlows}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active Flows</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeFlows}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><Zap className="w-4 h-4"/> Total Triggers</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalTriggers.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1"><MousePointerClick className="w-4 h-4"/> Conversions</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalConversions.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between bg-gray-50 rounded-t-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search flows, keywords, brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flow Name & Trigger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No flows found matching criteria.
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr key={flow._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{flow.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                          {flow.triggerKeyword || 'default'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {flow.brand?.companyName || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {flow.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        flow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {flow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                        <div className="flex flex-col items-center" title="Triggers">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-900">{flow.metrics?.triggered || 0}</span>
                        </div>
                        <div className="flex flex-col items-center" title="Replies">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-gray-900">{flow.metrics?.replied || 0}</span>
                        </div>
                        <div className="flex flex-col items-center" title="Clicks">
                          <MousePointerClick className="w-4 h-4 text-purple-500" />
                          <span className="font-medium text-gray-900">{flow.metrics?.conversions || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(flow.createdAt), 'MMM d, yyyy')}
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
