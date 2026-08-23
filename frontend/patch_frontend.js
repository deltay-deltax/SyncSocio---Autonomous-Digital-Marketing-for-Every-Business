import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walkSync = function(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'OOM' || err.name === 'TypeError') throw err;
    }
  });
  return filelist;
};

const srcDir = path.join(__dirname, 'src');
const files = walkSync(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  content = content.replace(/localStorage\.setItem\(['"]token['"],.*?\);?/g, '');
  content = content.replace(/localStorage\.removeItem\(['"]token['"]\);?/g, '');
  content = content.replace(/!!localStorage\.getItem\(['"]token['"]\)/g, "!!localStorage.getItem('syncsocio_profile')");

  // Remove Authorization headers lines completely to avoid trailing commas issue
  content = content.replace(/['"]?Authorization['"]?:\s*`Bearer[^`]+`\s*,?/g, '');
  
  // Remove `const token = ...`
  content = content.replace(/const\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);?/g, '');
  content = content.replace(/let\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);?/g, '');
  
  // Add credentials to fetch
  content = content.replace(/fetch\((.*?),\s*\{/g, "fetch($1, { credentials: 'include',");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
  }
});

console.log('Frontend patched.');
