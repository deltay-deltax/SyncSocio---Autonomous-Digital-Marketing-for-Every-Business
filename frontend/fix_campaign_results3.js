import fs from 'fs';

let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');

const missingImports = `import { ArrowLeft, Heart, Phone, MoreHorizontal, ExternalLink, Smile, Paperclip, Mic, FileSpreadsheet } from 'lucide-react';
import { WHATSAPP_TEMPLATE_BODIES, WHATSAPP_BUTTON_LABELS } from '../../lib/campaignConstants';`;

if (!content.includes('import { ArrowLeft')) {
  content = content.replace("import { COUNTRY_CODES } from '../../lib/campaignConstants';", "import { COUNTRY_CODES } from '../../lib/campaignConstants';\n" + missingImports);
}

// Just globally replace _rawJson30 and _rawJson29 to avoid naming collisions since it was copied from a file where they already existed and were unique, but now we have multiple in the same block possibly.
// Wait, the error is:
// src/components/content-strategy/CampaignResults.tsx(78,17): error TS2451: Cannot redeclare block-scoped variable '_rawJson30'.
// Let's replace _rawJson30 in lines 75 to 85 with _rawJson30a, and 120-125 with _rawJson29a.
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (i > 70 && i < 110) {
        lines[i] = lines[i].replace(/_rawJson30/g, '_rawJson30a');
    }
    if (i >= 110 && i < 150) {
        lines[i] = lines[i].replace(/_rawJson29/g, '_rawJson29a');
    }
}
content = lines.join('\n');


if (!content.includes('const AI_BASE =')) {
  content = content.replace("const NODE_BASE =", "const AI_BASE = import.meta.env.VITE_AI_URL || import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';\nconst NODE_BASE =");
}

fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
console.log('Fixed CampaignResults');
