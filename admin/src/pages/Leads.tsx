import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download, Users, ClipboardList, Plus, Save, X, ArrowLeft, Mail, Phone, Globe, Briefcase, Edit2 } from 'lucide-react';
import { parsePhoneNumber } from 'libphonenumber-js';
import { useNavigate, useLocation } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

interface LeadEntry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  website?: string;
  businessCategory: string;
  intent: string;
  status: 'green' | 'yellow' | 'red' | 'new';
  comments: string;
  createdAt: string;
  source: string;
}

const formatPhone = (phone: string) => {
  if (!phone) return '-';
  try {
    // If phone doesn't have a '+', parse it with 'IN' as default country
    const phoneNumber = phone.startsWith('+') ? parsePhoneNumber(phone) : parsePhoneNumber(phone, 'IN');
    if (phoneNumber) {
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    // Fallback if libphonenumber fails
  }
  
  // Custom fallback formatter
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length > 10) {
    const countryCodeLength = cleaned.length - 10;
    const isPlus = cleaned.startsWith('+');
    const cc = isPlus ? cleaned.substring(0, countryCodeLength) : `+${cleaned.substring(0, countryCodeLength)}`;
    const num = cleaned.substring(countryCodeLength);
    return `${cc} ${num.substring(0, 5)} ${num.substring(5)}`;
    return phone.replace(/(\+\d{2})(\d+)/, '$1 $2');
  }
  
  return phone;
};

