import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCheck, Send, X, RefreshCw, Wand2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { COUNTRY_CODES } from '../../lib/campaignConstants';
import { ArrowLeft, Heart, Phone, MoreHorizontal, ExternalLink, Smile, Paperclip, Mic, FileSpreadsheet } from 'lucide-react';
import { WHATSAPP_TEMPLATE_BODIES, WHATSAPP_BUTTON_LABELS } from '../../lib/campaignConstants';

const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
const NODE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

// Re-define the props interface
export interface CampaignResultsProps {
  profile: any;
  mode: 'whatsapp' | 'email';
  brandName: string;
  image: string;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  recipients: string[];
  setRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  newRecipient: string;
  setNewRecipient: (v: string) => void;
  whatsappCountryCode: string;
  setWhatsappCountryCode: (v: string) => void;
  addRecipient: () => void;
  recipientsFileRef: any;
  handleRecipientsFile: (e: any) => void;
  sendStatus: string;
  sendCampaign: () => void;
  back: () => void;
  regenerate?: () => void;
  saveHeroImage?: () => void;
  isHeroImageSaved?: boolean;
  savedLists?: any[];
  setSavedLists?: any;
  selectedListId?: string;
  setSelectedListId?: any;
  showListNameModal?: boolean;
  setShowListNameModal?: any;
  listNameInput?: string;
  setListNameInput?: any;
  handleSaveImportedList?: () => void;
  whatsappTemplateName?: string;
  whatsappTemplates?: any[];
}

