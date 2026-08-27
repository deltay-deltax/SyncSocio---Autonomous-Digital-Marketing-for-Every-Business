import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, HelpCircle, MessageSquare, Reply, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/support/admin/tickets`;

interface Message {
  _id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string;
  createdAt: string;
  attachments?: string[];
}

interface Ticket {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ticketsArray = Array.isArray(data) ? data : (data.tickets || []);
      setTickets(ticketsArray);
    } catch (err: any) {
      console.error('Error fetching tickets', err);
      setError(err.message || 'Error fetching tickets');
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API}/${ticketId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(tickets.map(t => t._id === ticketId ? { ...t, status: status as any } : t));
      if (activeTicket?._id === ticketId) {
        setActiveTicket({ ...activeTicket, status: status as any });
      }
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.post(`${API}/${activeTicket._id}/messages`, {
        content: replyMessage,
        sender: 'admin'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setActiveTicket(data);
      setTickets(tickets.map(t => t._id === data._id ? data : t));
      setReplyMessage('');

      if (activeTicket.status === 'open') {
        handleUpdateStatus(activeTicket._id, 'in_progress');
      }

    } catch (err) {
      console.error('Error sending reply', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const searchLower = search.toLowerCase();
    return (t.subject?.toLowerCase() || '').includes(searchLower) ||
           (t.user?.email?.toLowerCase() || '').includes(searchLower) ||
           (t.user?.name?.toLowerCase() || '').includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            Support Tickets
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage user support requests and AI escalations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Ticket List Sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
            {error ? (
              <div className="p-4 text-center text-sm text-red-500">Error: {error}</div>
            ) : loading ? (
              <div className="p-4 text-center text-sm text-slate-400">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket._id}
                  onClick={() => setActiveTicket(ticket)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    activeTicket?._id === ticket._id 
                      ? 'bg-indigo-50 border-indigo-200 border shadow-sm' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-slate-900 truncate pr-2">{ticket.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]} capitalize whitespace-nowrap`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mb-1">
                    {ticket.user?.email || 'Unknown User'}
                  </div>
                  <div className="flex justify-between items-center text-[10px] mt-2">
                    <span className={`capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority} Priority
                    </span>
                    <span className="text-slate-400">
                      {format(new Date(ticket.updatedAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* View / Reply Area */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          {activeTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{activeTicket.subject}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {activeTicket.user?.name || activeTicket.user?.email}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created: {format(new Date(activeTicket.createdAt), 'MMM d, yyyy')}</span>
                    <span className={`capitalize ${PRIORITY_COLORS[activeTicket.priority]}`}>{activeTicket.priority} Priority</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleUpdateStatus(activeTicket._id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border focus:outline-none ${STATUS_COLORS[activeTicket.status]} bg-transparent`}
                  >
                    <option value="open" className="bg-white text-slate-900">Open</option>
                    <option value="in_progress" className="bg-white text-slate-900">In Progress</option>
                    <option value="resolved" className="bg-white text-slate-900">Resolved</option>
                    <option value="closed" className="bg-white text-slate-900">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {activeTicket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-4 ${
                      msg.sender === 'admin'
                        ? 'bg-primary/20 text-slate-900 border border-primary/30 rounded-tr-sm'
                        : msg.sender === 'ai'
                          ? 'bg-blue-500/10 text-slate-900 border border-blue-500/20 rounded-tl-sm'
                          : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-sm'
                    }`}>
                      <div className="text-[10px] text-slate-500 mb-2 font-medium flex justify-between items-center gap-4">
                        <span className="capitalize">{msg.sender === 'ai' ? 'AI Agent' : msg.sender === 'admin' ? 'You (Admin)' : 'User'}</span>
                        <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      </div>
                      
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded overflow-hidden border">
                              {url.match(/\.(mp4|mov|avi)$/i) ? (
                                <video src={url} className="w-full h-full object-cover" />
                              ) : (
                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                              )}
                            </a>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <form onSubmit={handleReply} className="flex gap-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to the user..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none h-12"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Reply className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a ticket to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