const getStatusConfig = (status: string) => {
  switch(status) {
    case 'green': return { label: 'Client / Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    case 'red': return { label: 'Rejected', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
    case 'yellow': return { label: 'Talking Stage', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    default: return { label: 'New / Uncontacted', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  }
};

export default function Leads() {
  const navigate = useNavigate();
  const location = useLocation();
  const [entries, setEntries] = useState<LeadEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Manual Add/Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '', email: '', phone: '', businessName: '', website: '', businessCategory: '', customCategory: '', intent: 'manual'
  });

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '', email: '', phone: '', businessName: '', website: '', businessCategory: '', intent: 'manual'
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEntries(res.data.leads);
        setTotal(res.data.leads.length);
      }
    } catch (error) {
      console.error('Failed to fetch leads');
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleUpdateLead = async (id: string, updates: Partial<LeadEntry>) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API}/leads/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(prev => prev.map(e => e._id === id ? { ...e, ...updates } : e));
    } catch (error) {
      console.error('Failed to update lead:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      
      const submitData = { ...newLead };
      if (submitData.businessCategory === 'Other' && submitData.customCategory) {
        submitData.businessCategory = submitData.customCategory;
      }
      
      if (editingId) {
        // Edit mode
        await axios.put(`${API}/leads/${editingId}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEntries(prev => prev.map(e => e._id === editingId ? { ...e, ...submitData } : e));
      } else {
        // Add mode
        const res = await axios.post(`${API}/leads`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setEntries([res.data.lead, ...entries]);
          setTotal(prev => prev + 1);
        }
      }
      
      setShowAddModal(false);
      setEditingId(null);
      setNewLead({ name: '', email: '', phone: '', businessName: '', website: '', businessCategory: '', customCategory: '', intent: 'manual' });
    } catch (error) {
      console.error('Failed to save lead:', error);
      alert('Failed to save lead');
    }
  };

  const openEditModal = (entry: LeadEntry) => {
    let cat = entry.businessCategory || '';
    let customCat = '';
    const standardCategories = ['E-commerce', 'SaaS', 'Agency', 'Local Business', 'Creator', 'Food & Beverage', 'Fashion & Apparel'];
    if (cat && !standardCategories.includes(cat)) {
      customCat = cat;
      cat = 'Other';
    }
    
    setNewLead({
      name: entry.name || '',
      email: entry.email || '',
      phone: entry.phone || '',
      businessName: entry.businessName || '',
      website: entry.website || '',
      businessCategory: cat,
      customCategory: customCat,
      intent: entry.intent || 'manual'
    });
    setEditingId(entry._id);
    setShowAddModal(true);
      const res = await axios.post(`${API}/leads`, newLead, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEntries([res.data.lead, ...entries]);
        setTotal(prev => prev + 1);
        setShowAddModal(false);
        setNewLead({ name: '', email: '', phone: '', businessName: '', website: '', businessCategory: '', intent: 'manual' });
      }
    } catch (error) {
      console.error('Failed to add lead:', error);
      alert('Failed to add lead');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Business Name', 'Contact Person', 'Email', 'Phone', 'Website', 'Category', 'Status', 'Comments', 'Submitted Date'];
    const rows = entries.map(e => [
      e.businessName,
      e.name,
      e.email,
      formatPhone(e.phone),
      e.website || '-',
      e.businessCategory,
      e.status || 'new',
      e.comments || '',
      new Date(e.createdAt).toLocaleDateString('en-IN')
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syncsocio_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isStandalone = location.pathname === '/leads-management';

  return (
    <div className={`w-full min-h-screen bg-slate-50/50 pb-12 ${isStandalone ? 'pt-8' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {isStandalone && (
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Control Center
          </button>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Leads & Brands Management
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Track and manage your approached brands. <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> entries total.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Filter Dropdown */}
            <div className="relative group min-w-[160px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer outline-none transition-all hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
              >
                <option value="all">Filter: All Leads</option>
                <option value="new">Filter: New / Uncontacted</option>
                <option value="yellow">Filter: Talking Stage</option>
                <option value="green">Filter: Approved / Client</option>
                <option value="red">Filter: Rejected</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingId(null);
                  setNewLead({ name: '', email: '', phone: '', businessName: '', website: '', businessCategory: '', customCategory: '', intent: 'manual' });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-600/20"
              >
                <Plus size={16} /> Add Brand
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Entries Grid */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 text-sm font-medium">Loading your leads...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="text-slate-400" size={32} />
              </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Leads & Brands Management
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Track and manage your approached brands. <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> entries total.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-600/20"
            >
              <Plus size={16} /> Add Brand
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Entries Grid */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 text-sm font-medium">Loading your leads...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No leads found</h3>
              <p className="text-slate-500 mt-1 text-sm max-w-md">You haven't added any brands or received any website leads yet.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-xl text-sm transition-colors"
              >
                Add your first brand
              </button>
            </div>
          ) : (
            entries
              .filter((entry) => filterStatus === 'all' || entry.status === filterStatus || (!entry.status && filterStatus === 'new'))
              .map((entry) => {
            entries.map(entry => {
              const statusConfig = getStatusConfig(entry.status || 'new');
              
              return (
                <div key={entry._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:flex-row hover:shadow-md transition-shadow">
                  
                  {/* Left Info Column */}
                  <div className="flex-1 p-6 xl:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-slate-900">{entry.businessName}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${entry.source === 'manual' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {entry.source === 'manual' ? 'Manual' : 'Website'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" /> {entry.businessCategory}</span>
                            {entry.website && (
                              <a href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline">
                                <Globe size={14} /> {entry.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                            <button
                              onClick={() => openEditModal(entry)}
                              className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors ml-2"
                              title="Edit Lead"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                          </div>
                        </div>

                        {/* Status Dropdown */}
                        <div className="relative group min-w-[200px]">
                          <select
                            value={entry.status || 'new'}
                            onChange={(e) => handleUpdateLead(entry._id, { status: e.target.value as any })}
                            className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer outline-none transition-all ${statusConfig.bg} hover:brightness-95`}
                          >
                            <option value="new">New / Uncontacted</option>
                            <option value="yellow">Talking Stage</option>
                            <option value="green">Approved / Client</option>
                            <option value="red">Rejected</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                            <svg className="w-4 h-4 text-current opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Contact Person</span>
                          <div className="flex items-center gap-2 text-slate-900 font-medium">
                            <Users size={16} className="text-slate-400" />
                            {entry.name}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                          <div className="flex items-center gap-2 text-slate-900 font-medium">
                            <Phone size={16} className="text-slate-400" />
                            {formatPhone(entry.phone)}
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                          <div className="flex items-center gap-2 text-slate-900 font-medium truncate">
                            <Mail size={16} className="text-slate-400 flex-shrink-0" />
                            <a href={`mailto:${entry.email}`} className="truncate hover:text-blue-600 transition-colors">{entry.email}</a>
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Submitted Date</span>
                          <div className="text-slate-900 font-medium">
                            {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Sticky Note Column */}
                  <div className="w-full xl:w-[400px] border-t xl:border-t-0 xl:border-l border-slate-200 bg-amber-50/50 flex flex-col relative group">
                    <div className="p-4 border-b border-amber-200/50 flex items-center justify-between bg-amber-100/30">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm tracking-wide">
                        <ClipboardList size={16} className="text-amber-500" />
                        CRM NOTES
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-amber-600/60 text-xs font-medium">
                        <Save size={12} /> Auto-saves
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Right Sticky Note Column */}
                  <div className="w-full xl:w-[400px] border-t xl:border-t-0 xl:border-l border-slate-200 bg-amber-50/50 flex flex-col relative group">
                    <div className="p-4 border-b border-amber-200/50 flex items-center justify-between bg-amber-100/30">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm tracking-wide">
                        <ClipboardList size={16} className="text-amber-500" />
                        CRM NOTES
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-amber-600/60 text-xs font-medium">
                        <Save size={12} /> Auto-saves
                      </div>
                    </div>
                    
                    <textarea
                      defaultValue={entry.comments}
                      onBlur={(e) => {
                        if (e.target.value !== entry.comments) {
                          handleUpdateLead(entry._id, { comments: e.target.value });
                        }
                      }}
                      placeholder="Add conversation notes, next steps, or follow-up reminders here..."
                      className="flex-1 w-full bg-transparent border-0 focus:ring-0 resize-none p-6 text-slate-700 placeholder:text-amber-900/20 text-sm leading-relaxed custom-scrollbar outline-none min-h-[200px] xl:min-h-full font-medium"
                      style={{ 
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(245, 158, 11, 0.1) 28px)',
                        backgroundAttachment: 'local',
                        lineHeight: '28px'
                      }}
                    ></textarea>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Lead Modal */}
      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Brand' : 'Add Brand Manually'}</h3>
              <h3 className="text-lg font-bold text-slate-900">Add Brand Manually</h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 p-1.5 rounded-lg transition-colors shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddLead} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
                <input 
                  type="text" 
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name <span className="text-red-500">*</span></label>
                <input 
                  required type="text" 
                  value={newLead.businessName} onChange={e => setNewLead({...newLead, businessName: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                  placeholder="e.g. Acme Corp"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Name</label>
                  <input 
                    type="text" 
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Name <span className="text-red-500">*</span></label>
                  <input 
                    required type="text" 
                    value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    value={newLead.phone}
                    onChange={(value) => setNewLead({...newLead, phone: value || ''})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none phone-input-container"
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
                  <input 
                    required type="tel" 
                    value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input 
                  required type="email" 
                  value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                  placeholder="contact@acme.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website</label>
                  <input 
                    type="text" 
                    value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                    placeholder="example.com"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Category</label>
                  <select 
                    value={newLead.businessCategory} onChange={e => setNewLead({...newLead, businessCategory: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none cursor-pointer" 
                  >
                    <option value="">Select category (optional)</option>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Category <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={newLead.businessCategory} onChange={e => setNewLead({...newLead, businessCategory: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none cursor-pointer" 
                  >
                    <option value="" disabled>Select category</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Agency">Agency</option>
                    <option value="Local Business">Local Business</option>
                    <option value="Creator">Creator / Influencer</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  
                  {newLead.businessCategory === 'Other' && (
                    <input 
                      type="text" 
                      value={newLead.customCategory} onChange={e => setNewLead({...newLead, customCategory: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none animate-in fade-in slide-in-from-top-2" 
                      placeholder="Type your category here..."
                    />
                  )}
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-blue-600/20 flex items-center gap-2"
                >
                  <Save size={16} /> {editingId ? 'Save Changes' : 'Save Brand'}
                  <Save size={16} /> Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
