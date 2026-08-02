import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Send, Image as ImageIcon, Plus, X, Phone, MoreHorizontal, Smile, Paperclip, Mic, ExternalLink, Type, Link, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/errorHandler';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

const CATEGORIES = [
  { id: 'MARKETING', label: 'Marketing' },
  { id: 'UTILITY', label: 'Utility' },
  { id: 'AUTHENTICATION', label: 'Authentication' }
];

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'mr', label: 'Marathi' },
  { id: 'gu', label: 'Gujarati' }
];

interface WhatsAppTemplatesProps {
  onBack?: () => void;
  initialTemplate?: any;
  onDraftSaved?: (savedTemplate: any) => void;
  onDeleted?: (deletedId: string) => void;
}

const WhatsAppTemplates: React.FC<WhatsAppTemplatesProps> = ({ onBack, initialTemplate, onDraftSaved, onDeleted }) => {
  const { toast } = useToast();
  const [profile] = useState<any>(() => {
    const stored = localStorage.getItem('syncsocio_profile');
    return stored ? JSON.parse(stored) : {};
  });
  const brandName = profile?.brandName || 'Your Brand';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [template, setTemplate] = useState(initialTemplate || {
    templateName: '',
    category: 'MARKETING',
    language: 'en',
    headerType: 'NONE' as 'NONE' | 'TEXT' | 'IMAGE',
    headerContent: '',
    bodyContent: 'Hello {{1}},\n\nWelcome to our store! We have an amazing offer for you: {{2}}.\n\nHere are some of the benefits of shopping with us:\n- High quality products\n- Fast shipping\n- 24/7 customer support\n\nDon\'t miss out on this limited time offer!\n\nBest regards,\nYour Brand Team',
    footerContent: 'Reply STOP to unsubscribe',
    buttons: [] as TemplateButton[]
  });

  const handleAddButton = (type: ButtonType) => {
    if (template.buttons.length >= 3) {
      toast({ title: 'Maximum 3 buttons allowed', variant: 'destructive' });
      return;
    }
    const newButton: TemplateButton = { type, text: type === 'QUICK_REPLY' ? 'Interested' : 'Click Here' };
    if (type === 'URL') newButton.url = 'https://';
    if (type === 'PHONE_NUMBER') newButton.phoneNumber = '+91';
    
    setTemplate(prev => ({ ...prev, buttons: [...prev.buttons, newButton] }));
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const newBtns = [...template.buttons];
    newBtns[index] = { ...newBtns[index], ...updates };
    setTemplate(prev => ({ ...prev, buttons: newBtns }));
  };

  const removeButton = (index: number) => {
    setTemplate(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }));
  };

  const submitTemplate = async (status: 'DRAFT' | 'PENDING') => {
    if (!template.templateName || !template.bodyContent) {
      toast({ title: 'Template Name and Body are required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = template._id ? 'PUT' : 'POST';
      const url = template._id 
        ? `${API_BASE}/campaigns/request-template/${template._id}`
        : `${API_BASE}/campaigns/request-template`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...template, status })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}...`);
      }

      if (!res.ok) throw new Error(data.message || 'Failed to submit template');
      
      if (status === 'DRAFT') {
        toast({ title: 'Draft Saved! 💾', description: 'Your progress has been saved.' });
        // Update local state with the returned _id so subsequent saves update the same draft
        if (!template._id && data.data && data.data._id) {
          setTemplate(prev => ({ ...prev, _id: data.data._id }));
        }
        // Notify parent to refresh template list
        if (onDraftSaved && data.data) {
          onDraftSaved(data.data);
        }
      } else {
        toast({ title: 'Template request submitted! 🎉', description: 'Your template has been sent for approval.' });
        if (onBack) onBack();
      }
    } catch (err) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestApproval = () => submitTemplate('PENDING');
  const handleSaveDraft = () => submitTemplate('DRAFT');

  const handleDelete = async () => {
    if (!template._id) return;
    const confirmed = window.confirm('Are you sure you want to delete this template? This cannot be undone.');
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/campaigns/request-template/${template._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!res.ok) throw new Error(data.message || 'Failed to delete template');
      toast({ title: 'Template Deleted 🗑️', description: 'The template has been removed.' });
      if (onDeleted && template._id) onDeleted(template._id);
      if (onBack) onBack();
    } catch (err) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    }
  };

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Parse body content to replace {{1}}, {{2}} with generic placeholders for preview
  const previewBody = template.bodyContent
    .replace(/\{\{1\}\}/g, '[Name]')
    .replace(/\{\{2\}\}/g, '[Offer/Details]')
    .replace(/\{\{3\}\}/g, '[Value]');

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
              WhatsApp Template Builder
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Design your custom template and request Meta approval.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {template._id && (
              <Button onClick={handleDelete} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400">
                <Trash2 size={14} /> Delete
              </Button>
            )}
            <Button onClick={handleSaveDraft} disabled={isSubmitting} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold">
              <Save size={14} /> Save Draft
            </Button>
            <Button onClick={handleRequestApproval} disabled={isSubmitting} size="sm" className="rounded-xl gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-transparent">
              {isSubmitting ? <span className="animate-spin text-lg leading-none">⌛</span> : <Send size={14} />}
              Request Approval
            </Button>
          </div>
          <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Note: Meta takes 2-3 business days to approve new templates.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden px-2 pb-6">
        
        {/* LEFT PANE - EDITOR */}
        <div className="lg:col-span-7 bg-card rounded-[24px] border border-border/60 shadow-elegant overflow-y-auto custom-scrollbar p-6 space-y-6 relative">
          
          {/* Basics */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Template Name</label>
              <Input 
                value={template.templateName} 
                onChange={(e) => setTemplate({ ...template, templateName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} 
                placeholder="e.g. summer_sale_promo" 
                className="bg-muted/30 border-border/50 h-10 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase letters, numbers, and underscores only.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Category</label>
                <select 
                  value={template.category} 
                  onChange={(e) => setTemplate({ ...template, category: e.target.value })}
                  className="w-full bg-muted/30 border border-border/50 rounded-xl h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Language</label>
                <select 
                  value={template.language} 
                  onChange={(e) => setTemplate({ ...template, language: e.target.value })}
                  className="w-full bg-muted/30 border border-border/50 rounded-xl h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-border/40" />

          {/* Header */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">Header (Optional)</label>
            <div className="flex gap-2 mb-3">
              {(['NONE', 'TEXT', 'IMAGE'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTemplate({ ...template, headerType: type, headerContent: '' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    template.headerType === type 
                      ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {type === 'NONE' ? 'None' : type === 'TEXT' ? 'Text' : 'Image'}
                </button>
              ))}
            </div>
            {template.headerType === 'TEXT' && (
              <Input 
                value={template.headerContent} 
                onChange={(e) => setTemplate({ ...template, headerContent: e.target.value })} 
                placeholder="Enter header text..." 
                maxLength={60}
                className="bg-muted/30 border-border/50 h-10 rounded-xl"
              />
            )}
            {template.headerType === 'IMAGE' && (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center bg-muted/20">
                <ImageIcon size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-[11px] text-muted-foreground font-medium">Image will be selected during campaign creation.</p>
              </div>
            )}
          </div>

          {/* Body */}
          <div>
             <div className="flex items-center justify-between mb-1.5">
               <label className="text-xs font-bold text-muted-foreground block">Message Body</label>
               <span className="text-[10px] text-muted-foreground">Use {'{{1}}'}, {'{{2}}'} for variables</span>
             </div>
             <Textarea 
               value={template.bodyContent} 
               onChange={(e) => setTemplate({ ...template, bodyContent: e.target.value })} 
               className="min-h-[160px] bg-muted/10 border-border/50 rounded-xl resize-none text-sm font-sans"
               placeholder="Write your template message here..."
             />
          </div>

          {/* Footer */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Footer (Optional)</label>
            <Input 
              value={template.footerContent} 
              onChange={(e) => setTemplate({ ...template, footerContent: e.target.value })} 
              placeholder="e.g. Reply STOP to unsubscribe" 
              maxLength={60}
              className="bg-muted/30 border-border/50 h-10 rounded-xl text-sm"
            />
          </div>

          <hr className="border-border/40" />

          {/* Buttons */}
          <div>
             <div className="flex items-center justify-between mb-3">
               <label className="text-xs font-bold text-muted-foreground block">Buttons (Max 3)</label>
               {template.buttons.length < 3 && (
                 <div className="flex gap-1.5">
                   <Button onClick={() => handleAddButton('QUICK_REPLY')} variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2 border-border/50 bg-muted/20"><Zap size={10} className="mr-1" /> Quick Reply</Button>
                   <Button onClick={() => handleAddButton('URL')} variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2 border-border/50 bg-muted/20"><Link size={10} className="mr-1" /> Link</Button>
                 </div>
               )}
             </div>

             <div className="space-y-3">
               {template.buttons.map((btn, idx) => (
                 <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 rounded-xl bg-muted/10 relative group">
                   <button onClick={() => removeButton(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition">
                     <X size={14} />
                   </button>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-0.5 bg-muted rounded-md tracking-wider">
                       {btn.type.replace('_', ' ')}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <Input 
                       value={btn.text} 
                       onChange={(e) => updateButton(idx, { text: e.target.value })} 
                       placeholder="Button Text" 
                       maxLength={20}
                       className="bg-white/50 border-border/50 h-8 text-xs rounded-lg"
                     />
                     {btn.type === 'URL' && (
                       <Input 
                         value={btn.url} 
                         onChange={(e) => updateButton(idx, { url: e.target.value })} 
                         placeholder="https://..." 
                         className="bg-white/50 border-border/50 h-8 text-xs rounded-lg"
                       />
                     )}
                     {btn.type === 'PHONE_NUMBER' && (
                       <Input 
                         value={btn.phoneNumber} 
                         onChange={(e) => updateButton(idx, { phoneNumber: e.target.value })} 
                         placeholder="+91..." 
                         className="bg-white/50 border-border/50 h-8 text-xs rounded-lg"
                       />
                     )}
                   </div>
                 </div>
               ))}
               {template.buttons.length === 0 && (
                 <div className="text-center p-4 border border-dashed border-border/50 rounded-xl bg-muted/5 text-[11px] text-muted-foreground font-medium">
                   No buttons added. Add up to 3 buttons to increase engagement.
                 </div>
               )}
             </div>
          </div>
          
          <div className="h-10"></div> {/* Bottom padding */}
        </div>

        {/* RIGHT PANE - PREVIEW */}
        <div className="lg:col-span-5 h-full flex flex-col items-center justify-center p-4 bg-muted/20 rounded-[24px] border border-border/40 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/30 pointer-events-none" />
           
           {/* WhatsApp iPhone Mockup */}
           <div className="rounded-[40px] overflow-hidden border-[8px] border-[#1f2022] shadow-2xl w-full max-w-[320px] bg-[#e5ddd5] relative ring-1 ring-black/10 z-10 shrink-0 transform scale-[0.9] sm:scale-100 origin-center">
              
              {/* iOS Status Bar */}
              <div className="bg-white px-5 pt-3 pb-1 flex justify-between items-center text-[10px] font-semibold text-black relative z-10">
                <span>9:41</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[85px] h-[24px] bg-black rounded-full z-20"></div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 9V6H2.5V9H1ZM4 9V4.5H5.5V9H4ZM7 9V2.5H8.5V9H7ZM10 9V0H11.5V9H10Z" fill="black"/></svg>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="1.5" width="14" height="7" rx="2" stroke="black"/><rect x="2" y="3" width="11" height="4" rx="1" fill="black"/><path d="M15.5 4C16.3284 4 17 4.67157 17 5.5C17 6.32843 16.3284 7 15.5 7V4Z" fill="black"/></svg>
                </div>
              </div>

              {/* WhatsApp Header */}
              <div className="bg-white text-black px-3 py-2 border-b border-gray-200 flex items-center gap-3 relative z-10">
                <ArrowLeft size={18} className="text-[#007AFF]" />
                <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-tight truncate">{brandName}</p>
                  <p className="text-[11px] text-gray-500">Business Account</p>
                </div>
                <Phone size={18} className="text-[#007AFF] shrink-0" />
              </div>

              {/* Chat Body */}
              <div 
                className="p-3 min-h-[480px] space-y-2 relative"
                style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
              >
                <div className="flex justify-center mb-4 mt-2">
                  <span className="bg-[#E4EAEB] text-gray-600 text-[10px] font-medium px-3 py-1 rounded-lg shadow-sm">
                    Today
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="mr-auto max-w-[88%] w-fit bg-white rounded-2xl rounded-tl-sm shadow-sm border border-black/5 flex flex-col">
                  {template.headerType === 'IMAGE' && (
                    <div className="w-full aspect-[16/10] bg-gray-200 flex items-center justify-center text-gray-400">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  
                  <div className="p-3.5 pb-2.5">
                    {template.headerType === 'TEXT' && template.headerContent && (
                      <h4 className="text-[13px] font-bold text-gray-900 leading-snug mb-1.5 whitespace-pre-wrap">
                        {template.headerContent}
                      </h4>
                    )}
                    
                    <pre className="text-[13px] text-[#111111] whitespace-pre-wrap font-sans leading-relaxed break-words max-w-full overflow-hidden">
                      {previewBody}
                    </pre>
                    
                    {template.footerContent && (
                      <p className="text-[10.5px] text-gray-400 font-medium mt-1.5 leading-tight">
                        {template.footerContent}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-gray-400">
                      {time}
                    </div>
                  </div>

                  {/* WhatsApp Native Buttons */}
                  {template.buttons.map((btn, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-t border-gray-100 text-[13px] font-bold text-[#007AFF] w-full"
                    >
                      {btn.type === 'URL' && <ExternalLink size={14} className="text-[#007AFF]" />}
                      {btn.type === 'PHONE_NUMBER' && <Phone size={14} className="text-[#007AFF]" />}
                      {btn.type === 'QUICK_REPLY' && <ArrowLeft size={14} className="text-[#007AFF] rotate-180" />}
                      <span className="truncate max-w-[80%]">{btn.text || 'Button'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* iOS WhatsApp Input Bar */}
              <div className="bg-[#F6F6F6] px-3 py-2 flex items-center gap-2 border-t border-gray-200 relative z-10">
                <Smile size={20} className="text-gray-500 shrink-0" />
                <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-[13px] text-gray-400 flex items-center justify-between">
                  <span>Message</span>
                  <Paperclip size={16} className="text-gray-400" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white shrink-0">
                  <Mic size={15} />
                </div>
              </div>

              {/* Home Indicator */}
              <div className="bg-[#F6F6F6] pb-2 pt-1 flex justify-center relative z-10">
                <div className="w-1/3 h-1.5 bg-black rounded-full opacity-80"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplates;
