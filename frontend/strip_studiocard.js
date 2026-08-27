import fs from 'fs';

let content = fs.readFileSync('src/pages/dashboard/ContentStrategy.tsx', 'utf8');

const startStr = 'const StudioCard: React.FC<{ s: Studio; i: number; onPick: (id: Mode) => void; isLocked: boolean }> = ({ s, i, onPick, isLocked }) => {';
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  const endIndexStr = '// ── Main Component ────────────────────────────────────────────────────────────';
  const exportIndex = content.indexOf(endIndexStr, startIndex);
  if (exportIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(exportIndex);
    
    // Check if StudioCard is imported at the top
    let newContent = before + after;
    if (!newContent.includes('import { StudioCard }')) {
      newContent = newContent.replace("import WhatsAppTemplates from './WhatsAppTemplates';", "import WhatsAppTemplates from './WhatsAppTemplates';\nimport { StudioCard } from '../../components/content-strategy/StudioCard';");
    }
    
    fs.writeFileSync('src/pages/dashboard/ContentStrategy.tsx', newContent);
    console.log('Stripped StudioCard');
  } else {
    console.log('endIndexStr not found');
  }
} else {
  console.log('start index not found');
}
