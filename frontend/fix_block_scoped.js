import fs from 'fs';

let content = fs.readFileSync('src/components/content-strategy/CampaignResults.tsx', 'utf8');

// Replace ALL _rawJson declarations with unique names safely
let counter = 1000;
content = content.replace(/const _rawJson[a-zA-Z0-9_]*/g, () => \`const _rawJson\${counter++}\`);

fs.writeFileSync('src/components/content-strategy/CampaignResults.tsx', content);
console.log('Fixed block scoped issues');