export const CampaignResults: React.FC<CampaignResultsProps> = ({
  profile, mode, brandName, image, subject, setSubject, body, setBody,
  recipients, setRecipients, newRecipient, setNewRecipient, whatsappCountryCode, setWhatsappCountryCode, addRecipient,
  recipientsFileRef, handleRecipientsFile, sendStatus, sendCampaign, back, regenerate, saveHeroImage, isHeroImageSaved,
  savedLists, setSavedLists, selectedListId, setSelectedListId,
  showListNameModal, setShowListNameModal, listNameInput, setListNameInput, handleSaveImportedList,
  whatsappTemplateName,
  whatsappTemplates = [],
}) => {
  const isWA = mode === 'whatsapp';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { toast } = useToast();

  // ── Email Quota State ──────────────────────────────────────────────────────
  const [emailQuota, setEmailQuota] = useState<{ used: number; limit: number; remaining: number; resetAt: string } | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'email') return;
    const fetchQuota = async () => {
      setQuotaLoading(true);
      try {
        
        const res = await fetch(`${NODE_BASE}/campaigns/email-quota`, { credentials: 'include',
          headers: {  }
        });
        if (res.ok) {
          const _rawJson30a = await res.json();
            const data = _rawJson30a && _rawJson30a.success !== undefined ? (_rawJson30a.success ? _rawJson30a.data : _rawJson30a) : _rawJson30a;
          setEmailQuota(data);
        }
      } catch (e) {
        console.error('[EmailQuota] Failed to fetch quota', e);
      } finally {
        setQuotaLoading(false);
      }
    };
    fetchQuota();
  }, [mode]);
  // ──────────────────────────────────────────────────────────────────────────

  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    const profile = JSON.parse(localStorage.getItem('syncsocio_profile') || '{}');
    const userId = profile.user || profile._id;
    if (!userId) {
      toast({ title: "User session not found", variant: "destructive" });
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch(`${AI_BASE}/refine-campaign-copy`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          body,
          instruction: refineInstruction,
          layout: mode
        })
      });
      const _rawJson29a = await res.json();
        const data = _rawJson29a && _rawJson29a.success !== undefined ? (_rawJson29a.success ? _rawJson29a.data : _rawJson29a) : _rawJson29a;
      if (data.status === 'success') {
        setSubject(data.data.subject);
        setBody(data.data.body);
        setShowRefineModal(false);
        setRefineInstruction('');
        toast({ title: "Copy refined successfully! ✨" });
      } else {
        toast({ title: data.detail || "Failed to refine copy", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error refining copy", variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Quota bar helpers ──────────────────────────────────────────────────────
  const quotaPct = emailQuota && emailQuota.limit > 0 ? Math.min(100, Math.round((emailQuota.used / emailQuota.limit) * 100)) : 0;
  const quotaColor = quotaPct >= 100 ? '#ef4444' : quotaPct >= 80 ? '#f59e0b' : '#22c55e';
  const quotaLabel = emailQuota
    ? `${emailQuota.used.toLocaleString()} / ${emailQuota.limit.toLocaleString()} emails sent this month`
    : '';
  const quotaResetLabel = emailQuota
    ? `Resets ${new Date(emailQuota.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  const isQuotaFull = emailQuota ? emailQuota.remaining <= 0 : false;
  // ──────────────────────────────────────────────────────────────────────────

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.code.includes(countrySearchQuery)
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="max-w-6xl mx-auto pt-8 px-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={back} className="p-2 rounded-xl hover:bg-muted transition">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
              {isWA ? 'WhatsApp campaign ready' : 'Email campaign ready'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Preview it, add recipients & send the blast 🚀</p>
          </div>
        </div>
        <div className="flex gap-2">
          {saveHeroImage && (
            <Button
              onClick={saveHeroImage}
              disabled={isHeroImageSaved}
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl gap-2 transition",
                isHeroImageSaved
                  ? "text-rose-500 border-rose-500/20 bg-rose-500/10 cursor-not-allowed"
                  : "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
              )}
            >
              <Heart size={14} className={cn(isHeroImageSaved && "fill-rose-500")} />
              {isHeroImageSaved
                ? (mode === 'email' ? 'Draft Saved' : 'Saved')
                : (mode === 'email' ? 'Save as Draft' : 'Save hero image')}
            </Button>
          )}
          <Button onClick={() => setShowRefineModal(true)} variant="outline" size="sm" className="rounded-xl gap-2">
            <RefreshCw size={14} /> Regenerate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PREVIEW */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Live preview</p>
          {isWA ? (
            /* WhatsApp iPhone Mockup */
            <div className="rounded-[40px] overflow-hidden border-[8px] border-[#1f2022] shadow-2xl max-w-[320px] mx-auto bg-[#e5ddd5] relative ring-1 ring-black/10">
              {/* iPhone Status Bar & Dynamic Island */}
              <div className="bg-white px-5 pt-3 pb-1 flex justify-between items-center text-[10px] font-semibold text-black relative z-10">
                <span>9:41</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[85px] h-[24px] bg-black rounded-full z-20"></div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 9V6H2.5V9H1ZM4 9V4.5H5.5V9H4ZM7 9V2.5H8.5V9H7ZM10 9V0H11.5V9H10Z" fill="black" />
                  </svg>
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="1.5" width="14" height="7" rx="2" stroke="black" />
                    <rect x="2" y="3" width="11" height="4" rx="1" fill="black" />
                    <path d="M15.5 4C16.3284 4 17 4.67157 17 5.5C17 6.32843 16.3284 7 15.5 7V4Z" fill="black" />
                  </svg>
                </div>
              </div>

              {/* WhatsApp iOS Header */}
              <div className="bg-white text-black px-3 py-2 border-b border-gray-200 flex items-center gap-3">
                <ArrowLeft size={18} className="text-[#007AFF]" />
                <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-sm font-bold text-white">
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold leading-tight">{brandName}</p>
                  <p className="text-[11px] text-gray-500">online</p>
                </div>
                <Phone size={18} className="text-[#007AFF]" />
                <MoreHorizontal size={18} className="text-[#007AFF]" />
              </div>

              {/* Chat Body */}
              <div
                className="p-3 min-h-[550px] space-y-2 relative"
                style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
              >
                {/* Date Badge */}
                <div className="flex justify-center mb-4 mt-2">
                  <span className="bg-[#E4EAEB] text-gray-600 text-[10px] font-medium px-3 py-1 rounded-lg">
                    Today
                  </span>
                </div>

                {/* Left-Aligned Message Bubble */}
                <div className="mr-auto max-w-[85%] bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-black/5 flex flex-col">
                  {image && (
                    <img src={image} className="w-full object-cover aspect-[16/10]" />
                  )}
                  <div className="p-3.5 pb-2.5">
                    {/* Show the REAL template text with variables filled in */}
                    {(() => {
                      let tplBody = WHATSAPP_TEMPLATE_BODIES[whatsappTemplateName || ''];
                      let buttonLabel = WHATSAPP_BUTTON_LABELS[whatsappTemplateName || ''] || `${brandName.toLowerCase()} now`;

                      // Use dynamic template data if available
                      const dynamicTemplate = whatsappTemplates.find((t: any) => t.name === whatsappTemplateName);
                      if (dynamicTemplate && dynamicTemplate.components) {
                        const bodyComponent = dynamicTemplate.components.find((c: any) => c.type === 'BODY');
                        if (bodyComponent && bodyComponent.text) {
                          tplBody = bodyComponent.text;
                        }
                        const buttonComponent = dynamicTemplate.components.find((c: any) => c.type === 'BUTTONS');
                        if (buttonComponent && buttonComponent.buttons && buttonComponent.buttons.length > 0) {
                          buttonLabel = buttonComponent.buttons[0].text;
                        }
                      }

                      // The backend already perfectly maps all variables into `body` (which is mapData.filledText)
                      let filled = body || `${subject}\n\n${body}`;
                      // Clean up empty lines from unused variables
                      filled = filled.replace(/\n{3,}/g, '\n\n').trim();
                      // Render bold *text* as <strong>
                      const parts = filled.split(/(\*[^*]+\*)/g);
                      return (
                        <>
                          <pre className="text-[12px] text-[#111111] whitespace-pre-wrap font-sans leading-relaxed mb-2.5">
                            {parts.map((part: string, i: number) =>
                              part.startsWith('*') && part.endsWith('*')
                                ? <strong key={i}>{part.slice(1, -1)}</strong>
                                : part
                            )}
                          </pre>
                          <p className="text-[10px] text-gray-400 font-medium">
                            T&C apply. Reply STOP to unsubscribe.
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-400">
                            {time}
                          </div>
                          <a
                            href="#"
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-t border-gray-100 text-[12px] font-bold text-[#007AFF] hover:bg-gray-50 active:bg-gray-100 transition-colors w-full"
                            onClick={(e) => e.preventDefault()}
                          >
                            <ExternalLink size={12} className="text-[#007AFF]" />
                            <span>{buttonLabel}</span>
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* iOS WhatsApp Input Bar */}
                <div className="bg-[#F6F6F6] px-3 py-2 flex items-center gap-2 border-t border-gray-200">
                  <Smile size={20} className="text-gray-500" />
                  <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-[13px] text-gray-400 flex items-center justify-between">
                    <span>Message</span>
                    <div className="flex items-center gap-2">
                      <Paperclip size={16} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white shrink-0">
                    <Mic size={15} />
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="bg-[#F6F6F6] pb-2 pt-1 flex justify-center">
                  <div className="w-1/3 h-1 bg-black rounded-full opacity-80"></div>
                </div>
              </div>
            </div>
          ) : (
            /* Email mockup */
            <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
              <div className="bg-muted/60 px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Inbox · 1 new</span>
              </div>
              <div className="p-5 space-y-4 min-h-[420px]">
                <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {brandName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{brandName}</p>
                    <textarea
                      className="text-[11px] text-muted-foreground bg-transparent border border-transparent hover:border-border focus:border-border outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -ml-1 w-full max-w-[280px] transition-all resize-none"
                      value={subject || ''}
                      onChange={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        setSubject(e.target.value);
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder="✨ New drop just landed (Email Subject)"
                      title="Click to edit email subject"
                      rows={1}
                      style={{ minHeight: '20px', overflow: 'hidden' }}
                    />
                  </div>
                </div>
                {image && (
                  <img src={image} className="w-full rounded-xl object-cover aspect-video" />
                )}
                {body.includes('<') && (body.includes('</') || body.includes('/>')) ? (
                  <div
                    className="text-xs text-foreground leading-relaxed email-html-preview outline-none focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setBody(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: body }}
                    title="Click to edit email body"
                  />
                ) : (
                  <pre
                    className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 rounded-xl transition-all p-2"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setBody(e.currentTarget.innerText)}
                    title="Click to edit email body"
                  >
                    {body}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* EDITOR + RECIPIENTS */}
        <div className="space-y-4">
          {/* Edit body */}
          {isWA && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Edit message
              </p>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="WhatsApp Heading (e.g., Flat ₹100 OFF for you!)"
                className="rounded-xl border-border/60 bg-card h-10 text-sm mb-2"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[160px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed"
              />
            </div>
          )}

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Recipients ({recipients.length})
              </p>
              <button
                onClick={() => recipientsFileRef.current?.click()}
                className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <FileSpreadsheet size={11} /> Import CSV/TXT/Excel
              </button>
              <input
                ref={recipientsFileRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleRecipientsFile(e.target.files)}
              />
            </div>

            {/* Saved lists selection dropdown */}
            {(savedLists || []).length > 0 && (
              <div ref={dropdownRef} className="relative mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  type="button"
                  onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                  title={(() => {
                    const selectedList = (savedLists || []).find(x => x._id === selectedListId);
                    if (!selectedList) return '';
                    const contacts = mode === 'whatsapp' ? selectedList.phones : selectedList.emails;
                    return contacts?.join('\n') || '';
                  })()}
                  className="flex items-center justify-between w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-xs font-semibold hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary transition-all text-left"
                >
                  <div className="flex items-center truncate">
                    {(() => {
                      const selectedList = (savedLists || []).find(x => x._id === selectedListId);
                      if (selectedList) {
                        return (
                          <>
                            <Folder size={14} className="text-primary mr-2 shrink-0" />
                            <span className="truncate text-foreground font-black">{selectedList.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5 font-bold shrink-0">({(mode === 'whatsapp' ? selectedList.phones : selectedList.emails)?.length || 0} contacts)</span>
                          </>
                        );
                      }
                      return <span className="text-muted-foreground">-- Choose from saved recipient lists --</span>;
                    })()}
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
                      isListDropdownOpen && "transform rotate-180 text-foreground"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isListDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 mt-1 z-30 max-h-60 overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 space-y-0.5"
                    >
                      <div
                        onClick={() => {
                          setSelectedListId('');
                          setRecipients([]);
                          setIsListDropdownOpen(false);
                        }}
                        className={cn(
                          "flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          selectedListId === ''
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        -- Clear selection --
                      </div>

                      {(savedLists || []).map((list) => {
                        const isSelected = list._id === selectedListId;
                        const contacts = mode === 'whatsapp' ? list.phones : list.emails;
                        const safeContacts = contacts || [];
                        const contactsPreview = safeContacts.slice(0, 3).join(', ') + (safeContacts.length > 3 ? '...' : '');
                        return (
                          <div
                            key={list._id}
                            onClick={() => {
                              setSelectedListId(list._id);
                              setRecipients(safeContacts);
                              setIsListDropdownOpen(false);
                            }}
                            title={safeContacts.join('\n')}
                            className={cn(
                              "flex flex-col px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center min-w-0">
                                <Folder size={14} className={cn("mr-2 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                                <span className="truncate">{list.name}</span>
                              </div>
                              <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2", isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                {safeContacts.length} contacts
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 font-medium truncate ml-5 mt-1 max-w-[320px]">
                              {contactsPreview}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="flex gap-2 mb-2">
              {isWA && (
                <div ref={countryDropdownRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="rounded-xl border border-border/60 bg-card h-10 px-3 text-sm focus:outline-none text-foreground flex items-center gap-1.5 font-semibold hover:bg-muted/30 transition-all"
                  >
                    <span>{COUNTRY_CODES.find(c => c.code === whatsappCountryCode)?.flag || '🌐'}</span>
                    <span>{whatsappCountryCode}</span>
                    <ChevronDown size={12} className={cn("text-muted-foreground transition-transform", isCountryDropdownOpen && "transform rotate-180")} />
                  </button>

                  {isCountryDropdownOpen && (
                    <div className="absolute left-0 mt-1 z-[60] w-64 bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-2xl p-2 flex flex-col gap-2">
                      <Input
                        type="text"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        placeholder="Search country or code..."
                        className="h-8 rounded-lg text-xs bg-muted/30 border-border/50"
                        autoFocus
                      />
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((c) => (
                            <button
                              key={c.name + c.code}
                              type="button"
                              onClick={() => {
                                setWhatsappCountryCode(c.code);
                                setIsCountryDropdownOpen(false);
                                setCountrySearchQuery('');
                              }}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 hover:bg-muted rounded-xl text-xs font-semibold cursor-pointer w-full text-left transition-colors",
                                whatsappCountryCode === c.code ? "bg-primary/10 text-primary" : "text-foreground"
                              )}
                            >
                              <span className="text-sm shrink-0">{c.flag}</span>
                              <span className="flex-1 truncate text-left">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono font-bold shrink-0">{c.code}</span>
                            </button>
                          ))
                        ) : (
                          <div className="text-[10px] text-muted-foreground text-center py-4 font-semibold">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                placeholder={isWA ? '98765 43210' : 'email@example.com'}
                className="rounded-xl border-border/60 bg-card h-10 text-sm flex-1"
              />
              <Button onClick={addRecipient} variant="outline" className="rounded-xl h-10 shrink-0">Add</Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto border border-border/40 rounded-xl p-3 bg-muted/20 mb-3">
                {recipients.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border/20 text-xs font-medium">
                    {r}
                    <button onClick={() => setRecipients((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={10} className="text-muted-foreground hover:text-foreground cursor-pointer" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Email Quota Bar + Send button */}
          {(() => {
            const isEmailMode = mode === 'email';

            return (
              <>
                {/* ─── Email Quota Usage Bar ─── */}
                {isEmailMode && (
                  <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                        <span>📧</span> Monthly Email Usage
                      </span>
                      {quotaLoading ? (
                        <span className="text-[11px] text-muted-foreground animate-pulse">Loading…</span>
                      ) : emailQuota ? (
                        <span className="text-[11px] font-mono" style={{ color: quotaColor }}>
                          {emailQuota.remaining.toLocaleString()} remaining
                        </span>
                      ) : null}
                    </div>

                    {/* Progress bar */}
                    {emailQuota && (
                      <>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${quotaPct}%`, backgroundColor: quotaColor }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{quotaLabel}</span>
                          <span className="text-[10px] text-muted-foreground/70">{quotaResetLabel}</span>
                        </div>
                        {isQuotaFull && (
                          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
                            <span className="text-red-400 text-sm">🚫</span>
                            <p className="text-[11px] text-red-400 font-medium">
                              Monthly limit reached. Upgrade your plan or wait for next month's reset.
                            </p>
                          </div>
                        )}
                        {!isQuotaFull && recipients.length > 0 && recipients.length > (emailQuota?.remaining ?? Infinity) && (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                            <span className="text-amber-400 text-sm">⚠️</span>
                            <p className="text-[11px] text-amber-400 font-medium">
                              You have {emailQuota?.remaining} emails left but selected {recipients.length} recipients. Reduce your list to proceed.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isEmailMode && (profile?.use_generic_email_sender ? 'creatives@syncsocio.com' : profile?.email_from) && (
                  <p className="text-center text-[11px] text-muted-foreground font-medium">
                    📨 Sending from: <span className="font-mono text-foreground">{profile.use_generic_email_sender ? 'creatives@syncsocio.com' : profile.email_from}</span>
                  </p>
                )}
                <Button
                  onClick={sendCampaign}
                  disabled={!recipients.length || sendStatus !== 'idle' || isQuotaFull || (isEmailMode && emailQuota != null && recipients.length > emailQuota.remaining)}
                  size="lg"
                  className={cn(
                    'w-full h-12 rounded-2xl font-bold gap-2',
                    isQuotaFull && isEmailMode
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : sendStatus === 'sent'
                        ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                        : isWA
                          ? 'bg-[#25D366] hover:bg-[#20bb5a] text-white'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                  )}
                >
                  {sendStatus === 'sending' ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                  ) : sendStatus === 'sent' ? (
                    <><CheckCheck size={16} /> Sent to {recipients.length} recipients!</>
                  ) : isQuotaFull && isEmailMode ? (
                    <>🚫 Monthly limit reached</>
                  ) : (
                    <><Send size={16} /> {isWA ? `Send WhatsApp blast` : `Send email campaign`}{recipients.length > 0 ? ` → ${recipients.length}` : ''}</>
                  )}
                </Button>
              </>
            );
          })()}


        </div>
      </div>

      {/* ─── List Name Modal ─── */}
      <AnimatePresence>
        {showListNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowListNameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-foreground">Name your imported recipient list</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Provide a recognizable name for this contact list so you can reuse it later.</p>
              </div>

              <div className="space-y-2">
                <Input
                  value={listNameInput || ""}
                  onChange={(e) => setListNameInput?.(e.target.value)}
                  placeholder="e.g. my fav customer"
                  className="rounded-xl border-border/80 bg-muted/20 h-11 text-sm font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveImportedList?.()}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowListNameModal(false)}
                  className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveImportedList}
                  disabled={!(listNameInput || '').trim()}
                  className="rounded-xl px-6 h-10 text-xs font-bold"
                >
                  Save & Import
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRefineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowRefineModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-foreground">Refine Copy with AI ✨</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Tell the AI how to rewrite the text. The layout and image will remain unchanged.</p>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="e.g. Translate this into Spanish, or make it sound more urgent..."
                  className="rounded-xl border-border/80 bg-muted/20 h-24 text-sm font-semibold resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRefineModal(false)}
                  disabled={isRefining}
                  className="rounded-xl px-5 h-10 text-xs font-bold border-border/70"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRefine}
                  disabled={!refineInstruction.trim() || isRefining}
                  className="rounded-xl px-6 h-10 text-xs font-bold gap-2"
                >
                  {isRefining ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {isRefining ? 'Refining...' : 'Refine Copy'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
