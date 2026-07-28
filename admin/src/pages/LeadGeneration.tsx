import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/scraper`;

export default function LeadGeneration() {
  const [cities, setCities] = useState<string>('Surat,Ahmedabad');
  const [keywords, setKeywords] = useState<string>('Social Media Agency');
  const [status, setStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  
  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.job) {
        setStatus(res.data.job.status);
        setLogs(res.data.job.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'running') {
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStart = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const cityList = cities.split(',').map(c => c.trim()).filter(Boolean);
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      
      const res = await axios.post(`${API}/start`, { cities: cityList, keywords: keywordList }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setStatus('running');
        setLogs(['Job started...']);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start job');
    }
  };

  const handleDownload = async (type: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API}/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agencies.${type}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Failed to download file.');
      console.error(err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Lead Generation Engine</h1>
        <p className="text-slate-500">Extract, enrich, and score agencies across India.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Controls */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cities (comma separated)</label>
              <textarea 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                disabled={status === 'running'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Keywords (comma separated)</label>
              <textarea 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={status === 'running'}
              />
            </div>
            
            <button
              onClick={handleStart}
              disabled={status === 'running'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              {status === 'running' ? 'Job Running...' : 'Start Lead Generation'}
            </button>
            
            {status === 'completed' && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-start gap-3 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">Job Completed</h4>
                  <p className="text-sm opacity-90 mt-1">You can now download the extracted files.</p>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => handleDownload('xlsx')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-md text-sm font-medium flex items-center gap-1 transition-colors">
                      <Download className="w-4 h-4" /> Excel (.xlsx)
                    </button>
                    <button onClick={() => handleDownload('csv')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-md text-sm font-medium flex items-center gap-1 transition-colors">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => handleDownload('json')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-md text-sm font-medium flex items-center gap-1 transition-colors">
                      <Download className="w-4 h-4" /> JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {status === 'failed' && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-200">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium">Job Failed</h4>
                  <p className="text-sm opacity-90 mt-1">Please check the logs for more information.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Logs Terminal */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <h3 className="text-slate-200 font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Execution Logs
              </h3>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Terminal</span>
            </div>
            <div className="p-4 font-mono text-sm overflow-y-auto flex-1 text-slate-300 space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">No logs yet...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${log.toLowerCase().includes('error') ? 'text-red-400' : ''}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
