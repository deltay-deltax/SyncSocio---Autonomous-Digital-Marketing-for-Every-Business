import fs from 'fs';
import path from 'path';

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
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // We are looking for err.message, mostly inside setError(err.message), alert(err.message), toast({ description: err.message })
  // We want to replace err.message with getFriendlyErrorMessage(err)
  // BUT we must be careful. We can just replace `err.message` with `getFriendlyErrorMessage(err)` IF we import it.
  
  if (content.includes('err.message') || content.includes('err?.message')) {
    // Regex to match err.message, err?.message, error.message
    // We'll replace err.message || 'Something went wrong' with getFriendlyErrorMessage(err)
    // Actually, since we're injecting getFriendlyErrorMessage, we can just replace:
    // `err.message || 'Something went wrong'` -> `getFriendlyErrorMessage(err)`
    // `err.message` -> `getFriendlyErrorMessage(err)`
    
    // Replace: err instanceof Error ? err.message : 'Fallback'
    content = content.replace(/err\s*instanceof\s*Error\s*\?\s*err\.message\s*:\s*['"`][^'"`]*['"`]/g, 'getFriendlyErrorMessage(err)');
    
    // Replace: err.message || 'Fallback'
    content = content.replace(/(err|error)(\?)?\.message\s*\|\|\s*['"`][^'"`]*['"`]/g, 'getFriendlyErrorMessage($1)');

    // Replace remaining err.message or error.message
    content = content.replace(/(err|error)(\?)?\.message/g, 'getFriendlyErrorMessage($1)');

    // We also need to add the import if it's not there
    if (content !== originalContent && !content.includes('getFriendlyErrorMessage')) {
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
}

console.log(`\nSuccessfully updated error messages in ${modifiedCount} files.`);
