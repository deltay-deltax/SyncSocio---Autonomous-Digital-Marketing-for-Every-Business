import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, BrainCircuit, Bot, Search, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AIOperations() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAIOperations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;
      
      const res = await axios.get(`${API}/ai-operations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load AI Operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIOperations();
    // Poll every 30 seconds for live monitoring
    const interval = setInterval(fetchAIOperations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Failed to load AI Operations</h2>
        <p className="text-sm mt-2">There was an error fetching data from the server. Check backend logs or try again.</p>
        <button onClick={fetchAIOperations} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">AI Engine Operations</h1>
      </div>
      <p className="text-gray-500 text-sm mt-1 -mt-4">Live monitoring of user background tasks and AI engine usage.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Tasks Triggered Today</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.tasksToday}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Post Optimizations Today</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Bot className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.stats.optimizationsToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Background Task Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Live Background Tasks
            </h3>
            <p className="text-sm text-gray-500">Monitoring user generation queues</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User / Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">No recent background tasks</td>
                  </tr>
                ) : (
                  data.recentActivities.map((activity: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{activity.agentName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{activity.message}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{activity.user?.name}</div>
                        <div className="text-xs text-gray-500">{activity.brandId?.brandName || 'No Brand'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activity.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                            Running
                          </span>
                        ) : activity.status === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(activity.timestamp), 'HH:mm:ss')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Post Optimizations Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-500" />
              Recent AI Critiques
            </h3>
            <p className="text-sm text-gray-500">Tracking post optimizer feature usage</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User / Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentOptimizations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">No recent post analyses</td>
                  </tr>
                ) : (
                  data.recentOptimizations.map((opt: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{opt.userId?.name}</div>
                        <div className="text-xs text-gray-500">{opt.brandId?.brandName || 'No Brand'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {opt.contentType}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className={`px-2 py-1 rounded text-xs ${opt.growthFactor >= 80 ? 'bg-green-100 text-green-800' : opt.growthFactor >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {opt.growthFactor}/100
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(opt.createdAt), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
