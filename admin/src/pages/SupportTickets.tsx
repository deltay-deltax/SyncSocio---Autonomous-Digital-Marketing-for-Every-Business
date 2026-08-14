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
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets', err);
    } finally {
      setLoading(false);
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

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.user?.email.toLowerCase().includes(search.toLowerCase()) ||
    t.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Support Tickets
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage user support requests and AI escalations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Ticket List Sidebar */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-sm text-zinc-500">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
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
                      ? 'bg-zinc-800 border-zinc-700 border' 
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-white truncate pr-2">{ticket.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]} capitalize whitespace-nowrap`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate mb-1">
                    {ticket.user?.email || 'Unknown User'}
                  </div>
                  <div className="flex justify-between items-center text-[10px] mt-2">
                    <span className={`capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority} Priority
                    </span>
                    <span className="text-zinc-500">
                      {format(new Date(ticket.updatedAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* View / Reply Area */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          {activeTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeTicket.subject}</h2>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
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
                    <option value="open" className="bg-zinc-900 text-white">Open</option>
                    <option value="in_progress" className="bg-zinc-900 text-white">In Progress</option>
                    <option value="resolved" className="bg-zinc-900 text-white">Resolved</option>
                    <option value="closed" className="bg-zinc-900 text-white">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {activeTicket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-4 ${
                      msg.sender === 'admin'
                        ? 'bg-primary/20 text-white border border-primary/30 rounded-tr-sm'
                        : msg.sender === 'ai'
                          ? 'bg-blue-500/10 text-white border border-blue-500/20 rounded-tl-sm'
                          : 'bg-zinc-800 text-white rounded-tl-sm'
                    }`}>
                      <div className="text-[10px] text-zinc-400 mb-2 font-medium flex justify-between items-center gap-4">
                        <span className="capitalize">{msg.sender === 'ai' ? 'AI Agent' : msg.sender === 'admin' ? 'You (Admin)' : 'User'}</span>
                        <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                <form onSubmit={handleReply} className="flex gap-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to the user..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 resize-none h-12"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Reply className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a ticket to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
