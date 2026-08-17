import fs from 'fs';
import path from 'path';
import process from 'node:process';

const SRC_DIR = path.join(process.cwd(), 'src');

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findFiles(fullPath, files);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = findFiles(SRC_DIR);

let modifiedCount = 0;

for (const file of allFiles) {
  if (file.endsWith('errorHandler.ts') || file.endsWith('errorHandler.tsx')) {
    continue;
  }

  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // 1. Replace: err instanceof Error ? err.message : 'Fallback'
  content = content.replace(/err\s*instanceof\s*Error\s*\?\s*err\.message\s*:\s*['"`][^'"`]*['"`]/g, 'getFriendlyErrorMessage(err)');
  
  // 2. Replace: err.message || 'Fallback'
  content = content.replace(/(err|error)(\?)?\.message\s*\|\|\s*['"`][^'"`]*['"`]/g, 'getFriendlyErrorMessage($1)');

  // 3. Replace remaining err.message or error.message
  content = content.replace(/(err|error)(\?)?\.message/g, 'getFriendlyErrorMessage($1)');

  // 4. Check if the file uses getFriendlyErrorMessage but does not import it
  if (content.includes('getFriendlyErrorMessage') && !content.includes('errorHandler')) {
    // Find where to put the import: after the last import statement or at the top
    const importRegex = /^import\s+.*?;?\s*$/gm;
    let match;
    let lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastIndex = match.index + match[0].length;
    }
    
    const importStmt = `\nimport { getFriendlyErrorMessage } from '@/lib/errorHandler';\n`;
    if (lastIndex > 0) {
      content = content.slice(0, lastIndex) + importStmt + content.slice(lastIndex);
    } else {
      content = importStmt + content;
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    modifiedCount++;
    console.log(`Modified: ${file}`);
  }
}

console.log(`\nSuccessfully updated error messages and imports in ${modifiedCount} files.`);
