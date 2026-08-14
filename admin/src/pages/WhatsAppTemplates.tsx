import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Search, CheckCircle, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      let url = `${API_URL}/admin/whatsapp-templates`;
      const queryParams = [];
      if (filter !== 'ALL') queryParams.push(`status=${filter}`);
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(res.data.templates);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [filter, search]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (newStatus === 'REJECTED' && !rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      await axios.put(`${API_URL}/admin/whatsapp-templates/${id}/status`, {
        status: newStatus,
        rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Template ${newStatus.toLowerCase()}`);
      setSelectedTemplate(null);
      setRejectionReason('');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderTemplateContent = (template: any) => {
    const highlightVariables = (text: string) => {
      if (!text) return text;
      return text.split(/(\{\{[^{}]+\}\})/).map((part, i) => 
        part.match(/^\{\{[^{}]+\}\}$/) ? 
          <span key={i} className="bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm">{part}</span> : 
          part
      );
    };

    return (
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
        <div className="bg-[#075E54] text-white px-4 py-3 font-semibold shadow-sm">
          WhatsApp Preview
        </div>
        <div className="bg-[#E5DDD5] p-4 min-h-[200px]">
          <div className="bg-white rounded-lg p-3 shadow-sm inline-block max-w-full">
            {template.headerType === 'TEXT' && template.headerContent && (
              <div className="font-bold text-gray-900 mb-2">
                {highlightVariables(template.headerContent)}
              </div>
            )}
            {template.headerType === 'IMAGE' && (
              <div className="bg-gray-200 h-32 rounded mb-2 flex items-center justify-center text-gray-500">
                [Image Header]
              </div>
            )}
            
            <div className="text-gray-800 whitespace-pre-wrap">
              {highlightVariables(template.bodyContent)}
            </div>
            
            {template.footerContent && (
              <div className="text-xs text-gray-500 mt-2 uppercase">
                {template.footerContent}
              </div>
            )}

            {template.buttons && template.buttons.length > 0 && (
              <div className="mt-3 border-t pt-2 space-y-2">
                {template.buttons.map((btn: any, idx: number) => (
                  <div key={idx} className="text-center text-blue-500 text-sm font-medium">
                    {btn.type === 'QUICK_REPLY' ? '↩️ ' : '🔗 '}
                    {btn.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" />
            WhatsApp Templates
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and approve user-submitted Meta templates</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate" title={template.templateName}>
                      {template.templateName}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-1">
                      {template.category}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(template.status)}`}>
                    {template.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      👤
                    </div>
                    <span className="truncate">{template.user?.email || 'Unknown User'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      🏢
                    </div>
                    <span className="truncate">{template.brand?.companyName || 'Unknown Brand'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{format(new Date(template.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 line-clamp-3 mb-4">
                  {template.bodyContent}
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                
                {template.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTemplate({ ...template, action: 'reject' })}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(template._id, 'APPROVED')}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate.templateName}
                </h2>
                <p className="text-sm text-gray-500">
                  Submitted by {selectedTemplate.user?.email} for {selectedTemplate.brand?.companyName}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Metadata
                </h3>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium text-gray-900 mt-1">{selectedTemplate.category}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Language</dt>
                    <dd className="font-medium text-gray-900 mt-1">{selectedTemplate.language}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTemplate.status)}`}>
                        {selectedTemplate.status}
                      </span>
                    </dd>
                  </div>
                  {selectedTemplate.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <dt className="text-red-800 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Rejection Reason
                      </dt>
                      <dd className="text-red-700 mt-1">{selectedTemplate.rejectionReason}</dd>
                    </div>
                  )}
                </dl>

                {selectedTemplate.action === 'reject' && (
                  <div className="mt-8 border-t pt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain what needs to be fixed..."
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 h-24"
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleStatusUpdate(selectedTemplate._id, 'REJECTED')}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTemplate({ ...selectedTemplate, action: null });
                          setRejectionReason('');
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedTemplate.status === 'PENDING' && !selectedTemplate.action && (
                  <div className="mt-8 border-t pt-6 flex gap-3">
                    <button
                      onClick={() => handleStatusUpdate(selectedTemplate._id, 'APPROVED')}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> Approve Template
                    </button>
                    <button
                      onClick={() => setSelectedTemplate({ ...selectedTemplate, action: 'reject' })}
                      className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 -m-6 p-6 md:border-l md:m-0 border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Visual Preview
                </h3>
                {renderTemplateContent(selectedTemplate)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
