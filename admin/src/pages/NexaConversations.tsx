import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, MessageCircle, AlertTriangle, PhoneCall, CheckCircle, IndianRupee, FileText, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NexaConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  const [search, setSearch] = useState('');
  
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const [statsRes, convRes] = await Promise.all([
        axios.get(`${API_URL}/admin/nexa/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/nexa/conversations?stage=${filterStage !== 'ALL' ? filterStage : ''}&platform=${filterPlatform !== 'ALL' ? filterPlatform : ''}&search=${encodeURIComponent(search)}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data.stats);
      setConversations(convRes.data.conversations);
    } catch (error) {
      toast.error('Failed to load Nexa data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStage, filterPlatform, search]);

  const viewDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/admin/nexa/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data.conversation);
    } catch (error) {
      toast.error('Failed to fetch conversation details');
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'CLOSED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Closed ✅</span>;
      case 'ESCALATED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Escalated</span>;
      case 'COLLECTING_DETAILS': return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Details 📝</span>;
      case 'NEGOTIATING': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Negotiating 🤝</span>;
      case 'CONFIRMING': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Confirming 💳</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{stage}</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-600" />
            Nexa Sales Agent Monitor
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track AI agent sales performance and active conversations</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Conv.</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Qualifying</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.qualifying}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Negotiating</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.negotiating}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm">
            <p className="text-sm font-medium text-emerald-800">Closed (Paid)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.closed}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50 shadow-sm">
            <p className="text-sm font-medium text-red-800">Escalated</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.escalated}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between bg-gray-50 rounded-t-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, ID, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Stages</option>
              <option value="QUALIFYING">Qualifying</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="COLLECTING_DETAILS">Collecting Details</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No conversations found matching filters.
                  </td>
                </tr>
              ) : (
                conversations.map((conv) => (
                  <tr key={conv._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{conv.customer_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{conv.customer_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/admin/brands`} className="text-sm text-indigo-600 hover:underline">
                        {conv.brandId?.companyName || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStageBadge(conv.stage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {conv.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {conv.payment?.payment_status === 'paid' ? (
                        <span className="text-green-600 text-sm font-medium">₹{(conv.payment.amount_paise / 100).toLocaleString()} (Paid)</span>
                      ) : conv.payment?.payment_status === 'pending' ? (
                        <span className="text-yellow-600 text-sm">Pending</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(conv.updatedAt), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => viewDetails(conv._id)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-over Panel */}
      {selectedConversation && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedConversation(null)} />
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col transform transition-transform">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Conversation Details
                {getStageBadge(selectedConversation.stage)}
              </h2>
              <button onClick={() => setSelectedConversation(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {/* Collected Data */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Collected Lead Data</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{selectedConversation.collected_data?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{selectedConversation.collected_data?.phone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedConversation.collected_data?.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Chat Transcript</h3>
                <div className="space-y-4">
                  {selectedConversation.transcript?.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {(!selectedConversation.transcript || selectedConversation.transcript.length === 0) && (
                    <p className="text-gray-500 text-sm italic text-center">No transcript available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
