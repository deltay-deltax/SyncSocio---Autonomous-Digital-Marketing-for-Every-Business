import fs from 'fs';

let csContent = fs.readFileSync('src/pages/dashboard/ContentStrategy.tsx', 'utf8');
if (!csContent.includes('import { WHATSAPP_TEMPLATE_BODIES')) {
  csContent = csContent.replace("import WhatsAppTemplates from './WhatsAppTemplates';", "import WhatsAppTemplates from './WhatsAppTemplates';\nimport { WHATSAPP_TEMPLATE_BODIES, TEMPLATE_DISPLAY_NAMES, WHATSAPP_BUTTON_LABELS } from '../../lib/campaignConstants';");
  fs.writeFileSync('src/pages/dashboard/ContentStrategy.tsx', csContent);
}

let crContent = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');
if (!crContent.includes('import { COUNTRY_CODES }')) {
  crContent = crContent.replace("import React from 'react';", "import React from 'react';\nimport { COUNTRY_CODES } from '../../lib/campaignConstants';");
  fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', crContent);
}

console.log('Fixed constants');
