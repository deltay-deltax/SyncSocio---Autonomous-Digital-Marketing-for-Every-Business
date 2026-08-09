import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Mail, MessageCircle, ShieldCheck, Clock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Campaigns() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await axios.get(`${API_URL}/admin/campaigns/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load campaign stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Send className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Campaigns Monitor</h1>
      </div>
      <p className="text-gray-500 text-sm mt-1 -mt-4">Email & WhatsApp broadcast analytics and quotas</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Emails Sent</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.totalEmailsSent.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Emails This Month</h3>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.emailsSentThisMonth.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">WhatsApp Campaigns</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><MessageCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.whatsappCampaignsSent.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Verified Domains</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.verifiedDomainsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Domain Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Email Domain Status</h3>
            <p className="text-sm text-gray-500">Status of custom domain verification for SendGrid</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[400px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.domainStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No custom domains configured</td>
                  </tr>
                ) : (
                  data.domainStatuses.map((ds: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{ds.brandName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{ds.domain}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ds.status === 'Verified' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Quotas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Email Quotas</h3>
            <p className="text-sm text-gray-500">Track usage against plan limits</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[400px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent / Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.quotas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No quota usage data</td>
                  </tr>
                ) : (
                  data.quotas.map((q: any, i: number) => {
                    const usagePercent = q.limit > 0 ? (q.sent / q.limit) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{q.email}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600">
                          {q.sent} / {q.limit || '∞'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {q.limit > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                                <div 
                                  className={`h-2.5 rounded-full ${usagePercent >= 90 ? 'bg-red-600' : usagePercent >= 75 ? 'bg-yellow-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{usagePercent.toFixed(1)}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Campaign Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent API Logs (Campaigns & Broadcasting)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentLogs.map((log: any) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono text-xs">{log.endpoint}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.isError ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Error</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Success</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.user?.email || 'System'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
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
