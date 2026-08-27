import fs from 'fs';
let file, content;

// ProtectedRoute
file = 'src/components/ProtectedRoute.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/if \(!token\) \{/g, "if (!localStorage.getItem('syncsocio_profile')) {");
fs.writeFileSync(file, content);

// SessionTimeoutWarning
file = 'src/components/SessionTimeoutWarning.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/if \(!token\) return;/g, "return;");
content = content.replace(/credentials: 'include',\n\s*credentials: 'include',/g, "credentials: 'include',");
fs.writeFileSync(file, content);

// CampaignResults
file = 'src/components/content-strategy/CampaignResults.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/const token = localStorage\.getItem\(['"]token['"]\);?/g, "");
content = content.replace(/let token = localStorage\.getItem\(['"]token['"]\);?/g, "");
content = content.replace(/if \(!token\) \{[^{}]*\}|if \(!token\) return;/g, "");
content = content.replace(/headers: \{\s*['"]?Authorization['"]?:\s*`Bearer \$\{token\}`\s*\}/g, "headers: {}");
content = content.replace(/['"]?Authorization['"]?:\s*`Bearer \$\{token\}`/g, "");
content = content.replace(/fetch\((.*?), {\s*credentials: 'include',\s*credentials: 'include',/g, "fetch($1, { credentials: 'include',");
fs.writeFileSync(file, content);

// LandingPage
file = 'src/pages/LandingPage.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/if \(!token\) return;/g, "if (!localStorage.getItem('syncsocio_profile')) return;");
fs.writeFileSync(file, content);

// Setup
file = 'src/pages/Setup.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/if \(!token\) \{/g, "if (!localStorage.getItem('syncsocio_profile')) {");
fs.writeFileSync(file, content);

console.log('patched');
