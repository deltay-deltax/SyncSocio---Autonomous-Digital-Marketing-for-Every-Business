import fs from 'fs';

let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');

content = content.replace(/savedLists\.length/g, '(savedLists || []).length');
content = content.replace(/savedLists\.map/g, '(savedLists || []).map');
content = content.replace(/savedLists\.find/g, '(savedLists || []).find');
content = content.replace(/handleSaveImportedList\(\)/g, 'handleSaveImportedList?.()');
content = content.replace(/value={listNameInput}/g, 'value={listNameInput || ""}');

fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
console.log('Fixed undefined');
