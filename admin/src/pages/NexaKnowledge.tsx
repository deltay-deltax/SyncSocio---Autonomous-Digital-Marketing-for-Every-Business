import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, MessageSquare, X, Send } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

interface KnowledgeLead {
  _id: string;
  question: string;
  answer: string;
  status: 'pending' | 'answered' | 'ignored';
  askedAt: string;
  answeredAt: string | null;
}

export default function NexaKnowledge() {
  const [leads, setLeads] = useState<KnowledgeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API}/nexa/knowledge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLeads(res.data.leads);
      }
    } catch {
      console.error('Failed to fetch knowledge leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleAnswerSubmit = async (id: string) => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API}/nexa/knowledge/${id}/answer`, { answer: answerText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnsweringId(null);
      setAnswerText('');
      fetchLeads();
    } catch {
      alert('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
          Nexa Knowledge Base
        </h2>
        <p className="text-muted-foreground mt-1">
          Review questions Nexa couldn't answer. Answer them here to train the AI.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3 glass-card border border-transparent p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search questions..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-transparent rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-muted-foreground" size={18} />
            <h3 className="text-lg font-bold text-foreground">Unanswered Questions</h3>
            <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
              {leads.filter(l => l.status === 'pending').length} Pending
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr className="divide-x divide-border/50">
                <th className="px-6 py-4 font-semibold w-1/2">Question</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Loading questions...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-muted-foreground">
                      {search ? 'No questions match your search.' : 'No pending questions.'}
                    </p>
                  </td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-muted/10 transition-colors divide-x divide-border/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{lead.question}</p>
                    {lead.status === 'answered' && (
                      <div className="mt-2 text-xs bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-emerald-400">
                        <strong className="text-emerald-500">Answered:</strong> {lead.answer}
                      </div>
                    )}
                    {answeringId === lead._id && (
                      <div className="mt-3 flex gap-2">
                        <textarea
                          className="flex-1 bg-background border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="Type your answer to teach Nexa..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleAnswerSubmit(lead._id)}
                            disabled={submitting}
                            className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors disabled:opacity-50"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => { setAnsweringId(null); setAnswerText(''); }}
                            className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`capitalize px-2.5 py-1 text-xs rounded-full font-medium ${
                      lead.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {new Date(lead.askedAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.askedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {lead.status === 'pending' && answeringId !== lead._id && (
                      <button
                        onClick={() => { setAnsweringId(lead._id); setAnswerText(''); }}
                        className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-md transition-colors text-xs font-medium"
                      >
                        Answer
                      </button>
                    )}
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
