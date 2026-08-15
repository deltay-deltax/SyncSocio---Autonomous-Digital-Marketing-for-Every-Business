import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SiteChatbotProps {
  hideWhatsApp?: boolean;
}

export const SiteChatbot = ({ hideWhatsApp }: SiteChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('nexa_chat_history');
      const timestamp = localStorage.getItem('nexa_chat_timestamp');
      
      // If we have saved history and it's less than 24 hours old (86400000 ms)
      if (saved && timestamp && (Date.now() - parseInt(timestamp, 10) < 86400000)) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse chat history', e);
    }
    
    // Default initial state
    return [
      { role: 'assistant', content: 'Hi there! 👋 I am Nexa, your SyncSocio AI assistant. How can I help you today?' }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('nexa_chat_history', JSON.stringify(messages));
    localStorage.setItem('nexa_chat_timestamp', Date.now().toString());
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      // Use the KB-powered dashboard endpoint when inside the dashboard, landing page uses the general one
      const chatEndpoint = hideWhatsApp ? `${baseUrl}/site/dashboard-chatbot` : `${baseUrl}/site/chatbot`;
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages.filter(m => m.role !== 'assistant' || m.content !== 'Hi there! 👋 I am Nexa, your SyncSocio AI assistant. How can I help you today?')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      let reply = data.reply;
      let shouldEscalate = false;
      
      if (reply.includes('[ESCALATE]')) {
        reply = reply.replace('[ESCALATE]', '').trim();
        shouldEscalate = true;
      }
      
      setMessages(prev => {
        const updated = [...prev, { role: 'assistant', content: reply }];
        if (shouldEscalate) {
          const transcript = updated.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
          setTimeout(() => handleEscalate(transcript), 100);
        }
        return updated;
      });
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! Something went wrong. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async (providedTranscript?: string | React.MouseEvent) => {
    try {
      setIsLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
      const transcriptStr = typeof providedTranscript === 'string' ? providedTranscript : messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subject: 'Escalated from AI Support Agent',
          message: transcriptStr
        })
      });

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: "I've created a support ticket for you! A human agent will review our chat and get back to you shortly." }]);
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I failed to create a ticket automatically. Please go to the Help & Support page to create one manually.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {!isOpen && !hideWhatsApp && (
          <a
            href="https://wa.me/918971742263?text=hii"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 bg-[#25D366] text-white"
            title="Chat on WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
        )}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 ${
            isOpen ? 'bg-secondary text-secondary-foreground' : 'gradient-bg text-white'
          }`}
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 sm:w-[350px] h-[500px] max-h-[calc(100vh-120px)] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="gradient-bg p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Nexa</h3>
                  <p className="text-xs text-white/80">Ask me anything!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEscalate()} 
                  disabled={isLoading || messages.length < 2}
                  className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                  title="Escalate to Human"
                >
                  Create Ticket
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-primary text-primary-foreground'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-card border border-border/50 text-card-foreground rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[80%] flex-row">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl text-sm bg-card border border-border/50 text-card-foreground rounded-tl-sm shadow-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-card border-t border-border">
              <div className="relative flex items-center">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full bg-muted/50 border-0 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary resize-none h-[44px] max-h-[120px]"
                  rows={1}
                />
                <Button 
                  size="icon"
                  className="absolute right-1.5 h-8 w-8 rounded-lg"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
