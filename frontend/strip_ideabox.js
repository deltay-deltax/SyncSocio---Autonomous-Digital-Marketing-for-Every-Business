import fs from 'fs';

let content = fs.readFileSync('src/pages/dashboard/ContentStrategy.tsx', 'utf8');

const startStr = 'const IdeaBox = ({';
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  const endIndexStr = 'const LanguagePicker = ({';
  const exportIndex = content.indexOf(endIndexStr, startIndex);
  if (exportIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(exportIndex);
    
    // Check if IdeaBox is imported at the top
    let newContent = before + after;
    if (!newContent.includes('import { IdeaBox }')) {
      newContent = newContent.replace("import WhatsAppTemplates from './WhatsAppTemplates';", "import WhatsAppTemplates from './WhatsAppTemplates';\nimport { IdeaBox } from '../../components/content-strategy/IdeaBox';");
    }
    
    fs.writeFileSync('src/pages/dashboard/ContentStrategy.tsx', newContent);
    console.log('Stripped IdeaBox');
  } else {
    console.log('endIndexStr not found');
  }
} else {
  console.log('start index not found');
}
