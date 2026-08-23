import fs from 'fs';
let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');
content = content.replace(/setListNameInput\(e\.target\.value\)/g, 'setListNameInput?.(e.target.value)');
fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
console.log('Fixed');
