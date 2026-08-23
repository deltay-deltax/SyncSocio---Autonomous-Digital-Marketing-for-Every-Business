import fs from 'fs';

let content = fs.readFileSync('src/pages/dashboard/ContentStrategy.tsx', 'utf8');

const startIndex = content.indexOf('// ─────────────────────────────────────────────────────────────────────────────\n// Campaign Results (WhatsApp / Email)');
if (startIndex !== -1) {
  const exportIndex = content.lastIndexOf('export default DashboardStrategy;');
  if (exportIndex !== -1 && exportIndex > startIndex) {
    const before = content.substring(0, startIndex);
    const after = content.substring(exportIndex);
    
    // Check if CampaignResults is imported at the top
    let newContent = before + '\n' + after;
    if (!newContent.includes('import { CampaignResults }') && !newContent.includes('import CampaignResults')) {
      newContent = newContent.replace("import WhatsAppTemplates from './WhatsAppTemplates';", "import WhatsAppTemplates from './WhatsAppTemplates';\nimport CampaignResults from '../../components/content-strategy/CampaignResults';");
    }
    
    fs.writeFileSync('src/pages/dashboard/ContentStrategy.tsx', newContent);
    console.log('Stripped CampaignResults');
  } else {
    console.log('export not found');
  }
} else {
  console.log('start index not found');
}
