import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, Plus, Send, X, ArrowRight, CheckCircle2, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  _id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const Support = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    fetchTickets();
    // Poll every 15 seconds so admin replies appear automatically
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTicket && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/support/tickets`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        // Keep activeTicket in sync so admin replies appear in real-time
        setActiveTicket(prev => {
          if (!prev) return prev;
          const updated = data.find((t: any) => t._id === prev._id);
          return updated || prev;
        });
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: newTicketSubject,
          message: newTicketMessage,
        }),
      });

      if (res.ok) {
        const newTicket = await res.json();
        setTickets([newTicket, ...tickets]);
        setIsCreating(false);
        setNewTicketSubject('');
        setNewTicketMessage('');
        setActiveTicket(newTicket);
        toast({ title: 'Ticket created successfully' });
      } else {
        toast({ title: 'Failed to create ticket', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error creating ticket', variant: 'destructive' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;

    try {
      const res = await fetch(`${API_BASE}/support/tickets/${activeTicket._id}/messages`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          sender: 'user',
        }),
      });

      if (res.ok) {
        const updatedTicket = await res.json();
        setActiveTicket(updatedTicket);
        setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
        setNewMessage('');
      } else {
        toast({ title: 'Failed to send message', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error sending message', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'closed': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 pt-4">
      {/* Header */}
      <div className="mb-6 border-b border-border/40 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Help & Support
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your support tickets or get help from our AI agent.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2 rounded-full">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Ticket List Sidebar & Premium Support */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-border/40 bg-muted/20">
              <h3 className="font-semibold">Your Tickets</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" /> Loading tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tickets found</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    onClick={() => { setActiveTicket(ticket); setIsCreating(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      activeTicket?._id === ticket._id 
                        ? 'bg-primary/10 border-primary/30 border' 
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm truncate pr-2">{ticket.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)} capitalize whitespace-nowrap`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {ticket.messages[ticket.messages.length - 1]?.content || 'No messages'}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(ticket.updatedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Tier 3 Premium Support Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-5 flex flex-col shrink-0">
            <h3 className="font-bold text-sm mb-1.5 flex items-center gap-2 text-foreground">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Premium Support
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Are you an enterprise or agency user? Get priority 1-on-1 support and setup assistance.
            </p>
            <Button 
              variant="outline" 
              className="w-full text-xs font-medium border-amber-500/30 hover:bg-amber-500/10" 
              onClick={() => window.open('mailto:support@syncsocio.com?subject=Premium%20Support%20Call%20Request', '_blank')}
            >
              Book a Call
            </Button>
          </div>
        </div>

        {/* Chat / View Area */}
        <div className="md:col-span-2 bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col relative">
          {isCreating ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Create New Support Ticket</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleCreateTicket} className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <input
                    type="text"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    required
                  />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="Describe your problem in detail..."
                    className="w-full flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2">
                    Submit Ticket <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : activeTicket ? (
            <div className="flex flex-col h-full">
              {/* Ticket Header */}
              <div className="p-4 border-b border-border/40 bg-muted/10 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base">{activeTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Ticket ID: {activeTicket._id.slice(-6).toUpperCase()}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(activeTicket.status)} capitalize`}>
                  {activeTicket.status.replace('_', ' ')}
                </span>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {activeTicket.messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : msg.sender === 'admin'
                          ? 'bg-blue-500/10 text-foreground border border-blue-500/20 rounded-tl-sm'
                          : 'bg-muted/50 text-foreground rounded-tl-sm'
                    }`}>
                      <div className="text-[10px] opacity-70 mb-1 font-medium capitalize">
                        {msg.sender === 'ai' ? 'SyncSoci AI Support' : msg.sender === 'admin' ? 'Support Team' : 'You'}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-[10px] opacity-50 mt-2 text-right">
                        {format(new Date(msg.createdAt), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' ? (
                <div className="p-4 border-t border-border/40 bg-background/50">
                  <form onSubmit={handleSendMessage} className="relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full bg-muted/50 border border-border/50 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="p-4 border-t border-border/40 bg-background/50 text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    This ticket has been resolved or closed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">How can we help you?</h3>
              <p className="text-sm max-w-md mx-auto mb-6">
                Select a ticket from the sidebar to view the conversation, or create a new ticket if you need assistance.
              </p>
              <Button onClick={() => setIsCreating(true)} variant="outline" className="rounded-full">
                Create New Ticket
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
