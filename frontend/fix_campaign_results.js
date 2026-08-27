import fs from 'fs';

let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');

const importsToAdd = `
import { ChevronDown, CheckCheck, Send, X, RefreshCw, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
`;

if (!content.includes('import { ChevronDown')) {
  content = content.replace("import React from 'react';", "import React from 'react';\n" + importsToAdd);
}

fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
console.log('Fixed CampaignResults');
