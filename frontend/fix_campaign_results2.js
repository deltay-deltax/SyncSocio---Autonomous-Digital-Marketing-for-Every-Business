import fs from 'fs';

let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');

const imports = `import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCheck, Send, X, RefreshCw, Wand2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { COUNTRY_CODES } from '../../lib/campaignConstants';

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

`;

if (!content.includes('import React')) {
  content = imports + content;
  fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
  console.log('Added imports');
}
